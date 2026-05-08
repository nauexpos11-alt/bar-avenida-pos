using System.Net.Sockets;
using System.Runtime.InteropServices;
using BarAvenida.API.Data;
using BarAvenida.API.Models;

namespace BarAvenida.API.Services;

public class EscPosService
{
    private readonly IServiceScopeFactory    _scopeFactory;
    private readonly ITicketSimuladoService  _simulado;
    private readonly ILogger<EscPosService>  _logger;

    public EscPosService(
        IServiceScopeFactory   scopeFactory,
        ITicketSimuladoService simulado,
        ILogger<EscPosService> logger)
    {
        _scopeFactory = scopeFactory;
        _simulado     = simulado;
        _logger       = logger;
    }

    // ── Public async API ─────────────────────────────────────────────────────

    public async Task<bool> ImprimirTicketAsync(TicketGenerado ticket)
    {
        var cfg = await LeerConfigAsync();
        if (cfg is null)
        {
            _logger.LogWarning("EscPosService: no se encontró ConfiguracionTicket (Id=1)");
            return false;
        }

        if (!cfg.ImpresionHabilitada)
        {
            await _simulado.GenerarArchivosAsync(ticket.TextoPlano, ticket.Folio);
            return true;
        }

        bool ok = cfg.TipoConexion.Equals("Red", StringComparison.OrdinalIgnoreCase)
            ? ImprimirRed(ticket.EscPosBytes, cfg.IpImpresora ?? "", cfg.PuertoImpresora)
            : ImprimirUsb(ticket.EscPosBytes, cfg.NombreImpresoraUsb ?? "");

        if (!ok)
            _logger.LogWarning(
                "EscPosService: fallo al imprimir ticket #{Folio} ({Tipo})",
                ticket.Folio, cfg.TipoConexion);

        return ok;
    }

    public async Task<bool> AbrirCajonAsync(string usuario, string motivo)
    {
        var cfg = await LeerConfigAsync();
        if (cfg is null) return false;

        if (!cfg.ImpresionHabilitada)
        {
            await _simulado.RegistrarAperturaCajonAsync(usuario, motivo);
            return true;
        }

        // ESC p 0 25 250 — pulso al pin 2
        var cmd = new byte[] { 0x1B, 0x70, 0x00, 25, 250 };
        bool ok = cfg.TipoConexion.Equals("Red", StringComparison.OrdinalIgnoreCase)
            ? ImprimirRed(cmd, cfg.IpImpresora ?? "", cfg.PuertoImpresora)
            : ImprimirUsb(cmd, cfg.NombreImpresoraUsb ?? "");

        if (!ok)
            _logger.LogWarning("EscPosService: fallo al abrir cajón ({Tipo})", cfg.TipoConexion);

        return ok;
    }

    // ── Helpers privados de config ────────────────────────────────────────────

    private async Task<ConfiguracionTicket?> LeerConfigAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();
        return await db.ConfiguracionesTicket.FindAsync(1);
    }

    // ── Win32 P/Invoke ───────────────────────────────────────────────────────

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFO pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private struct DOCINFO
    {
        [MarshalAs(UnmanagedType.LPTStr)] public string  pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string? pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string  pDataType;
    }

    private static bool ImprimirUsb(byte[] datos, string nombreImpresora)
    {
        if (string.IsNullOrWhiteSpace(nombreImpresora)) return false;
        if (!OpenPrinter(nombreImpresora, out var hPrinter, IntPtr.Zero)) return false;

        try
        {
            var docInfo = new DOCINFO
            {
                pDocName    = "BarAvenida",
                pOutputFile = null,
                pDataType   = "RAW"
            };

            if (!StartDocPrinter(hPrinter, 1, ref docInfo)) return false;
            if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); return false; }

            bool ok = WritePrinter(hPrinter, datos, datos.Length, out _);

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            return ok;
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }

    private static bool ImprimirRed(byte[] datos, string ip, int puerto)
    {
        if (string.IsNullOrWhiteSpace(ip)) return false;
        try
        {
            using var client = new TcpClient();
            client.Connect(ip, puerto);
            using var stream = client.GetStream();
            stream.Write(datos, 0, datos.Length);
            stream.Flush();
            return true;
        }
        catch { return false; }
    }
}
