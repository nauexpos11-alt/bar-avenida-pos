namespace BarAvenida.API.DTOs;

// ── Áreas ────────────────────────────────────────────────────────────────────

public class AreaDto
{
    public int    Id     { get; set; }
    public string Nombre { get; set; } = "";
    public bool   Activa { get; set; }
    public int    MesasCount { get; set; }
}

public class AreaUpsertDto
{
    public string Nombre { get; set; } = "";
    public bool   Activa { get; set; } = true;
}

// ── Mesas ────────────────────────────────────────────────────────────────────

public class MesaAdminDto
{
    public int    Id         { get; set; }
    public string Numero     { get; set; } = "";
    public int    AreaId     { get; set; }
    public string AreaNombre { get; set; } = "";
    public int    Capacidad  { get; set; }
    public bool   Activa     { get; set; }
}

public class MesaUpsertDto
{
    public string Numero    { get; set; } = "";
    public int    AreaId    { get; set; }
    public int    Capacidad { get; set; } = 4;
    public bool   Activa    { get; set; } = true;
}

// ── Meseros ──────────────────────────────────────────────────────────────────

public class MeseroDto
{
    public int      Id            { get; set; }
    public string   Nombre        { get; set; } = "";
    public string   Codigo        { get; set; } = "";
    public string   Rol           { get; set; } = "";
    public bool     Activo        { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class MeseroCreateDto
{
    public string Nombre { get; set; } = "";
    public string Codigo { get; set; } = "";
    public string Pin    { get; set; } = "";
    public string Rol    { get; set; } = "Mesera";
}

public class MeseroUpdateDto
{
    public string  Nombre { get; set; } = "";
    public string  Codigo { get; set; } = "";
    public string? Pin    { get; set; }
    public string  Rol    { get; set; } = "Mesera";
    public bool    Activo { get; set; } = true;
}

// ── Formas de pago ───────────────────────────────────────────────────────────

public class FormaPagoDto
{
    public int     Id                  { get; set; }
    public string  Nombre              { get; set; } = "";
    public string  Codigo              { get; set; } = "";
    public decimal ComisionPorcentaje  { get; set; }
    public bool    ActivaParaCobro     { get; set; }
    public int     Orden               { get; set; }
}

public class FormaPagoUpsertDto
{
    public string  Nombre             { get; set; } = "";
    public string  Codigo             { get; set; } = "";
    public decimal ComisionPorcentaje { get; set; } = 0;
    public bool    ActivaParaCobro    { get; set; } = true;
    public int     Orden              { get; set; } = 0;
}

// ── Folio ────────────────────────────────────────────────────────────────────

public class FolioDto
{
    public int    UltimoFolio    { get; set; }
    public string PrefijoFolio   { get; set; } = "";
    public int    LongitudMinima { get; set; }
}

public class FolioUpdateDto
{
    public string PrefijoFolio   { get; set; } = "";
    public int    LongitudMinima { get; set; } = 4;
}

// ── Auth: cambiar PIN ────────────────────────────────────────────────────────

public class CambiarPinDto
{
    public string PinActual    { get; set; } = "";
    public string PinNuevo     { get; set; } = "";
    public string ConfirmarPin { get; set; } = "";
}

public class CambiarPinAdminDto
{
    public string CodigoUsuario { get; set; } = "";
    public string PinNuevo      { get; set; } = "";
}
