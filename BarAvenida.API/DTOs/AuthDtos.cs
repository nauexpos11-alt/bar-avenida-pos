namespace BarAvenida.API.DTOs;

public class LoginDto
{
    public string Codigo { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class ValidarPinAdminDto
{
    public string Pin { get; set; } = string.Empty;
}

// Refresh token response
public class TokenRefreshDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

// PIN admin requerido para acciones destructivas (Round 2)
public class PinConfirmacionDto
{
    public string Pin { get; set; } = string.Empty;
}
