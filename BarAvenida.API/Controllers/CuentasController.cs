using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Hubs;
using BarAvenida.API.Models;
using BarAvenida.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CuentasController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;
    private readonly IHubContext<BarHub> _hub;
    private readonly EscPosService _escPos;
    private readonly TicketService _ticket;

    public CuentasController(
        BarAvenidaDbContext context,
        IHubContext<BarHub> hub,
        EscPosService escPos,
        TicketService ticket)
    {
        _context = context;
        _hub     = hub;
        _escPos  = escPos;
        _ticket  = ticket;
    }

    // ========================================================================
    // ABRIR CUENTA - cuando mesera selecciona una mesa libre
    // ========================================================================
    [HttpPost("abrir")]
    public async Task<ActionResult<CuentaCompletaDto>> AbrirCuenta([FromBody] AbrirCuentaDto dto)
    {
        // Validar que la mesa exista
        var mesa = await _context.Mesas.FindAsync(dto.MesaId);
        if (mesa == null)
            return NotFound(new { mensaje = "Mesa no encontrada" });

        // Validar que no tenga cuenta abierta
        var cuentaExistente = await _context.Cuentas
            .FirstOrDefaultAsync(c => c.MesaId == dto.MesaId && c.Estado == "Abierta");
        if (cuentaExistente != null)
            return BadRequest(new { mensaje = "Esta mesa ya tiene una cuenta abierta" });

        // Validar mesera (Admin también puede abrir cuentas)
        var mesera = await _context.Usuarios.FindAsync(dto.MeseraId);
        if (mesera == null || (mesera.Rol != "Mesera" && mesera.Rol != "Admin"))
            return BadRequest(new { mensaje = "Mesera no válida" });

        // Generar folio (último folio + 1)
        int ultimoFolio = await _context.Cuentas.MaxAsync(c => (int?)c.Folio) ?? 0;

        var cuenta = new Cuenta
        {
            MesaId = dto.MesaId,
            MeseraId = dto.MeseraId,
            NumeroPersonas = dto.NumeroPersonas,
            NombreCliente = string.IsNullOrWhiteSpace(dto.NombreCliente) ? null : dto.NombreCliente.Trim(),
            Area = string.IsNullOrWhiteSpace(dto.Area) ? null : dto.Area.Trim(),
            FechaApertura = DateTime.Now,
            Estado = "Abierta",
            Folio = ultimoFolio + 1
        };

        _context.Cuentas.Add(cuenta);
        await _context.SaveChangesAsync();

        // Notificar a admin que se abrió cuenta
        await _hub.Clients.Group("Admin").SendAsync("CuentaAbierta", new
        {
            cuentaId = cuenta.Id,
            mesaId = mesa.Id,
            mesaNumero = mesa.Numero,
            mesera = mesera.Nombre,
            fecha = cuenta.FechaApertura
        });

        // También a meseras para que actualicen su mapa
        await _hub.Clients.Group("Meseras").SendAsync("MesaActualizada", mesa.Id);

        return Ok(await ObtenerCuentaCompleta(cuenta.Id));
    }

    // ========================================================================
    // ENVIAR ORDEN - cada vez que mesera presiona "ENVIAR"
    // Crea una NUEVA orden dentro de la cuenta. Cada orden = 1 tarjeta KDS
    // ========================================================================
    [HttpPost("enviar-orden")]
    public async Task<ActionResult<OrdenDto>> EnviarOrden([FromBody] EnviarOrdenDto dto)
    {
        // Validar cuenta
        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
            .FirstOrDefaultAsync(c => c.Id == dto.CuentaId);

        if (cuenta == null)
            return NotFound(new { mensaje = "Cuenta no encontrada" });

        if (cuenta.Estado != "Abierta")
            return BadRequest(new { mensaje = "La cuenta no está abierta" });

        if (dto.Detalles == null || !dto.Detalles.Any())
            return BadRequest(new { mensaje = "Debes incluir al menos un producto" });

        // Es agregado si la cuenta ya tiene órdenes anteriores
        bool esAgregado = cuenta.Ordenes.Any();

        // Número incremental dentro de esta cuenta (1, 2, 3...)
        int siguienteNumero = cuenta.Ordenes.Any()
            ? cuenta.Ordenes.Max(o => o.NumeroOrden) + 1
            : 1;

        var orden = new Orden
        {
            CuentaId      = cuenta.Id,
            NumeroOrden   = siguienteNumero,
            FechaEnvio    = DateTime.Now,
            Estado        = "Pendiente",
            EsAgregado    = esAgregado,
            Observaciones = dto.Observaciones
        };

        decimal subtotalOrden = 0;

        // Agregar cada producto a la orden
        foreach (var det in dto.Detalles)
        {
            var producto = await _context.Productos.FindAsync(det.ProductoId);
            if (producto == null || !producto.Activo)
                return BadRequest(new { mensaje = $"Producto {det.ProductoId} no válido" });

            if (det.Cantidad <= 0)
                return BadRequest(new { mensaje = "La cantidad debe ser mayor a 0" });

            var detalle = new OrdenDetalle
            {
                ProductoId = producto.Id,
                Cantidad = det.Cantidad,
                PrecioUnitario = producto.Precio,
                Subtotal = producto.Precio * det.Cantidad,
                Notas = det.Notas
            };

            subtotalOrden += detalle.Subtotal;
            orden.Detalles.Add(detalle);
        }

        _context.Ordenes.Add(orden);

        // Actualizar totales de la cuenta
        cuenta.Subtotal += subtotalOrden;
        cuenta.Total = cuenta.Subtotal - cuenta.Descuento;

        await _context.SaveChangesAsync();

        // Construir el DTO de respuesta
        var ordenDto = await ObtenerOrdenDto(orden.Id);

        // Ticket de barra: fire-and-forget (no bloquea si la impresora falla)
        var cfgTicket = await _context.ConfiguracionesTicket.FindAsync(1);
        if (cfgTicket is not null)
            _ = _escPos.ImprimirTicketAsync(_ticket.GenerarTicketOrden(ordenDto, cuenta, cfgTicket));

        // 🔔 NOTIFICAR AL MONITOR DE BARRA EN TIEMPO REAL
        await _hub.Clients.Group("Barra").SendAsync("NuevaOrden", ordenDto);

        // 🔔 NOTIFICAR AL ADMIN
        await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", cuenta.Id);

        // 🔔 NOTIFICAR AL MÓVIL DEL DUEÑO
        await _hub.Clients.Group("Movil").SendAsync("VentaRegistrada", new
        {
            mesa = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            mesera = cuenta.Mesera!.Nombre,
            total = subtotalOrden,
            esAgregado = esAgregado
        });

        return Ok(ordenDto);
    }

    // ========================================================================
    // LISTAR CUENTAS CON FILTROS - para histórico admin
    // ========================================================================
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> ListarCuentas(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] string?   estado,
        [FromQuery] int?      folio,
        [FromQuery] int?      meseraId)
    {
        var q = _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .AsQueryable();

        if (desde.HasValue)              q = q.Where(c => c.FechaApertura >= desde.Value);
        if (hasta.HasValue)              q = q.Where(c => c.FechaApertura <= hasta.Value);
        if (!string.IsNullOrEmpty(estado)) q = q.Where(c => c.Estado == estado);
        if (folio.HasValue)              q = q.Where(c => c.Folio == folio.Value);
        if (meseraId.HasValue)           q = q.Where(c => c.MeseraId == meseraId.Value);

        var cuentas = await q
            .OrderByDescending(c => c.FechaApertura)
            .Take(200)
            .Select(c => new CuentaResumenDto
            {
                Id            = c.Id,
                Folio         = c.Folio,
                MesaNumero    = c.Mesa != null ? c.Mesa.Numero : "",
                MeseraNombre  = c.Mesera != null ? c.Mesera.Nombre : "",
                Estado        = c.Estado,
                Total         = c.Total,
                FechaApertura = c.FechaApertura,
                FechaCierre   = c.FechaCierre,
                MetodoPago    = c.MetodoPago,
                OrdenesCount  = c.Ordenes.Count,
                NumeroPersonas = c.NumeroPersonas,
            })
            .ToListAsync();

        return Ok(cuentas);
    }

    // ========================================================================
    // OBTENER CUENTA COMPLETA - para mostrar en tablet de mesera
    // ========================================================================
    [HttpGet("{id}")]
    public async Task<ActionResult<CuentaCompletaDto>> ObtenerCuenta(int id)
    {
        var dto = await ObtenerCuentaCompleta(id);
        if (dto == null)
            return NotFound(new { mensaje = "Cuenta no encontrada" });

        return Ok(dto);
    }

    // ========================================================================
    // OBTENER ÓRDENES PENDIENTES - el monitor de barra (KDS) usa esto al cargar
    // ========================================================================
    [HttpGet("ordenes/pendientes")]
    public async Task<ActionResult<IEnumerable<OrdenDto>>> ObtenerOrdenesPendientes()
    {
        var ordenes = await _context.Ordenes
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesa)
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesera)
            .Include(o => o.Detalles)
                .ThenInclude(d => d.Producto)
            .Where(o => o.Estado == "Pendiente")
            .OrderBy(o => o.FechaEnvio)
            .ToListAsync();

        var resultado = ordenes.Select(o => MapearOrdenDto(o)).ToList();

        return Ok(resultado);
    }

    // ========================================================================
    // ÓRDENES COMPLETADAS HOY - el KDS usa esto para la tab "HISTORIAL HOY"
    // ========================================================================
    [HttpGet("ordenes/completadas-hoy")]
    [AllowAnonymous]
    public async Task<IActionResult> OrdenesCompletadasHoy()
    {
        var hoy    = DateTime.Today;
        var manana = hoy.AddDays(1);

        var ordenes = await _context.Ordenes
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesa)
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesera)
            .Include(o => o.Detalles)
                .ThenInclude(d => d.Producto)
            .Where(o => o.FechaListo.HasValue
                     && o.FechaListo.Value >= hoy
                     && o.FechaListo.Value <  manana)
            .OrderByDescending(o => o.FechaListo)
            .Take(200)
            .ToListAsync();

        var resultado = ordenes.Select(o => new
        {
            id            = o.Id,
            mesaId        = o.Cuenta?.MesaId,
            mesaNumero    = o.Cuenta?.Mesa?.Numero ?? o.Cuenta?.NombreCliente ?? "BARRA",
            nombreMesera  = o.Cuenta?.Mesera?.Nombre ?? "",
            numeroOrden   = o.NumeroOrden,
            fechaEnvio    = o.FechaEnvio,
            fechaListo    = o.FechaListo,
            tiempoMinutos = o.FechaListo.HasValue
                ? (int)Math.Round((o.FechaListo.Value - o.FechaEnvio).TotalMinutes)
                : 0,
            detalles = o.Detalles.Select(d => new
            {
                productoNombre = d.Producto != null ? d.Producto.Nombre : "",
                cantidad       = d.Cantidad,
            }).ToList()
        }).ToList();

        return Ok(resultado);
    }

    // ========================================================================
    // MARCAR ORDEN COMO LISTA - cuando barman toca el botón "LISTO"
    // ========================================================================
    [HttpPost("ordenes/{id}/listo")]
    public async Task<ActionResult> MarcarOrdenListo(int id)
    {
        var orden = await _context.Ordenes
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesera)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (orden == null)
            return NotFound(new { mensaje = "Orden no encontrada" });

        if (orden.Estado != "Pendiente")
            return BadRequest(new { mensaje = "La orden ya fue procesada" });

        orden.Estado = "Listo";
        orden.FechaListo = DateTime.Now;

        await _context.SaveChangesAsync();

        // 🔔 NOTIFICAR A TODOS QUE LA ORDEN ESTÁ LISTA
        await _hub.Clients.Group("Barra").SendAsync("OrdenLista", orden.Id);
        await _hub.Clients.Group("Admin").SendAsync("OrdenLista", orden.Id);

        // Notificar a la mesera específica que su orden está lista
        await _hub.Clients.Group("Meseras").SendAsync("OrdenLista", new
        {
            ordenId = orden.Id,
            cuentaId = orden.CuentaId,
            mesera = orden.Cuenta!.Mesera!.Nombre
        });

        return Ok(new { mensaje = "Orden marcada como lista" });
    }

    // ========================================================================
    // COBRAR CUENTA CON IMPRESIÓN — print-first; si falla impresión no cobra
    // ========================================================================
    [HttpPost("{id}/cobrar")]
    public async Task<ActionResult<CuentaCobradaDto>> CobrarCuentaConTicket(int id, [FromBody] CobrarCuentaDto dto)
    {
        var cfg = await _context.ConfiguracionesTicket.FindAsync(1);
        if (cfg == null) return StatusCode(500, new { mensaje = "Sin configuración de ticket" });

        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Abierta" && cuenta.Estado != "PorCobrar")
            return BadRequest(new { mensaje = "La cuenta ya fue cerrada" });

        AplicarCobro(cuenta, dto);

        // Generar ticket con totales ya calculados (en memoria, sin guardar aún)
        var ticket = _ticket.GenerarTicket(cuenta, cfg);

        // Imprimir ANTES de guardar — en simulado genera archivos; en real va a impresora
        bool ok = await _escPos.ImprimirTicketAsync(ticket);
        if (!ok)
            return StatusCode(503, new { mensaje = "No se pudo imprimir el ticket. Verifique la impresora y reintente." });

        // Cajón: solo si no es 100% tarjeta
        bool abrirCajon = cfg.AbrirCajonAlCobrar && cuenta.MetodoPago != "Tarjeta";
        if (abrirCajon)
            await _escPos.AbrirCajonAsync(cuenta.Mesera!.Nombre, "Cobro");

        cuenta.TicketImpreso  = true;
        cuenta.FechaImpresion = DateTime.Now;
        await _context.SaveChangesAsync();

        if (abrirCajon)
        {
            _context.RegistrosAperturaCajon.Add(new RegistroAperturaCajon
            {
                UsuarioId = cuenta.MeseraId,
                Motivo    = "Cobro",
                CuentaId  = cuenta.Id,
                Fecha     = DateTime.Now
            });
            await _context.SaveChangesAsync();
        }

        await NotificarCobro(cuenta);

        return Ok(new CuentaCobradaDto
        {
            Id              = cuenta.Id,
            Folio           = cuenta.Folio,
            Subtotal        = cuenta.Subtotal,
            Descuento       = cuenta.Descuento,
            ComisionTarjeta = cuenta.ComisionTarjeta,
            Total           = cuenta.Total,
            MetodoPago      = cuenta.MetodoPago ?? "",
            MontoEfectivo   = cuenta.MontoEfectivo,
            MontoTarjeta    = cuenta.MontoTarjeta,
            Cambio          = cuenta.Cambio,
            TicketImpreso   = cuenta.TicketImpreso,
            ModoSimulado    = !cfg.ImpresionHabilitada,
        });
    }

    // ========================================================================
    // REIMPRIMIR TICKET
    // ========================================================================
    [HttpPost("{id}/reimprimir")]
    [Authorize]
    public async Task<ActionResult> ReimprimirTicket(int id)
    {
        var cfg = await _context.ConfiguracionesTicket.FindAsync(1);
        if (cfg == null) return StatusCode(500, new { mensaje = "Sin configuración de ticket" });

        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Cobrada") return BadRequest(new { mensaje = "La cuenta no ha sido cobrada" });

        // Folio con sufijo para distinguir reimpresiones en archivos simulados
        var ticket    = _ticket.GenerarTicket(cuenta, cfg);
        ticket.Folio += "-reimpr";

        bool ok = await _escPos.ImprimirTicketAsync(ticket);
        if (!ok) return StatusCode(503, new { mensaje = "No se pudo reimprimir. Verifique la impresora." });

        cuenta.FechaImpresion = DateTime.Now;
        cuenta.TicketImpreso  = true;
        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Ticket reimpreso correctamente" });
    }

    // ========================================================================
    // CANCELAR CUENTA
    // - Sin body: solo si no tiene órdenes (path tablet, compatibilidad)
    // - Con body { pin, motivo }: admin con PIN — permite cancelar con órdenes
    // ========================================================================
    [HttpPost("{id}/cancelar")]
    public async Task<ActionResult> CancelarCuenta(int id, [FromBody] CancelarCuentaDto? dto)
    {
        var cuenta = await _context.Cuentas
            .Include(c => c.Ordenes)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null)
            return NotFound(new { mensaje = "Cuenta no encontrada" });

        if (cuenta.Estado != "Abierta")
            return BadRequest(new { mensaje = "La cuenta no está abierta" });

        if (dto != null && !string.IsNullOrWhiteSpace(dto.Pin))
        {
            // Path admin: valida PIN, permite cancelar aunque tenga órdenes
            var codigo  = User.Identity?.Name ?? "";
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Codigo == codigo && u.Activo);
            if (usuario == null || !BCrypt.Net.BCrypt.Verify(dto.Pin, usuario.PinHash))
                return Unauthorized(new { mensaje = "PIN incorrecto." });

            cuenta.Estado               = "Cancelada";
            cuenta.FechaCierre          = DateTime.Now;
            cuenta.FechaCancelacion     = DateTime.Now;
            cuenta.MotivoCancelacion    = dto.Motivo?.Trim();
            cuenta.UsuarioCancelacionId = usuario.Id;
        }
        else
        {
            // Path legacy (sin PIN): rechaza si tiene órdenes
            if (cuenta.Ordenes.Any())
                return BadRequest(new { mensaje = "Esta cuenta tiene órdenes enviadas, contacta al admin" });

            cuenta.Estado      = "Cancelada";
            cuenta.FechaCierre = DateTime.Now;
        }

        await _context.SaveChangesAsync();

        await _hub.Clients.Group("Admin").SendAsync("CuentaCancelada", cuenta.Id);
        if (cuenta.MesaId.HasValue)
            await _hub.Clients.Group("Meseras").SendAsync("MesaActualizada", cuenta.MesaId);

        return Ok(new { mensaje = "Cuenta cancelada" });
    }

    // ========================================================================
    // TICKETS SIMULADOS DE UNA CUENTA
    // ========================================================================
    [HttpGet("{id}/tickets-simulados")]
    [Authorize]
    public async Task<IActionResult> GetTicketsSimulados(int id)
    {
        var cuenta = await _context.Cuentas.FindAsync(id);
        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });

        var carpeta = Path.Combine("F:", "BarAvenida", "TicketsImpresos");
        if (!Directory.Exists(carpeta))
            return Ok(Array.Empty<TicketSimuladoCuentaDto>());

        string folio = cuenta.Folio.ToString("D4");

        var resultado = Directory.GetFiles(carpeta)
            .Select(f => new
            {
                path = f,
                name = Path.GetFileNameWithoutExtension(f),
                ext  = Path.GetExtension(f).ToLower(),
            })
            .Where(f => f.name.StartsWith($"ticket-{folio}-"))
            .GroupBy(f => f.name)
            .Select(g => new TicketSimuladoCuentaDto
            {
                BaseName    = g.Key,
                Tipo        = g.Key.Contains("-reimpr") ? "reimpr" : "original",
                Extensiones = g.Select(f => f.ext).ToArray(),
                Fecha       = System.IO.File.GetCreationTime(g.First().path),
            })
            .OrderBy(x => x.Fecha)
            .ToList();

        return Ok(resultado);
    }

    // ========================================================================
    // SOLICITAR COBRO — mesera avisa al admin que el cliente pide la cuenta
    // ========================================================================
    [HttpPost("{id}/solicitar-cobro")]
    public async Task<ActionResult<CuentaResumenDto>> SolicitarCobro(int id)
    {
        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Abierta") return BadRequest(new { mensaje = "La cuenta no está abierta" });

        cuenta.Estado = "PorCobrar";
        await _context.SaveChangesAsync();

        var dto = new CuentaResumenDto
        {
            Id             = cuenta.Id,
            Folio          = cuenta.Folio,
            MesaNumero     = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            MeseraNombre   = cuenta.Mesera!.Nombre,
            Estado         = cuenta.Estado,
            Total          = cuenta.Total,
            FechaApertura  = cuenta.FechaApertura,
            OrdenesCount   = cuenta.Ordenes.Count,
            ProductosCount = cuenta.Ordenes.Sum(o => o.Detalles.Sum(d => d.Cantidad)),
            NumeroPersonas = cuenta.NumeroPersonas,
        };

        await _hub.Clients.Group("Admin").SendAsync("CuentaPorCobrar", dto);
        await _hub.Clients.Group("Meseras").SendAsync("MesaPorCobrar", cuenta.MesaId);

        return Ok(dto);
    }

    // ========================================================================
    // CUENTAS POR COBRAR — lista para que admin vea qué mesas están esperando
    // ========================================================================
    [HttpGet("por-cobrar")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CuentaResumenDto>>> GetCuentasPorCobrar()
    {
        var cuentas = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
            .Where(c => c.Estado == "PorCobrar")
            .OrderBy(c => c.FechaApertura)
            .ToListAsync();

        var resultado = cuentas.Select(c => new CuentaResumenDto
        {
            Id             = c.Id,
            Folio          = c.Folio,
            MesaNumero     = c.Mesa?.Numero ?? "",
            MeseraNombre   = c.Mesera?.Nombre ?? "",
            Estado         = c.Estado,
            Total          = c.Total,
            FechaApertura  = c.FechaApertura,
            FechaCierre    = c.FechaCierre,
            OrdenesCount   = c.Ordenes.Count,
            ProductosCount = c.Ordenes.Sum(o => o.Detalles.Sum(d => d.Cantidad)),
            NumeroPersonas = c.NumeroPersonas,
        }).ToList();

        return Ok(resultado);
    }

    // ========================================================================
    // OBTENER CUENTAS ABIERTAS - para vista de admin
    // ========================================================================
    [HttpGet("abiertas")]
    public async Task<ActionResult<IEnumerable<CuentaCompletaDto>>> ObtenerCuentasAbiertas()
    {
        var cuentas = await _context.Cuentas
            .Where(c => c.Estado == "Abierta")
            .Select(c => c.Id)
            .ToListAsync();

        var resultado = new List<CuentaCompletaDto>();
        foreach (var id in cuentas)
        {
            var dto = await ObtenerCuentaCompleta(id);
            if (dto != null) resultado.Add(dto);
        }

        return Ok(resultado);
    }

    // ========================================================================
    // SOLICITAR CANCELACIÓN DE PRODUCTOS — mesera pide al admin autorizar
    // ========================================================================
    [HttpPost("{id}/solicitar-cancelacion-productos")]
    [Authorize]
    public async Task<ActionResult<SolicitudResumenDto>> SolicitarCancelacionProductos(
        int id, [FromBody] SolicitarCancelacionProductosDto dto)
    {
        if (dto.DetallesIds == null || dto.DetallesIds.Length == 0)
            return BadRequest(new { mensaje = "Selecciona al menos un producto" });

        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Abierta") return BadRequest(new { mensaje = "La cuenta no está abierta" });

        // Obtener subtotales de los detalles seleccionados para el MontoTotal
        var detalles = await _context.OrdenDetalles
            .Include(d => d.Producto)
            .Where(d => dto.DetallesIds.Contains(d.Id))
            .ToListAsync();
        var montoTotal = detalles.Sum(d => d.Subtotal);

        var meseraId = int.Parse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        var solicitud = new SolicitudCancelacion
        {
            CuentaId       = id,
            MesaId         = cuenta.MesaId,
            MeseraId       = meseraId,
            Tipo           = "Producto",
            Motivo         = dto.Motivo?.Trim(),
            DetallesIds    = string.Join(",", dto.DetallesIds),
            Estado         = "Pendiente",
            FechaSolicitud = DateTime.Now,
        };

        _context.SolicitudesCancelacion.Add(solicitud);
        await _context.SaveChangesAsync();

        var payload = new SolicitudCompletaDto
        {
            Id             = solicitud.Id,
            CuentaId       = id,
            MesaId         = cuenta.MesaId,
            Folio          = cuenta.Folio,
            MesaNumero     = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            MeseraNombre   = cuenta.Mesera!.Nombre,
            Tipo           = solicitud.Tipo,
            Motivo         = solicitud.Motivo,
            Estado         = solicitud.Estado,
            FechaSolicitud = solicitud.FechaSolicitud,
            MontoTotal     = montoTotal,
            Productos      = detalles.Select(d => new DetalleSolicitudDto
            {
                OrdenDetalleId = d.Id,
                ProductoNombre = d.Producto?.Nombre ?? "",
                Cantidad       = d.Cantidad,
                Subtotal       = d.Subtotal,
            }).ToList(),
        };

        await _hub.Clients.Group("Admin").SendAsync("SolicitudCancelacion", payload);
        await _hub.Clients.Group("Meseras").SendAsync("SolicitudCancelacion", payload);

        return Ok(new SolicitudResumenDto
        {
            Id             = solicitud.Id,
            Tipo           = solicitud.Tipo,
            Estado         = solicitud.Estado,
            FechaSolicitud = solicitud.FechaSolicitud,
        });
    }

    // ========================================================================
    // SOLICITAR CANCELACIÓN DE CUENTA — mesera pide al admin cancelar la cuenta
    // ========================================================================
    [HttpPost("{id}/solicitar-cancelacion-cuenta")]
    [Authorize]
    public async Task<ActionResult<SolicitudResumenDto>> SolicitarCancelacionCuenta(
        int id, [FromBody] SolicitarCancelacionCuentaDto dto)
    {
        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Abierta") return BadRequest(new { mensaje = "La cuenta no está abierta" });

        var meseraId = int.Parse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        var solicitud = new SolicitudCancelacion
        {
            CuentaId       = id,
            MesaId         = cuenta.MesaId,
            MeseraId       = meseraId,
            Tipo           = "Cuenta",
            Motivo         = dto.Motivo?.Trim(),
            Estado         = "Pendiente",
            FechaSolicitud = DateTime.Now,
        };

        _context.SolicitudesCancelacion.Add(solicitud);
        await _context.SaveChangesAsync();

        var payload = new SolicitudCompletaDto
        {
            Id             = solicitud.Id,
            CuentaId       = id,
            MesaId         = cuenta.MesaId,
            Folio          = cuenta.Folio,
            MesaNumero     = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            MeseraNombre   = cuenta.Mesera!.Nombre,
            Tipo           = solicitud.Tipo,
            Motivo         = solicitud.Motivo,
            Estado         = solicitud.Estado,
            FechaSolicitud = solicitud.FechaSolicitud,
            MontoTotal     = cuenta.Total,
        };

        await _hub.Clients.Group("Admin").SendAsync("SolicitudCancelacion", payload);
        await _hub.Clients.Group("Meseras").SendAsync("SolicitudCancelacion", payload);

        return Ok(new SolicitudResumenDto
        {
            Id             = solicitud.Id,
            Tipo           = solicitud.Tipo,
            Estado         = solicitud.Estado,
            FechaSolicitud = solicitud.FechaSolicitud,
        });
    }

    // ========================================================================
    // COBRO RÁPIDO BARRA — admin cobra directo a cliente de barra,
    // sin abrir cuenta previamente. Crea cuenta + orden + cobra en una sola
    // transacción. Usado en BarraRapidaAdminScreen.
    // ========================================================================
    [HttpPost("cobro-rapido-barra")]
    [Authorize]
    public async Task<IActionResult> CobroRapidoBarra([FromBody] CobroRapidoBarraDto dto)
    {
        if (dto?.Productos == null || dto.Productos.Count == 0)
            return BadRequest(new { mensaje = "Debes incluir al menos un producto" });

        if (dto.Productos.Any(p => p.Cantidad <= 0))
            return BadRequest(new { mensaje = "La cantidad de cada producto debe ser mayor a 0" });

        var mesera = await _context.Usuarios.FindAsync(dto.MeseraId);
        if (mesera == null)
            return BadRequest(new { mensaje = "Usuario no válido" });

        var metodo = dto.MetodoPago?.Trim() ?? "Efectivo";
        if (metodo != "Efectivo" && metodo != "Tarjeta" && metodo != "Mixto")
            metodo = "Efectivo";

        // Cargar productos referenciados (validación + precios reales)
        var productoIds = dto.Productos.Select(p => p.ProductoId).Distinct().ToList();
        var productos   = await _context.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        foreach (var item in dto.Productos)
        {
            if (!productos.TryGetValue(item.ProductoId, out var prod) || !prod.Activo)
                return BadRequest(new { mensaje = $"Producto {item.ProductoId} no válido" });
        }

        // Folio correlativo global (mismo criterio que el resto del sistema)
        int ultimoFolio = await _context.Cuentas.MaxAsync(c => (int?)c.Folio) ?? 0;

        // Correlativo del día para "BARRA #N" — incluye TODAS las cuentas barra
        // (abiertas, cobradas, canceladas) creadas hoy, para que cada cobro
        // directo tenga un nombre único.
        var hoy = DateTime.Today;
        int barrasHoy = await _context.Cuentas.CountAsync(c =>
            c.MesaId == null
            && c.FechaApertura >= hoy
            && c.FechaApertura <  hoy.AddDays(1));

        var ahora = DateTime.Now;

        var cuenta = new Cuenta
        {
            MesaId        = null,
            MeseraId      = dto.MeseraId,
            FechaApertura = ahora,
            FechaCierre   = ahora,
            Estado        = "Cobrada",
            Folio         = ultimoFolio + 1,
            NombreCliente = $"BARRA #{barrasHoy + 1}",
            Descuento     = dto.Descuento < 0 ? 0 : dto.Descuento,
            MetodoPago    = metodo,
        };

        // Crear orden única con todos los detalles
        var orden = new Orden
        {
            NumeroOrden = 1,
            FechaEnvio  = ahora,
            FechaListo  = ahora,
            Estado      = "Listo",          // cobro directo: la orden ya está servida
            EsAgregado  = false,
        };

        decimal subtotal = 0;
        foreach (var item in dto.Productos)
        {
            var prod = productos[item.ProductoId];
            decimal sub = prod.Precio * item.Cantidad;
            subtotal += sub;
            orden.Detalles.Add(new OrdenDetalle
            {
                ProductoId     = prod.Id,
                Cantidad       = item.Cantidad,
                PrecioUnitario = prod.Precio,
                Subtotal       = sub,
            });
        }

        cuenta.Subtotal = subtotal;

        decimal baseTotal = subtotal - cuenta.Descuento;
        if (baseTotal < 0) baseTotal = 0;

        // Calcular comisión 5% sobre la parte de tarjeta
        switch (metodo)
        {
            case "Tarjeta":
                cuenta.ComisionTarjeta = Math.Round(baseTotal * 0.05m, 2);
                cuenta.Total           = baseTotal + cuenta.ComisionTarjeta;
                cuenta.MontoTarjeta    = cuenta.Total;
                cuenta.MontoEfectivo   = 0;
                cuenta.Cambio          = 0;
                break;

            case "Mixto":
                var efMixto  = dto.MontoEfectivo < 0 ? 0 : dto.MontoEfectivo;
                var tarMixto = dto.MontoTarjeta  < 0 ? 0 : dto.MontoTarjeta;
                cuenta.ComisionTarjeta = Math.Round(tarMixto * 0.05m, 2);
                cuenta.Total           = baseTotal + cuenta.ComisionTarjeta;
                cuenta.MontoEfectivo   = efMixto;
                cuenta.MontoTarjeta    = tarMixto;
                decimal cubierto       = efMixto + tarMixto + cuenta.ComisionTarjeta;
                cuenta.Cambio          = Math.Max(0, cubierto - cuenta.Total);
                break;

            default: // Efectivo
                cuenta.ComisionTarjeta = 0;
                cuenta.Total           = baseTotal;
                var recibido           = dto.MontoEfectivo > 0 ? dto.MontoEfectivo : cuenta.Total;
                cuenta.MontoEfectivo   = recibido;
                cuenta.MontoTarjeta    = 0;
                cuenta.Cambio          = Math.Max(0, recibido - cuenta.Total);
                break;
        }

        cuenta.RfcCliente         = string.IsNullOrWhiteSpace(dto.RFC)         ? null : dto.RFC.Trim();
        cuenta.RazonSocialCliente = string.IsNullOrWhiteSpace(dto.RazonSocial) ? null : dto.RazonSocial.Trim();

        cuenta.Ordenes.Add(orden);
        _context.Cuentas.Add(cuenta);
        await _context.SaveChangesAsync();

        bool modoSimulado = false;

        // Imprimir ticket si lo pidieron
        if (dto.ImprimirTicket)
        {
            var cfg = await _context.ConfiguracionesTicket.FindAsync(1);
            if (cfg != null)
            {
                modoSimulado = !cfg.ImpresionHabilitada;

                // Recargar cuenta con navegaciones para que el ticket muestre nombres
                var cuentaConDetalles = await _context.Cuentas
                    .Include(c => c.Mesa)
                    .Include(c => c.Mesera)
                    .Include(c => c.Ordenes)
                        .ThenInclude(o => o.Detalles)
                            .ThenInclude(d => d.Producto)
                    .FirstAsync(c => c.Id == cuenta.Id);

                var ticket = _ticket.GenerarTicket(cuentaConDetalles, cfg);
                bool ok = await _escPos.ImprimirTicketAsync(ticket);
                if (ok)
                {
                    cuenta.TicketImpreso  = true;
                    cuenta.FechaImpresion = DateTime.Now;
                    await _context.SaveChangesAsync();
                }
            }
        }

        // Notificar a admin (refresca dashboards / monitor / barra rápida)
        await _hub.Clients.Group("Admin").SendAsync("CuentaCobrada", cuenta.Id);
        await _hub.Clients.Group("Movil").SendAsync("VentaCobrada", new
        {
            mesa       = cuenta.NombreCliente,
            total      = cuenta.Total,
            metodoPago = cuenta.MetodoPago,
        });

        return Ok(new
        {
            cuentaId      = cuenta.Id,
            folio         = cuenta.Folio,
            total         = cuenta.Total,
            cambio        = cuenta.Cambio,
            subtotal      = cuenta.Subtotal,
            comision      = cuenta.ComisionTarjeta,
            metodoPago    = cuenta.MetodoPago,
            ticketImpreso = cuenta.TicketImpreso,
            modoSimulado,
        });
    }

    // ========================================================================
    // ABRIR CUENTA RÁPIDA (BARRA) — sin mesa asignada
    // ========================================================================
    [HttpPost("abrir-rapido")]
    [Authorize]
    public async Task<ActionResult<CuentaCompletaDto>> AbrirCuentaRapida([FromBody] AbrirCuentaRapidaDto dto)
    {
        var mesera = await _context.Usuarios.FindAsync(dto.MeseraId);
        if (mesera == null)
            return BadRequest(new { mensaje = "Usuario no válido" });

        int ultimoFolio = await _context.Cuentas.MaxAsync(c => (int?)c.Folio) ?? 0;
        int barrasAbiertas = await _context.Cuentas
            .CountAsync(c => c.MesaId == null && c.Estado == "Abierta");

        var cuenta = new Cuenta
        {
            MesaId         = null,
            MeseraId       = dto.MeseraId,
            FechaApertura  = DateTime.Now,
            Estado         = "Abierta",
            Folio          = ultimoFolio + 1,
            NombreCliente  = $"BARRA #{barrasAbiertas + 1}"
        };

        _context.Cuentas.Add(cuenta);
        await _context.SaveChangesAsync();

        await _hub.Clients.Group("Admin").SendAsync("CuentaAbierta", new
        {
            cuentaId   = cuenta.Id,
            mesaId     = (int?)null,
            mesaNumero = cuenta.NombreCliente,
            mesera     = mesera.Nombre,
            fecha      = cuenta.FechaApertura
        });
        await _hub.Clients.Group("Meseras").SendAsync("CuentaBarraAbierta", cuenta.Id);

        return Ok(await ObtenerCuentaCompleta(cuenta.Id));
    }

    // ========================================================================
    // CUENTAS ACTIVAS (Abierta + PorCobrar) — para Centro de Operación
    // ========================================================================
    [HttpGet("activas")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CuentaResumenDto>>> ObtenerCuentasActivas()
    {
        var cuentas = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
            .Where(c => c.Estado == "Abierta" || c.Estado == "PorCobrar")
            .OrderBy(c => c.FechaApertura)
            .ToListAsync();

        return Ok(cuentas.Select(c => new CuentaResumenDto
        {
            Id             = c.Id,
            MesaId         = c.MesaId,
            Folio          = c.Folio,
            MesaNumero     = c.Mesa?.Numero ?? "",
            NombreCliente  = c.NombreCliente,
            MeseraNombre   = c.Mesera?.Nombre ?? "",
            Estado         = c.Estado,
            Total          = c.Total,
            FechaApertura  = c.FechaApertura,
            OrdenesCount   = c.Ordenes.Count,
            ProductosCount = c.Ordenes.Sum(o => o.Detalles.Sum(d => d.Cantidad)),
            NumeroPersonas = c.NumeroPersonas,
        }));
    }

    // ========================================================================
    // EDITAR INFO DE CUENTA — nombre, personas, área
    // ========================================================================
    [HttpPost("{id}/editar-info")]
    [Authorize]
    public async Task<IActionResult> EditarInfo(int id, [FromBody] EditarInfoCuentaDto dto)
    {
        var cuenta = await _context.Cuentas.FindAsync(id);
        if (cuenta == null) return NotFound();
        if (cuenta.Estado != "Abierta") return BadRequest(new { mensaje = "Cuenta no abierta" });

        if (dto.NombreCliente  != null)      cuenta.NombreCliente  = dto.NombreCliente.Trim();
        if (dto.NumeroPersonas.HasValue)      cuenta.NumeroPersonas = dto.NumeroPersonas.Value;
        if (dto.Area           != null)       cuenta.Area           = dto.Area.Trim();

        await _context.SaveChangesAsync();
        await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", cuenta.Id);
        return Ok(new { mensaje = "Info actualizada" });
    }

    // ========================================================================
    // MOVER ÁREA
    // ========================================================================
    [HttpPost("{id}/mover-area")]
    [Authorize]
    public async Task<IActionResult> MoverArea(int id, [FromBody] MoverAreaDto dto)
    {
        var cuenta = await _context.Cuentas.FindAsync(id);
        if (cuenta == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.AreaNueva))
            return BadRequest(new { mensaje = "Área inválida" });

        var areaAnterior = cuenta.Area;
        cuenta.Area = dto.AreaNueva.Trim();
        await _context.SaveChangesAsync();
        await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", cuenta.Id);
        return Ok(new { areaAnterior, areaNueva = cuenta.Area });
    }

    // ========================================================================
    // LISTAR CUENTAS RÁPIDAS ABIERTAS
    // ========================================================================
    [HttpGet("rapidas-abiertas")]
    [Authorize]
    public async Task<ActionResult> GetCuentasRapidasAbiertas()
    {
        var cuentas = await _context.Cuentas
            .Include(c => c.Mesera)
            .Include(c => c.Ordenes).ThenInclude(o => o.Detalles).ThenInclude(d => d.Producto)
            .Where(c => c.MesaId == null && c.Estado == "Abierta")
            .OrderBy(c => c.FechaApertura)
            .ToListAsync();

        return Ok(cuentas.Select(c => new {
            id            = c.Id,
            nombre        = c.NombreCliente ?? "BARRA",
            mesera        = c.Mesera != null ? c.Mesera.Nombre : "",
            folio         = c.Folio,
            fechaApertura = c.FechaApertura,
            total         = c.Total
        }));
    }

    // ========================================================================
    // CANCELAR CUENTA YA COBRADA — admin anula post-cobro (error de cobro, devolución, etc.)
    // ========================================================================
    [HttpPost("{id}/cancelar-cobrada")]
    [Authorize]
    public async Task<IActionResult> CancelarCobrada(int id, [FromBody] CancelarCobradaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Motivo) || dto.Motivo.Trim().Length < 10)
            return BadRequest(new { mensaje = "Motivo de mín 10 caracteres" });

        var cuenta = await _context.Cuentas.FindAsync(id);
        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Cobrada")
            return BadRequest(new { mensaje = "Solo cuentas cobradas se pueden cancelar aquí" });

        cuenta.Estado            = "Cancelada";
        cuenta.MotivoCancelacion = dto.Motivo.Trim();
        cuenta.FechaCancelacion  = DateTime.Now;
        await _context.SaveChangesAsync();

        await _hub.Clients.Group("Admin").SendAsync("CuentaCancelada", id);
        return Ok(new { mensaje = "Cuenta cancelada" });
    }

    // ========================================================================
    // REABRIR CUENTA COBRADA — revierte a Abierta para corregir (solo < 30 min)
    // ========================================================================
    [HttpPost("{id}/reabrir")]
    [Authorize]
    public async Task<IActionResult> ReabrirCuenta(int id)
    {
        var cuenta = await _context.Cuentas.FindAsync(id);
        if (cuenta == null) return NotFound(new { mensaje = "Cuenta no encontrada" });
        if (cuenta.Estado != "Cobrada")
            return BadRequest(new { mensaje = "Solo cuentas cobradas se reabren" });
        if (!cuenta.FechaCierre.HasValue || (DateTime.Now - cuenta.FechaCierre.Value).TotalMinutes > 30)
            return BadRequest(new { mensaje = "Pasaron más de 30 min, ya no se puede reabrir" });

        cuenta.Estado          = "Abierta";
        cuenta.FechaCierre     = null;
        cuenta.MetodoPago      = null;
        cuenta.MontoEfectivo   = null;
        cuenta.MontoTarjeta    = null;
        cuenta.Cambio          = 0;
        cuenta.ComisionTarjeta = 0;
        cuenta.TicketImpreso   = false;
        cuenta.FechaImpresion  = null;
        await _context.SaveChangesAsync();

        await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", id);
        if (cuenta.MesaId.HasValue)
            await _hub.Clients.Group("Meseras").SendAsync("MesaActualizada", cuenta.MesaId);
        return Ok(new { mensaje = "Cuenta reabierta" });
    }

    // ========================================================================
    // MÉTODOS AUXILIARES PRIVADOS
    // ========================================================================

    private static void AplicarCobro(Cuenta cuenta, CobrarCuentaDto dto)
    {
        var metodo = dto.MetodoPago?.Trim() ?? "Efectivo";
        if (metodo != "Efectivo" && metodo != "Tarjeta" && metodo != "Mixto")
            metodo = "Efectivo";

        cuenta.Descuento  = dto.Descuento;
        cuenta.MetodoPago = metodo;

        decimal baseTotal = cuenta.Subtotal - cuenta.Descuento;

        switch (metodo)
        {
            case "Tarjeta":
                cuenta.ComisionTarjeta = Math.Round(baseTotal * 0.05m, 2);
                cuenta.Total           = baseTotal + cuenta.ComisionTarjeta;
                cuenta.MontoTarjeta    = cuenta.Total;
                cuenta.MontoEfectivo   = 0;
                cuenta.Cambio          = 0;
                break;

            case "Mixto":
                var montoEfectivo = dto.MontoEfectivo ?? 0;
                var montoTarjeta  = dto.MontoTarjeta  ?? 0;
                cuenta.ComisionTarjeta = Math.Round(montoTarjeta * 0.05m, 2);
                cuenta.Total           = baseTotal + cuenta.ComisionTarjeta;
                cuenta.MontoEfectivo   = montoEfectivo;
                cuenta.MontoTarjeta    = montoTarjeta;
                decimal totalCubierto  = montoEfectivo + montoTarjeta + cuenta.ComisionTarjeta;
                cuenta.Cambio          = Math.Max(0, totalCubierto - cuenta.Total);
                break;

            default: // Efectivo
                cuenta.ComisionTarjeta = 0;
                cuenta.Total           = baseTotal;
                cuenta.MontoEfectivo   = dto.EfectivoRecibido > 0 ? dto.EfectivoRecibido : cuenta.Total;
                cuenta.MontoTarjeta    = 0;
                cuenta.Cambio          = Math.Max(0, (cuenta.MontoEfectivo ?? 0) - cuenta.Total);
                break;
        }

        cuenta.RfcCliente          = dto.RfcCliente;
        cuenta.RazonSocialCliente  = dto.RazonSocialCliente;
        cuenta.FechaCierre         = DateTime.Now;
        cuenta.Estado              = "Cobrada";
    }

    private async Task NotificarCobro(Cuenta cuenta)
    {
        await _hub.Clients.Group("Admin").SendAsync("CuentaCobrada", cuenta.Id);
        if (cuenta.MesaId.HasValue)
            await _hub.Clients.Group("Meseras").SendAsync("MesaActualizada", cuenta.MesaId);
        await _hub.Clients.Group("Movil").SendAsync("VentaCobrada", new
        {
            mesa       = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            total      = cuenta.Total,
            metodoPago = cuenta.MetodoPago
        });
    }


    private async Task<CuentaCompletaDto?> ObtenerCuentaCompleta(int id)
    {
        var cuenta = await _context.Cuentas
            .Include(c => c.Mesa)
            .Include(c => c.Mesera)
            .Include(c => c.UsuarioCancelacion)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuenta == null) return null;

        return new CuentaCompletaDto
        {
            Id                      = cuenta.Id,
            MesaId                  = cuenta.MesaId,
            MesaNumero              = cuenta.Mesa?.Numero ?? cuenta.NombreCliente ?? "BARRA",
            MeseraId                = cuenta.MeseraId,
            MeseraNombre            = cuenta.Mesera!.Nombre,
            NumeroPersonas          = cuenta.NumeroPersonas,
            NombreCliente           = cuenta.NombreCliente,
            Area                    = cuenta.Area,
            FechaApertura           = cuenta.FechaApertura,
            FechaCierre             = cuenta.FechaCierre,
            Estado                  = cuenta.Estado,
            Subtotal                = cuenta.Subtotal,
            Descuento               = cuenta.Descuento,
            Total                   = cuenta.Total,
            MetodoPago              = cuenta.MetodoPago,
            ComisionTarjeta         = cuenta.ComisionTarjeta,
            MontoEfectivo           = cuenta.MontoEfectivo,
            MontoTarjeta            = cuenta.MontoTarjeta,
            Cambio                  = cuenta.Cambio,
            RfcCliente              = cuenta.RfcCliente,
            RazonSocialCliente      = cuenta.RazonSocialCliente,
            TicketImpreso           = cuenta.TicketImpreso,
            FechaImpresion          = cuenta.FechaImpresion,
            MotivoCancelacion       = cuenta.MotivoCancelacion,
            UsuarioCancelacionNombre = cuenta.UsuarioCancelacion?.Nombre,
            FechaCancelacion        = cuenta.FechaCancelacion,
            Folio                   = cuenta.Folio,
            Ordenes                 = cuenta.Ordenes.OrderBy(o => o.FechaEnvio).Select(o => MapearOrdenDto(o)).ToList()
        };
    }

    private async Task<OrdenDto> ObtenerOrdenDto(int ordenId)
    {
        var orden = await _context.Ordenes
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesa)
            .Include(o => o.Cuenta)
                .ThenInclude(c => c!.Mesera)
            .Include(o => o.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstAsync(o => o.Id == ordenId);

        return MapearOrdenDto(orden);
    }

    private OrdenDto MapearOrdenDto(Orden orden)
    {
        var minutos = (int)(DateTime.Now - orden.FechaEnvio).TotalMinutes;

        return new OrdenDto
        {
            Id           = orden.Id,
            CuentaId     = orden.CuentaId,
            NumeroOrden  = orden.NumeroOrden,
            MesaNumero   = orden.Cuenta?.Mesa?.Numero ?? "",
            MeseraNombre = orden.Cuenta?.Mesera?.Nombre ?? "",
            FechaEnvio = orden.FechaEnvio,
            FechaListo = orden.FechaListo,
            Estado = orden.Estado,
            EsAgregado = orden.EsAgregado,
            Observaciones = orden.Observaciones,
            TotalOrden = orden.Detalles.Sum(d => d.Subtotal),
            MinutosTranscurridos = minutos,
            Detalles = orden.Detalles.Select(d => new DetalleOrdenResponseDto
            {
                Id = d.Id,
                ProductoId = d.ProductoId,
                ProductoNombre = d.Producto?.Nombre ?? "",
                Cantidad = d.Cantidad,
                PrecioUnitario = d.PrecioUnitario,
                Subtotal = d.Subtotal,
                Notas = d.Notas
            }).ToList()
        };
    }
}
