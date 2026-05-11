using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarAvenida.API.Data;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/sistema")]
public class SistemaController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;

    public SistemaController(BarAvenidaDbContext context)
    {
        _context = context;
    }

    [HttpGet("hora")]
    [AllowAnonymous]
    public IActionResult GetHora()
    {
        var ahora = DateTime.Now;
        return Ok(new
        {
            utc         = DateTime.UtcNow,
            local       = ahora,
            zonaHoraria = TimeZoneInfo.Local.Id,
            offsetUtc   = TimeZoneInfo.Local.GetUtcOffset(ahora).TotalMinutes
        });
    }

    /// <summary>
    /// Health check completo. Sirve para que Coronado verifique a distancia desde NAU
    /// el estado de la PC del bar sin necesidad de TeamViewer.
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> GetHealth()
    {
        var resultado = new Dictionary<string, object>
        {
            ["timestamp"] = DateTime.Now,
            ["version"]   = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "desconocida"
        };

        // Probar BD
        try
        {
            var puede = await _context.Database.CanConnectAsync();
            resultado["bdConectada"] = puede;
            if (puede)
            {
                resultado["usuariosCount"] = await _context.Usuarios.CountAsync();
            }
        }
        catch (Exception ex)
        {
            resultado["bdConectada"] = false;
            resultado["bdError"]     = ex.Message;
        }

        var todoOk = (resultado["bdConectada"] as bool?) == true;
        return todoOk ? Ok(resultado) : StatusCode(503, resultado);
    }

    /// <summary>
    /// Devuelve la IP local real de la WiFi/Ethernet de la PC del bar.
    /// Filtra interfaces virtuales (WSL, Hyper-V, VMware) y APIPA.
    /// Usado por la pantalla "Conectar tablets" para generar el QR.
    /// </summary>
    [HttpGet("ip-real")]
    [AllowAnonymous]
    public IActionResult GetIpReal()
    {
        var puerto = 7000;
        var ipCandidatas = new List<string>();
        var ipPreferida = string.Empty;

        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                // Solo interfaces UP, fisicas (no virtuales)
                if (nic.OperationalStatus != OperationalStatus.Up) continue;

                var nombre = nic.Name.ToLowerInvariant();
                var descripcion = nic.Description.ToLowerInvariant();

                // Excluir loopback, WSL, Hyper-V, VMware, VirtualBox, TAP, etc.
                if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                if (nombre.Contains("vethernet") || nombre.Contains("wsl") || nombre.Contains("loopback")) continue;
                if (descripcion.Contains("virtual") || descripcion.Contains("vmware") ||
                    descripcion.Contains("hyper-v") || descripcion.Contains("virtualbox") ||
                    descripcion.Contains("tap-windows")) continue;

                var ipProps = nic.GetIPProperties();
                foreach (var addr in ipProps.UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue; // solo IPv4
                    var ip = addr.Address.ToString();

                    // Excluir APIPA (169.254.x.x)
                    if (ip.StartsWith("169.254.")) continue;
                    // Excluir loopback (127.x)
                    if (ip.StartsWith("127.")) continue;

                    ipCandidatas.Add(ip);

                    // Preferimos 192.168.x sobre 10.x sobre 172.x
                    if (string.IsNullOrEmpty(ipPreferida))
                    {
                        ipPreferida = ip;
                    }
                    else if (ip.StartsWith("192.168.") && !ipPreferida.StartsWith("192.168."))
                    {
                        ipPreferida = ip;
                    }
                }
            }
        }
        catch { /* fallback */ }

        if (string.IsNullOrEmpty(ipPreferida)) ipPreferida = "localhost";

        var urlTablet = $"http://{ipPreferida}:{puerto}/tablet/";
        var urlAdmin  = $"http://{ipPreferida}:{puerto}/admin/";
        var urlKds    = $"http://{ipPreferida}:{puerto}/kds";

        return Ok(new
        {
            ip            = ipPreferida,
            puerto        = puerto,
            urlTablet     = urlTablet,
            urlAdmin      = urlAdmin,
            urlKds        = urlKds,
            ipsCandidatas = ipCandidatas
        });
    }
}
