using Microsoft.AspNetCore.SignalR;

namespace BarAvenida.API.Hubs;

public class BarHub : Hub
{
    // Grupos disponibles:
    // - "Barra"       → Monitor de la barra (KDS)
    // - "Admin"       → Monitor admin
    // - "Meseras"     → Tablets de meseras
    // - "Movil"       → Tu celular

    public async Task UnirseAGrupo(string grupo)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, grupo);
        await Clients.Caller.SendAsync("MensajeRecibido", $"Conectado al grupo: {grupo}");
    }

    public async Task SalirDeGrupo(string grupo)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, grupo);
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
