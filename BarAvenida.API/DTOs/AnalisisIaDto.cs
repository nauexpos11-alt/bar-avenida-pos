namespace BarAvenida.API.DTOs;

public class AnalisisIaSolicitudDto
{
    public string Fecha { get; set; } = "";
}

public class AnalisisIaRespuestaDto
{
    public string   Provider        { get; set; } = ""; // Mock | Claude | Ollama
    public string   Modelo          { get; set; } = "";
    public string   Texto           { get; set; } = ""; // Markdown
    public bool     EsMock          { get; set; } = false;
    public DateTime FechaGeneracion { get; set; } = DateTime.Now;
    public int?     TokensUsados    { get; set; }
}
