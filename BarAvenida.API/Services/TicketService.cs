using System.Text;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;

namespace BarAvenida.API.Services;

public class TicketService
{
    // ── Ticket de corte X/Z ──────────────────────────────────────────────────

    public TicketGenerado GenerarTicketCorte(CorteDto corte, ConfiguracionTicket cfg)
    {
        string texto = ConstruirTextoCorte(corte, cfg).Replace("\r\n", "\n");
        string folio = $"corte-{corte.Tipo?.ToUpper() ?? "Z"}-{corte.TurnoId}";

        return new TicketGenerado
        {
            TextoPlano  = texto,
            EscPosBytes = TextoAEscPos(texto),
            Folio       = folio,
        };
    }

    private static string ConstruirTextoCorte(CorteDto c, ConfiguracionTicket cfg)
    {
        int w  = cfg.AnchoTicket;
        var sb = new StringBuilder();
        int lw = Math.Max(w - 14, 8);

        sb.AppendLine(Centrar(cfg.NombreNegocio.ToUpper(), w));
        if (!string.IsNullOrWhiteSpace(cfg.Direccion))
            sb.AppendLine(Centrar(cfg.Direccion!, w));
        if (!string.IsNullOrWhiteSpace(cfg.Telefono))
            sb.AppendLine(Centrar("Tel: " + cfg.Telefono, w));
        sb.AppendLine(Linea(w));
        sb.AppendLine(Centrar($"CORTE DE CAJA {c.Tipo?.ToUpper()}", w));
        sb.AppendLine(Linea(w));
        sb.AppendLine($"Turno:    #{c.TurnoId}");
        sb.AppendLine($"Fecha:    {c.Fecha:dd/MM/yyyy HH:mm}");
        sb.AppendLine($"Cajero:   {c.UsuarioNombre}");
        sb.AppendLine($"Cuentas:  {c.CuentasCobradas}");
        sb.AppendLine(Linea(w));
        sb.AppendLine("Fondo inicial:".PadRight(lw)      + $"${c.MontoInicial,10:N2}");
        sb.AppendLine("Ventas efectivo:".PadRight(lw)    + $"${c.TotalEfectivo,9:N2}");
        sb.AppendLine("Ventas tarjeta:".PadRight(lw)     + $"${c.TotalTarjeta,9:N2}");
        if (c.TotalComision > 0)
            sb.AppendLine("Comisiones tarjeta:".PadRight(lw) + $"${c.TotalComision,9:N2}");
        sb.AppendLine("Total ventas:".PadRight(lw)       + $"${c.TotalVentas,9:N2}");
        sb.AppendLine(Linea(w));
        sb.AppendLine("Retiros del turno:".PadRight(lw)  + $"${c.TotalRetiros,9:N2}");
        sb.AppendLine(Centrar($"EFECTIVO ESPERADO: ${c.EfectivoEnCaja:N2}", w));
        if (c.EfectivoContado.HasValue)
        {
            sb.AppendLine("Efectivo contado:".PadRight(lw) + $"${c.EfectivoContado.Value,9:N2}");
            decimal dif     = c.Diferencia ?? (c.EfectivoContado.Value - c.EfectivoEnCaja);
            string  signo   = dif >= 0 ? "+" : "";
            sb.AppendLine("DIFERENCIA:".PadRight(lw)        + $"{signo}${dif,9:N2}");
        }
        sb.AppendLine(Linea(w));
        if (!string.IsNullOrWhiteSpace(c.Notas))
            sb.AppendLine($"Notas: {c.Notas}");
        if (!string.IsNullOrWhiteSpace(cfg.MensajePie))
            sb.AppendLine(Centrar(cfg.MensajePie!, w));

        return sb.ToString();
    }

    // ── Ticket de cuenta cobrada ─────────────────────────────────────────────

    public TicketGenerado GenerarTicket(Cuenta cuenta, ConfiguracionTicket cfg)
    {
        string texto = ConstruirTextoTicket(cuenta, cfg).Replace("\r\n", "\n");
        string folio = cuenta.Folio.ToString("D4");

        return new TicketGenerado
        {
            TextoPlano  = texto,
            EscPosBytes = TextoAEscPos(texto),
            Folio       = folio,
        };
    }

    // ── Ticket de barra (por orden enviada) ─────────────────────────────────

    public TicketGenerado GenerarTicketOrden(OrdenDto ordenDto, Cuenta cuenta, ConfiguracionTicket cfg)
    {
        int w  = cfg.AnchoTicket;
        var sb = new StringBuilder();

        sb.AppendLine(Centrar(cfg.NombreNegocio.ToUpper(), w));
        sb.AppendLine(Linea(w));

        string titulo = $"*** ORDEN #{ordenDto.NumeroOrden} ***";
        sb.AppendLine(Centrar(titulo, w));
        if (ordenDto.EsAgregado)
            sb.AppendLine(Centrar("(AGREGADO)", w));
        sb.AppendLine(Linea(w));

        string mesaInfo = !string.IsNullOrEmpty(cuenta.NombreCliente)
            ? cuenta.NombreCliente
            : (cuenta.Mesa != null ? $"Mesa {cuenta.Mesa.Numero}" : "BARRA");
        sb.AppendLine($"{mesaInfo} · {cuenta.Mesera?.Nombre ?? ""}");
        sb.AppendLine($"{ordenDto.FechaEnvio:dd/MMM/yyyy HH:mm}");
        sb.AppendLine(Linea(w));

        foreach (var det in ordenDto.Detalles)
            sb.AppendLine($"{det.Cantidad}x {Truncar(det.ProductoNombre, w - 4)}");

        sb.AppendLine(Linea(w));
        sb.AppendLine($"Folio cuenta: #{cuenta.Folio:D4}");
        sb.AppendLine();

        string texto = sb.ToString().Replace("\r\n", "\n");

        return new TicketGenerado
        {
            TextoPlano  = texto,
            EscPosBytes = TextoAEscPos(texto),
            Folio       = $"barra-ord{ordenDto.NumeroOrden}-c{cuenta.Folio:D4}",
        };
    }

    // ── Ticket de prueba ─────────────────────────────────────────────────────

    public TicketGenerado GenerarTicketPrueba(ConfiguracionTicket cfg)
    {
        int w  = cfg.AnchoTicket;
        var sb = new StringBuilder();

        sb.AppendLine(Centrar("** TICKET DE PRUEBA **", w));
        sb.AppendLine(Centrar(cfg.NombreNegocio.ToUpper(), w));
        sb.AppendLine(Linea(w));
        sb.AppendLine(Centrar($"Ancho: {w} chars", w));
        sb.AppendLine(Centrar(DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"), w));
        sb.AppendLine(Linea(w));
        sb.AppendLine(Centrar("** Impresora OK **", w));

        string texto = sb.ToString().Replace("\r\n", "\n");

        return new TicketGenerado
        {
            TextoPlano  = texto,
            EscPosBytes = TextoAEscPos(texto),
            Folio       = "prueba",
        };
    }

    // ── Construcción del texto legible ───────────────────────────────────────

    private static string ConstruirTextoTicket(Cuenta cuenta, ConfiguracionTicket cfg)
    {
        int w  = cfg.AnchoTicket;
        var sb = new StringBuilder();

        // Encabezado del negocio
        sb.AppendLine(Centrar(cfg.NombreNegocio.ToUpper(), w));
        if (!string.IsNullOrWhiteSpace(cfg.Direccion))
            sb.AppendLine(Centrar(cfg.Direccion!, w));
        if (!string.IsNullOrWhiteSpace(cfg.Telefono))
            sb.AppendLine(Centrar("Tel: " + cfg.Telefono, w));
        if (!string.IsNullOrWhiteSpace(cfg.Rfc))
            sb.AppendLine(Centrar("RFC: " + cfg.Rfc, w));

        sb.AppendLine(Linea(w));
        sb.AppendLine($"Folio:  #{cuenta.Folio:D4}");
        sb.AppendLine($"Mesa:   {cuenta.Mesa?.Numero ?? ""}");
        sb.AppendLine($"Mesera: {cuenta.Mesera?.Nombre ?? ""}");
        sb.AppendLine($"Fecha:  {(cuenta.FechaCierre ?? DateTime.Now):dd/MM/yyyy HH:mm}");
        if (!string.IsNullOrWhiteSpace(cuenta.NombreCliente))
            sb.AppendLine($"Cliente:{cuenta.NombreCliente}");
        sb.AppendLine(Linea(w));

        // Columnas: PRODUCTO | CANT | PRECIO | IMPORTE
        int col1 = w - 22, col2 = 4, col3 = 9, col4 = 9;
        sb.AppendLine(
            "PRODUCTO".PadRight(col1) +
            "CANT".PadLeft(col2) +
            "PRECIO".PadLeft(col3) +
            "IMPORTE".PadLeft(col4));

        foreach (var orden in cuenta.Ordenes.OrderBy(o => o.FechaEnvio))
        {
            foreach (var det in orden.Detalles)
            {
                string nombre = Truncar(det.Producto?.Nombre ?? "", col1);
                sb.AppendLine(
                    nombre.PadRight(col1) +
                    det.Cantidad.ToString().PadLeft(col2) +
                    det.PrecioUnitario.ToString("N2").PadLeft(col3) +
                    det.Subtotal.ToString("N2").PadLeft(col4));
            }
        }

        sb.AppendLine(Linea(w));

        // Totales — comisión NO se imprime en ticket al cliente (uso interno)
        sb.AppendLine(($"Subtotal:  ${cuenta.Subtotal,9:N2}").PadLeft(w));
        if (cuenta.Descuento > 0)
            sb.AppendLine(($"Descuento: ${cuenta.Descuento,9:N2}").PadLeft(w));

        string totalLine = $"*** TOTAL: ${cuenta.Total:N2} MXN ***";
        sb.AppendLine(Centrar(totalLine, w));
        sb.AppendLine(Linea(w));

        // Pago
        sb.AppendLine($"Pago: {cuenta.MetodoPago}");
        if (cuenta.MontoEfectivo.HasValue && cuenta.MontoEfectivo > 0)
            sb.AppendLine($"  Efectivo:  ${cuenta.MontoEfectivo.Value,9:N2}");
        if (cuenta.MontoTarjeta.HasValue && cuenta.MontoTarjeta > 0)
            sb.AppendLine($"  Tarjeta:   ${cuenta.MontoTarjeta.Value,9:N2}");
        if (cuenta.Cambio > 0)
            sb.AppendLine($"  Cambio:    ${cuenta.Cambio,9:N2}");
        if (!string.IsNullOrWhiteSpace(cuenta.RfcCliente))
            sb.AppendLine($"RFC:    {cuenta.RfcCliente}");
        if (!string.IsNullOrWhiteSpace(cuenta.RazonSocialCliente))
            sb.AppendLine($"Razon:  {cuenta.RazonSocialCliente}");

        sb.AppendLine();
        sb.AppendLine($"Son: {NumeroALetras(cuenta.Total)}");
        sb.AppendLine(Linea(w));

        if (!string.IsNullOrWhiteSpace(cfg.MensajePie))
            sb.AppendLine(Centrar(cfg.MensajePie!, w));
        sb.AppendLine(Centrar("GRACIAS POR SU PREFERENCIA", w));

        return sb.ToString();
    }

    // ── Conversión texto → ESC/POS ───────────────────────────────────────────

    private static byte[] TextoAEscPos(string texto)
    {
        var init = new byte[] { 0x1B, 0x40 };           // ESC @ — init
        var cut  = new byte[] { 0x1D, 0x56, 0x41, 0x05 }; // GS V A 5 — full cut
        var body = Encoding.GetEncoding(850).GetBytes(texto);

        var result = new byte[init.Length + body.Length + cut.Length];
        Buffer.BlockCopy(init, 0, result, 0, init.Length);
        Buffer.BlockCopy(body, 0, result, init.Length, body.Length);
        Buffer.BlockCopy(cut,  0, result, init.Length + body.Length, cut.Length);
        return result;
    }

    // ── Helpers de formato ───────────────────────────────────────────────────

    private static string Centrar(string s, int w)
    {
        int pad = Math.Max(0, (w - s.Length) / 2);
        return new string(' ', pad) + s;
    }

    private static string Linea(int w) => new string('-', w);

    private static string Truncar(string s, int max) =>
        s.Length <= max ? s : s[..max];

    // ── NumeroALetras ────────────────────────────────────────────────────────

    public static string NumeroALetras(decimal numero)
    {
        int pesos    = (int)numero;
        int centavos = (int)Math.Round((numero - pesos) * 100);
        return $"{EnteroALetras(pesos)} {centavos:D2}/100 M.N.";
    }

    private static readonly string[] _uni =
    [
        "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
        "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS",
        "DIECISIETE", "DIECIOCHO", "DIECINUEVE"
    ];

    private static readonly string[] _dec =
    [
        "", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
        "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"
    ];

    private static readonly string[] _cen =
    [
        "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
        "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"
    ];

    private static string EnteroALetras(int n)
    {
        if (n == 0)   return "CERO";
        if (n < 0)    return "MENOS " + EnteroALetras(-n);
        if (n < 20)   return _uni[n];
        if (n < 30)   return n == 21 ? "VEINTIUN" : "VEINTI" + _uni[n - 20].ToLower();
        if (n < 100)  return _dec[n / 10] + (n % 10 > 0 ? " Y " + _uni[n % 10] : "");
        if (n == 100) return "CIEN";
        if (n < 1000) return _cen[n / 100] + (n % 100 > 0 ? " " + EnteroALetras(n % 100) : "");
        if (n == 1000)    return "MIL";
        if (n < 2000)     return "MIL " + EnteroALetras(n % 1000);
        if (n < 1_000_000)
            return EnteroALetras(n / 1000) + " MIL" +
                   (n % 1000 > 0 ? " " + EnteroALetras(n % 1000) : "");
        return n.ToString();
    }
}
