using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Hubs;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BarAvenida.API.Services;

/// <summary>
/// PROMPT C.2 — BackgroundService que cada minuto inspecciona el estado del turno
/// activo y emite alertas via SignalR al grupo "Admin" cuando detecta:
///   - Efectivo en cajón sobre el umbral configurable
///   - Tiempo desde último Corte X sobre el umbral configurable
///
/// Las alertas se desduplican por "key estable" (un solo evento por situación
/// hasta que la condición desaparece). El diccionario interno se limpia cuando
/// no hay turno activo.
/// </summary>
public class DetectorAlertasCaja : BackgroundService
{
    private readonly IServiceProvider     _sp;
    private readonly IHubContext<BarHub>  _hub;
    private readonly UmbralesSettings     _umbrales;
    private readonly ILogger<DetectorAlertasCaja> _log;
    private readonly TimeSpan             _intervalo = TimeSpan.FromMinutes(1);
    private readonly Dictionary<string, string> _alertasEmitidas = new(); // key → alertaId

    public DetectorAlertasCaja(
        IServiceProvider sp,
        IHubContext<BarHub> hub,
        IOptions<CajaSettings> opts,
        ILogger<DetectorAlertasCaja> log)
    {
        _sp       = sp;
        _hub      = hub;
        _umbrales = opts.Value.Umbrales;
        _log      = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Esperar 10s al arranque para no competir con la migración inicial
        try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DetectarAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "[DetectorAlertasCaja] Error en ciclo de detección");
            }

            try { await Task.Delay(_intervalo, stoppingToken); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task DetectarAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();

        // PROMPT H — Mesas inactivas (corre siempre, no requiere turno de caja activo)
        await EvaluarMesasInactivas(db, ct);

        // Las demás reglas requieren turno activo
        var turno = await db.CajaTurnos
            .Where(t => t.Estado == "Abierto")
            .OrderByDescending(t => t.FechaApertura)
            .FirstOrDefaultAsync(ct);

        if (turno == null)
        {
            // Sin turno activo: olvidar todo lo emitido
            _alertasEmitidas.Clear();
            return;
        }

        // ── Efectivo en cajón ─────────────────────────────────────────────────
        // Sumar pagos en efectivo de cuentas cobradas durante este turno.
        // Solo cuentas cobradas DESPUÉS de la apertura del turno actual.
        var cuentasCobradas = await db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre  != null
                     && c.FechaCierre  >= turno.FechaApertura
                     && (c.MetodoPago == "Efectivo" || c.MetodoPago == "Mixto"))
            .Select(c => new { c.MetodoPago, c.Total, c.MontoEfectivo })
            .ToListAsync(ct);

        decimal ventasEfectivo = 0;
        foreach (var c in cuentasCobradas)
        {
            ventasEfectivo += c.MetodoPago == "Mixto"
                ? (c.MontoEfectivo ?? 0)
                : c.Total;
        }

        var retiros = await db.RetirosCaja
            .Where(r => r.TurnoId == turno.Id)
            .SumAsync(r => (decimal?)r.Monto, ct) ?? 0;

        var efectivoEnCajon = turno.MontoInicial + ventasEfectivo - retiros;

        await EvaluarEfectivoExcesivo(turno.Id, efectivoEnCajon);
        await EvaluarTiempoSinCorteX(db, turno, ct);
    }

    private async Task EvaluarEfectivoExcesivo(int turnoId, decimal efectivoEnCajon)
    {
        var key = $"efectivo-{turnoId}";

        if (efectivoEnCajon > _umbrales.CajonMaximoEfectivo)
        {
            if (!_alertasEmitidas.ContainsKey(key))
            {
                var alerta = new AlertaCajaDto
                {
                    Tipo            = "EfectivoExcesivo",
                    Severidad       = "Amarilla",
                    Mensaje         = $"Cajón con ${efectivoEnCajon:N0} en efectivo. " +
                                      $"Umbral: ${_umbrales.CajonMaximoEfectivo:N0}.",
                    AccionSugerida  = "Hacer retiro",
                    AccionScreen    = "caja-retiros",
                };
                await EmitirAlerta(alerta);
                _alertasEmitidas[key] = alerta.Id;
            }
        }
        else
        {
            // La condición ya no aplica → permitir que vuelva a emitir si reaparece
            _alertasEmitidas.Remove(key);
        }
    }

    private async Task EvaluarTiempoSinCorteX(
        BarAvenidaDbContext db, Models.CajaTurno turno, CancellationToken ct)
    {
        var key = $"corte-{turno.Id}";

        // Último corte X del turno actual (si no hay, usar la apertura del turno)
        var ultimoCorteX = await db.CortesCaja
            .Where(c => c.TurnoId == turno.Id && c.Tipo == "X")
            .OrderByDescending(c => c.FechaApertura)
            .Select(c => (DateTime?)c.FechaApertura)
            .FirstOrDefaultAsync(ct);

        var referencia = ultimoCorteX ?? turno.FechaApertura;
        var horas      = (DateTime.Now - referencia).TotalHours;

        if (horas > _umbrales.HorasSinCorteX)
        {
            if (!_alertasEmitidas.ContainsKey(key))
            {
                var alerta = new AlertaCajaDto
                {
                    Tipo            = "TiempoSinCorteX",
                    Severidad       = "Amarilla",
                    Mensaje         = $"{(int)horas}h sin Corte X. " +
                                      $"Recomendado cada {_umbrales.HorasSinCorteX}h.",
                    AccionSugerida  = "Iniciar corte X",
                    AccionScreen    = "caja-corte-x",
                };
                await EmitirAlerta(alerta);
                _alertasEmitidas[key] = alerta.Id;
            }
        }
        else
        {
            _alertasEmitidas.Remove(key);
        }
    }

    // ── PROMPT H — Anti-fuga ─────────────────────────────────────────────────
    private async Task EvaluarMesasInactivas(BarAvenidaDbContext db, CancellationToken ct)
    {
        var ahora    = DateTime.Now;
        var umbral   = _umbrales.MinutosSinActividadMesa;
        var corteRef = ahora.AddMinutes(-umbral);

        var cuentas = await db.Cuentas
            .Where(c => c.Estado == "Abierta")
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
            .ToListAsync(ct);

        var mesasActualmenteInactivas = new HashSet<int>();

        foreach (var c in cuentas)
        {
            var ultimaActividad = c.Ordenes.Any()
                ? c.Ordenes.Max(o => o.FechaEnvio)
                : c.FechaApertura;

            if (ultimaActividad > corteRef) continue; // dentro de tolerancia

            var minutos = (int)(ahora - ultimaActividad).TotalMinutes;
            var key     = $"mesa-inactiva-{c.Id}";
            mesasActualmenteInactivas.Add(c.Id);

            if (_alertasEmitidas.ContainsKey(key)) continue; // ya emitida

            var alerta = new AlertaCajaDto
            {
                Tipo           = "MesaInactiva",
                Severidad      = "Amarilla",
                Mensaje        = $"Mesa {c.Mesa?.Numero ?? c.MesaId.ToString()} ({c.Mesera?.Nombre ?? "?"}) " +
                                 $"lleva {minutos} min sin actividad. Total: ${c.Total:N0}.",
                AccionSugerida = "Ver mesas",
                AccionScreen   = "dashboard",
            };
            await EmitirAlerta(alerta);
            _alertasEmitidas[key] = alerta.Id;
        }

        // Limpiar keys de mesas que ya no están inactivas
        var keysObsoletas = _alertasEmitidas.Keys
            .Where(k => k.StartsWith("mesa-inactiva-"))
            .Where(k => {
                var idStr = k.Replace("mesa-inactiva-", "");
                return int.TryParse(idStr, out var id) && !mesasActualmenteInactivas.Contains(id);
            })
            .ToList();

        foreach (var k in keysObsoletas) _alertasEmitidas.Remove(k);
    }

    private Task EmitirAlerta(AlertaCajaDto alerta)
    {
        _log.LogInformation("[DetectorAlertasCaja] {Tipo} {Severidad}: {Mensaje}",
            alerta.Tipo, alerta.Severidad, alerta.Mensaje);
        return _hub.Clients.Group("Admin").SendAsync("AlertaCaja", alerta);
    }
}
