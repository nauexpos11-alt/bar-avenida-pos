namespace BarAvenida.API.Services;

public interface ITicketSimuladoService
{
    Task<string> GenerarArchivosAsync(string textoTicket, string folio);
    Task<string> GenerarArchivosCorteAsync(string textoCorte, string tipo, string folio);
    Task RegistrarAperturaCajonAsync(string usuario, string motivo);
}
