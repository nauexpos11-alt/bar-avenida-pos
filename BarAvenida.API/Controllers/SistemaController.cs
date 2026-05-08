using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/sistema")]
public class SistemaController : ControllerBase
{
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
}
