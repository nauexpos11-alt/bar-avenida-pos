using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;
using BarAvenida.API.Services;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/Caja")]
[Authorize(Roles = "Admin")]
public class CajaController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;
    private readonly ILogger<CajaController> _log;
    private readonly ITicketSimuladoService _simulado;
    private readonly TicketService _ticket;
    private readonly EscPosService _escPos;
    private readonly IAuditoriaService _audit;

    public CajaController(
        BarAvenidaDbContext db,
        ILogger<CajaController> log,
        ITicketSimuladoService simulado,
        TicketService ticket,
        EscPosService escPos,
        IAuditoriaService audit)
    {
        _db       = db;
        _log      = log;
        _simulado = simulado;
        _ticket   = ticket;
        _escPos   = escPos;
        _audit    = audit;
    }

    // ── GET /api/Caja/turno-actual ───────────────────────────────────────────
    [HttpGet("turno-actual")]
    public async Task<IActionResult> GetTurnoActual()
    {
        var turno = await _db.CajaTurnos
            .Include(t => t.UsuarioApertura)
            .Include(t => t.UsuarioCierre)
            .Where(t => t.Estado == "Abierto")
            .OrderByDescending(t => t.FechaApertura)
            .FirstOrDefaultAsync();

        return Ok(turno == null ? null : MapTurno(turno));
    }

    // ── GET /api/Caja/sugerencia-fondo ───────────────────────────────────────
    // PROMPT C.1 — Sugiere el monto inicial al abrir un turno con base en el
    // histórico reciente (mismo día de la semana por defecto).
    [HttpGet("sugerencia-fondo")]
    public async Task<IActionResult> GetSugerenciaFondo([FromServices] IOptions<CajaSettings> opts)
    {
        var cfg       = opts.Value.FondoSugerido;
        var hoy       = DateTime.Today;
        var desde     = hoy.AddDays(-cfg.DiasHistorial);
        var diaActual = hoy.DayOfWeek;

        // Trae turnos cerrados con fondo capturado dentro del rango
        var turnos = await _db.CajaTurnos
            .Where(t => t.FechaApertura >= desde
                     && t.Estado        == "Cerrado"
                     && t.MontoInicial   > 0m)
            .Select(t => new { t.FechaApertura, t.MontoInicial })
            .ToListAsync();

        // Si MismoDiaSemana = true, filtra al mismo día (filtro en memoria
        // porque EF no traduce DayOfWeek a SQL de forma confiable).
        if (cfg.MismoDiaSemana)
        {
            turnos = turnos
                .Where(t => t.FechaApertura.DayOfWeek == diaActual)
                .ToList();
        }

        if (turnos.Count == 0)
        {
            return Ok(new SugerenciaFondoDto
            {
                Recomendado      = 0,
                MinimoHistorico  = 0,
                MaximoHistorico  = 0,
                TurnosAnalizados = 0,
                Justificacion    = "Sin histórico suficiente. Define un monto manual.",
            });
        }

        var promedio   = turnos.Average(t => t.MontoInicial);
        var redondeado = Math.Round(promedio / 50m, MidpointRounding.AwayFromZero) * 50m;
        var minimo     = turnos.Min(t => t.MontoInicial);
        var maximo     = turnos.Max(t => t.MontoInicial);

        var nombreDia = diaActual switch
        {
            DayOfWeek.Sunday    => "domingos",
            DayOfWeek.Monday    => "lunes",
            DayOfWeek.Tuesday   => "martes",
            DayOfWeek.Wednesday => "miércoles",
            DayOfWeek.Thursday  => "jueves",
            DayOfWeek.Friday    => "viernes",
            DayOfWeek.Saturday  => "sábados",
            _                   => "días",
        };
        var contexto = cfg.MismoDiaSemana ? nombreDia : "días";

        return Ok(new SugerenciaFondoDto
        {
            Recomendado      = redondeado,
            MinimoHistorico  = minimo,
            MaximoHistorico  = maximo,
            TurnosAnalizados = turnos.Count,
            Justificacion    = $"Basado en {turnos.Count} {contexto} previos " +
                               $"(rango ${minimo:N0}–${maximo:N0}).",
        });
    }

    // ── POST /api/Caja/abrir-turno ───────────────────────────────────────────
    [HttpPost("abrir-turno")]
    public async Task<IActionResult> AbrirTurno([FromBody] AbrirTurnoDto dto)
    {
        var hayAbierto = await _db.CajaTurnos.AnyAsync(t => t.Estado == "Abierto");
        if (hayAbierto)
            return Conflict(new { mensaje = "Ya hay un turno abierto. Ciérralo antes de abrir uno nuevo." });

        var usuario = await ValidarPin(dto.Pin);
        if (usuario == null)
            return Unauthorized(new { mensaje = "PIN incorrecto." });

        var turno = new CajaTurno
        {
            FechaApertura     = DateTime.Now,
            UsuarioAperturaId = usuario.Id,
            MontoInicial      = dto.MontoInicial,
            Estado            = "Abierto",
            Notas             = dto.Notas?.Trim(),
        };
        _db.CajaTurnos.Add(turno);
        await _db.SaveChangesAsync();

        await _db.Entry(turno).Reference(t => t.UsuarioApertura).LoadAsync();
        _log.LogInformation("🔓 Turno #{Id} abierto por {Usuario}", turno.Id, usuario.Nombre);

        await _audit.LogAsync(
            "Caja",
            "TurnoAbierto",
            $"Turno #{turno.Id} abierto por {usuario.Nombre}. Fondo inicial ${turno.MontoInicial:N2}",
            usuario.Id, usuario.Nombre,
            $"{{\"turnoId\":{turno.Id},\"montoInicial\":{turno.MontoInicial}}}");

        return Ok(MapTurno(turno));
    }

    // ── POST /api/Caja/cerrar-turno ──────────────────────────────────────────
    // Cierra el turno Y guarda el Corte Z definitivo
    [HttpPost("cerrar-turno")]
    public async Task<IActionResult> CerrarTurno([FromBody] CerrarTurnoDto dto)
    {
        var turno = await _db.CajaTurnos
            .Include(t => t.UsuarioApertura)
            .FirstOrDefaultAsync(t => t.Id == dto.TurnoId && t.Estado == "Abierto");
        if (turno == null)
            return NotFound(new { mensaje = "Turno no encontrado o ya cerrado." });

        var usuario = await ValidarPin(dto.Pin);
        if (usuario == null)
            return Unauthorized(new { mensaje = "PIN incorrecto." });

        var cfg      = await _db.ConfiguracionesTicket.FirstAsync();
        var corteDto = await CalcularCorte(turno, "Z");

        // Aplicar efectivo contado y diferencia
        corteDto.EfectivoContado = dto.EfectivoContado;
        corteDto.Diferencia      = dto.EfectivoContado - corteDto.EfectivoEnCaja;
        corteDto.Notas           = dto.Notas?.Trim();

        // PROMPT C.3 — Severidad y validación de justificación
        var umbrales = HttpContext.RequestServices
            .GetRequiredService<IOptions<CajaSettings>>().Value.Umbrales;
        var absDif = Math.Abs(corteDto.Diferencia ?? 0);

        string severidad;
        if (absDif <= umbrales.DiferenciaVerde)         severidad = "Verde";
        else if (absDif <= umbrales.DiferenciaAmarilla) severidad = "Amarilla";
        else                                            severidad = "Roja";

        if (severidad == "Roja" &&
            (string.IsNullOrWhiteSpace(dto.Justificacion) || dto.Justificacion.Trim().Length < 10))
        {
            return BadRequest(new {
                mensaje    = "La diferencia rebasa el umbral; justificación obligatoria (mín 10 caracteres).",
                severidad,
                diferencia = corteDto.Diferencia,
            });
        }

        // Guardar Corte Z
        var corteBd = new CorteCaja
        {
            FechaApertura     = turno.FechaApertura,
            FechaCierre       = DateTime.Now,
            UsuarioAperturaId = turno.UsuarioAperturaId,
            UsuarioCierreId   = usuario.Id,
            MontoInicial      = turno.MontoInicial,
            TotalEfectivo     = corteDto.TotalEfectivo,
            TotalTarjeta      = corteDto.TotalTarjeta,
            TotalComision     = corteDto.TotalComision,
            TotalVentas       = corteDto.TotalVentas,
            TotalRetiros      = corteDto.TotalRetiros,
            EfectivoEnCaja    = corteDto.EfectivoEnCaja,
            EfectivoContado   = dto.EfectivoContado,
            Diferencia        = corteDto.Diferencia,
            CuentasCobradas   = corteDto.CuentasCobradas,
            Estado            = "Cerrado",
            Tipo              = "Z",
            TurnoId           = turno.Id,
            Notas             = dto.Notas?.Trim(),
        };
        _db.CortesCaja.Add(corteBd);

        // Cerrar turno
        turno.FechaCierre     = DateTime.Now;
        turno.UsuarioCierreId = usuario.Id;
        turno.MontoFinal      = dto.EfectivoContado;
        turno.Estado          = "Cerrado";

        await _db.SaveChangesAsync();
        corteDto.Id = corteBd.Id;

        // PROMPT C.3 — Crear IncidenteCaja si hay diferencia
        if (corteDto.Diferencia.HasValue && corteDto.Diferencia.Value != 0)
        {
            var incidente = new IncidenteCaja
            {
                TurnoId          = turno.Id,
                CorteId          = corteBd.Id,
                Tipo             = corteDto.Diferencia.Value > 0 ? "Sobrante" : "Faltante",
                Severidad        = severidad,
                Diferencia       = corteDto.Diferencia.Value,
                EfectivoEsperado = corteDto.EfectivoEnCaja,
                EfectivoContado  = dto.EfectivoContado,
                Justificacion    = string.IsNullOrWhiteSpace(dto.Justificacion)
                                      ? null
                                      : dto.Justificacion.Trim(),
                AutorizadoPorId  = usuario.Id,
                FechaRegistro    = DateTime.Now,
            };
            _db.IncidentesCaja.Add(incidente);
            await _db.SaveChangesAsync();
        }

        // Generar ticket e imprimir/simular
        var ticketGenerado = _ticket.GenerarTicketCorte(corteDto, cfg);
        await _escPos.ImprimirTicketAsync(ticketGenerado);

        if (!cfg.ImpresionHabilitada)
            corteDto.ModoSimulado = true;

        await _db.Entry(turno).Reference(t => t.UsuarioCierre).LoadAsync();
        _log.LogInformation("🔒 Turno #{Id} cerrado + Corte Z #{CorteId} por {Usuario}",
            turno.Id, corteBd.Id, usuario.Nombre);

        await _audit.LogAsync(
            "Caja",
            "TurnoCerrado",
            $"Turno #{turno.Id} cerrado por {usuario.Nombre}. Diferencia: {corteDto.Diferencia:+0.00;-0.00;0}",
            usuario.Id, usuario.Nombre,
            $"{{\"turnoId\":{turno.Id},\"corteId\":{corteBd.Id},\"diferencia\":{corteDto.Diferencia ?? 0},\"severidad\":\"{severidad}\"}}");

        return Ok(new { turno = MapTurno(turno), corte = corteDto });
    }

    // ── GET /api/Caja/corte-x ────────────────────────────────────────────────
    [HttpGet("corte-x")]
    public async Task<IActionResult> GetCorteX([FromQuery] int? turnoId)
    {
        CajaTurno? turno;
        if (turnoId.HasValue)
        {
            turno = await _db.CajaTurnos
                .Include(t => t.UsuarioApertura)
                .FirstOrDefaultAsync(t => t.Id == turnoId.Value);
        }
        else
        {
            turno = await _db.CajaTurnos
                .Include(t => t.UsuarioApertura)
                .Where(t => t.Estado == "Abierto")
                .OrderByDescending(t => t.FechaApertura)
                .FirstOrDefaultAsync();
        }

        if (turno == null)
            return NotFound(new { mensaje = "No hay turno abierto actualmente." });

        var corte = await CalcularCorte(turno, "X");
        return Ok(corte);
    }

    // ── POST /api/Caja/corte-z ───────────────────────────────────────────────
    // Guarda un Corte Z sin cerrar el turno (snapshot manual)
    [HttpPost("corte-z")]
    public async Task<IActionResult> PostCorteZ([FromBody] PostCorteZDto dto)
    {
        var turno = await _db.CajaTurnos
            .Include(t => t.UsuarioApertura)
            .FirstOrDefaultAsync(t => t.Id == dto.TurnoId && t.Estado == "Abierto");
        if (turno == null)
            return NotFound(new { mensaje = "Turno no encontrado o ya cerrado." });

        var usuario = await ValidarPin(dto.Pin);
        if (usuario == null)
            return Unauthorized(new { mensaje = "PIN incorrecto." });

        var cfg      = await _db.ConfiguracionesTicket.FirstAsync();
        var corteDto = await CalcularCorte(turno, "Z");

        if (dto.EfectivoContado.HasValue)
        {
            corteDto.EfectivoContado = dto.EfectivoContado;
            corteDto.Diferencia      = dto.EfectivoContado.Value - corteDto.EfectivoEnCaja;
        }
        corteDto.Notas = dto.Notas?.Trim();

        var corteBd = new CorteCaja
        {
            FechaApertura     = turno.FechaApertura,
            FechaCierre       = DateTime.Now,
            UsuarioAperturaId = turno.UsuarioAperturaId,
            UsuarioCierreId   = usuario.Id,
            MontoInicial      = turno.MontoInicial,
            TotalEfectivo     = corteDto.TotalEfectivo,
            TotalTarjeta      = corteDto.TotalTarjeta,
            TotalComision     = corteDto.TotalComision,
            TotalVentas       = corteDto.TotalVentas,
            TotalRetiros      = corteDto.TotalRetiros,
            EfectivoEnCaja    = corteDto.EfectivoEnCaja,
            EfectivoContado   = dto.EfectivoContado,
            Diferencia        = corteDto.Diferencia,
            CuentasCobradas   = corteDto.CuentasCobradas,
            Estado            = "Abierto",
            Tipo              = "Z",
            TurnoId           = turno.Id,
            Notas             = dto.Notas?.Trim(),
        };
        _db.CortesCaja.Add(corteBd);
        await _db.SaveChangesAsync();

        corteDto.Id = corteBd.Id;

        var ticketGenerado = _ticket.GenerarTicketCorte(corteDto, cfg);
        await _escPos.ImprimirTicketAsync(ticketGenerado);

        if (!cfg.ImpresionHabilitada)
            corteDto.ModoSimulado = true;

        _log.LogInformation("📊 Corte Z #{Id} (manual) por {Usuario}", corteBd.Id, usuario.Nombre);
        return Ok(corteDto);
    }

    // ── GET /api/Caja/cortes ─────────────────────────────────────────────────
    [HttpGet("cortes")]
    public async Task<IActionResult> GetCortes(
        [FromQuery] int?      turnoId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] string?   tipo)
    {
        var q = _db.CortesCaja
            .Include(c => c.UsuarioApertura)
            .AsQueryable();

        if (turnoId.HasValue)            q = q.Where(c => c.TurnoId == turnoId);
        if (desde.HasValue)              q = q.Where(c => c.FechaApertura >= desde);
        if (hasta.HasValue)              q = q.Where(c => c.FechaApertura <= hasta);
        if (!string.IsNullOrEmpty(tipo)) q = q.Where(c => c.Tipo == tipo.ToUpper());

        var cortes = await q
            .OrderByDescending(c => c.FechaApertura)
            .Take(200)
            .Select(c => new CorteDto
            {
                Id              = c.Id,
                Tipo            = c.Tipo,
                TurnoId         = c.TurnoId ?? 0,
                Fecha           = c.FechaApertura,
                UsuarioNombre   = c.UsuarioApertura != null ? c.UsuarioApertura.Nombre : "",
                MontoInicial    = c.MontoInicial,
                TotalEfectivo   = c.TotalEfectivo,
                TotalTarjeta    = c.TotalTarjeta,
                TotalComision   = c.TotalComision,
                TotalVentas     = c.TotalVentas,
                TotalRetiros    = c.TotalRetiros,
                EfectivoEnCaja  = c.EfectivoEnCaja,
                EfectivoContado = c.EfectivoContado,
                Diferencia      = c.Diferencia,
                CuentasCobradas = c.CuentasCobradas,
                Notas           = c.Notas,
                ModoSimulado    = false,
            })
            .ToListAsync();

        return Ok(cortes);
    }

    // ── POST /api/Caja/retiro ────────────────────────────────────────────────
    [HttpPost("retiro")]
    public async Task<IActionResult> PostRetiro([FromBody] RetiroCajaDto dto)
    {
        var turno = await _db.CajaTurnos
            .FirstOrDefaultAsync(t => t.Id == dto.TurnoId && t.Estado == "Abierto");
        if (turno == null)
            return NotFound(new { mensaje = "Turno no encontrado o ya cerrado." });

        if (dto.Monto <= 0)
            return BadRequest(new { mensaje = "El monto debe ser mayor a cero." });

        var usuario = await ValidarPin(dto.Pin);
        if (usuario == null)
            return Unauthorized(new { mensaje = "PIN incorrecto." });

        var retiro = new RetiroCaja
        {
            TurnoId  = dto.TurnoId,
            UsuarioId = usuario.Id,
            Fecha    = DateTime.Now,
            Monto    = dto.Monto,
            Concepto = dto.Concepto?.Trim(),
        };
        _db.RetirosCaja.Add(retiro);
        await _db.SaveChangesAsync();

        // Abrir cajón para que el cajero pueda sacar el efectivo
        await _escPos.AbrirCajonAsync(usuario.Nombre, dto.Concepto ?? "Retiro de caja");

        _log.LogInformation(
            "💸 Retiro ${Monto} por {Usuario} en turno #{Turno}",
            dto.Monto, usuario.Nombre, dto.TurnoId);

        await _audit.LogAsync(
            "Caja",
            "SalidaCaja",
            $"Retiro ${dto.Monto:N2} por {usuario.Nombre}. Concepto: {dto.Concepto ?? "(s/c)"}",
            usuario.Id, usuario.Nombre,
            $"{{\"turnoId\":{dto.TurnoId},\"monto\":{dto.Monto}}}");

        return Ok(new RetiroCajaItemDto
        {
            Id            = retiro.Id,
            Fecha         = retiro.Fecha,
            UsuarioNombre = usuario.Nombre,
            Monto         = retiro.Monto,
            Concepto      = retiro.Concepto,
        });
    }

    // ── GET /api/Caja/retiros/{turnoId} ──────────────────────────────────────
    [HttpGet("retiros/{turnoId:int}")]
    public async Task<IActionResult> GetRetiros(int turnoId)
    {
        var retiros = await _db.RetirosCaja
            .Include(r => r.Usuario)
            .Where(r => r.TurnoId == turnoId)
            .OrderBy(r => r.Fecha)
            .Select(r => new RetiroCajaItemDto
            {
                Id            = r.Id,
                Fecha         = r.Fecha,
                UsuarioNombre = r.Usuario != null ? r.Usuario.Nombre : "",
                Monto         = r.Monto,
                Concepto      = r.Concepto,
            })
            .ToListAsync();

        return Ok(retiros);
    }

    // ── POST /api/Caja/imprimir-corte/{id} ───────────────────────────────────
    [HttpPost("imprimir-corte/{id:int}")]
    public async Task<IActionResult> ImprimirCorte(int id)
    {
        var corte = await _db.CortesCaja
            .Include(c => c.UsuarioApertura)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (corte == null)
            return NotFound(new { mensaje = "Corte no encontrado." });

        var cfg = await _db.ConfiguracionesTicket.FirstAsync();

        var corteDto = new CorteDto
        {
            Id              = corte.Id,
            Tipo            = corte.Tipo,
            TurnoId         = corte.TurnoId ?? 0,
            Fecha           = corte.FechaApertura,
            UsuarioNombre   = corte.UsuarioApertura?.Nombre ?? "",
            MontoInicial    = corte.MontoInicial,
            TotalEfectivo   = corte.TotalEfectivo,
            TotalTarjeta    = corte.TotalTarjeta,
            TotalComision   = corte.TotalComision,
            TotalVentas     = corte.TotalVentas,
            TotalRetiros    = corte.TotalRetiros,
            EfectivoEnCaja  = corte.EfectivoEnCaja,
            EfectivoContado = corte.EfectivoContado,
            Diferencia      = corte.Diferencia,
            CuentasCobradas = corte.CuentasCobradas,
            Notas           = corte.Notas,
        };

        var ticketGenerado = _ticket.GenerarTicketCorte(corteDto, cfg);
        await _escPos.ImprimirTicketAsync(ticketGenerado);

        bool simulado = !cfg.ImpresionHabilitada;
        _log.LogInformation("🖨️ Corte #{Id} reimpreso ({Modo})", id, simulado ? "simulado" : "real");

        return Ok(new { mensaje = simulado ? "Archivos simulados regenerados." : "Corte enviado a impresora.", modoSimulado = simulado });
    }

    // ── GET /api/Caja/incidentes (PROMPT C.3) ────────────────────────────────
    [HttpGet("incidentes")]
    public async Task<IActionResult> GetIncidentes(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        if (page < 1)      page     = 1;
        if (pageSize < 1)  pageSize = 50;
        if (pageSize > 200) pageSize = 200;

        var q = _db.IncidentesCaja
            .Include(i => i.AutorizadoPor)
            .AsQueryable();

        if (desde.HasValue) q = q.Where(i => i.FechaRegistro >= desde.Value);
        if (hasta.HasValue) q = q.Where(i => i.FechaRegistro <= hasta.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(i => i.FechaRegistro)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new IncidenteResumenDto
            {
                Id                  = i.Id,
                TurnoId             = i.TurnoId,
                CorteId             = i.CorteId,
                Tipo                = i.Tipo,
                Severidad           = i.Severidad,
                Diferencia          = i.Diferencia,
                EfectivoEsperado    = i.EfectivoEsperado,
                EfectivoContado     = i.EfectivoContado,
                Justificacion       = i.Justificacion,
                AutorizadoPorNombre = i.AutorizadoPor != null ? i.AutorizadoPor.Nombre : null,
                FechaRegistro       = i.FechaRegistro,
            })
            .ToListAsync();

        return Ok(new IncidentesPaginadoDto
        {
            Total    = total,
            Page     = page,
            PageSize = pageSize,
            Items    = items,
        });
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    private async Task<Usuario?> ValidarPin(string pin)
    {
        var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
        if (!int.TryParse(idStr, out int userId)) return null;
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == userId && u.Activo);
        if (usuario == null) return null;
        return BCrypt.Net.BCrypt.Verify(pin, usuario.PinHash) ? usuario : null;
    }

    private async Task<CorteDto> CalcularCorte(CajaTurno turno, string tipo)
    {
        var cuentas = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre.HasValue
                     && c.FechaCierre >= turno.FechaApertura)
            .ToListAsync();

        decimal totalEfectivo = cuentas.Sum(c => c.MontoEfectivo   ?? 0);
        decimal totalTarjeta  = cuentas.Sum(c => c.MontoTarjeta    ?? 0);
        decimal totalComision = cuentas.Sum(c => c.ComisionTarjeta);
        decimal totalVentas   = cuentas.Sum(c => c.Subtotal);

        var retiros = await _db.RetirosCaja
            .Where(r => r.TurnoId == turno.Id)
            .ToListAsync();
        decimal totalRetiros = retiros.Sum(r => r.Monto);

        decimal efectivoEnCaja = turno.MontoInicial + totalEfectivo - totalRetiros;

        return new CorteDto
        {
            Tipo            = tipo,
            TurnoId         = turno.Id,
            Fecha           = DateTime.Now,
            UsuarioNombre   = turno.UsuarioApertura?.Nombre ?? "",
            MontoInicial    = turno.MontoInicial,
            TotalEfectivo   = totalEfectivo,
            TotalTarjeta    = totalTarjeta,
            TotalComision   = totalComision,
            TotalVentas     = totalVentas,
            TotalRetiros    = totalRetiros,
            EfectivoEnCaja  = efectivoEnCaja,
            CuentasCobradas = cuentas.Count,
        };
    }

    private static CajaTurnoDto MapTurno(CajaTurno t) => new()
    {
        Id                    = t.Id,
        FechaApertura         = t.FechaApertura,
        FechaCierre           = t.FechaCierre,
        UsuarioAperturaNombre = t.UsuarioApertura?.Nombre ?? "",
        UsuarioCierreNombre   = t.UsuarioCierre?.Nombre,
        MontoInicial          = t.MontoInicial,
        MontoFinal            = t.MontoFinal,
        Estado                = t.Estado,
        Notas                 = t.Notas,
    };
}
