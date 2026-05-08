using System.Net.Http.Json;
using System.Text.Json;
using BarAvenida.API.DTOs;
using BarAvenida.API.Settings;
using Microsoft.Extensions.Options;

namespace BarAvenida.API.Services;

public class AsistenteService
{
    private readonly IHttpClientFactory      _http;
    private readonly AsistenteSettings       _cfg;
    private readonly ILogger<AsistenteService> _log;

    public AsistenteService(
        IHttpClientFactory           http,
        IOptions<AsistenteSettings>  opts,
        ILogger<AsistenteService>    log)
    {
        _http = http;
        _cfg  = opts.Value;
        _log  = log;
    }

    public async Task<AnalisisIaRespuestaDto> AnalizarInforme(InformeDiaDto informe)
    {
        var prompt = ConstruirPrompt(informe);

        try
        {
            return _cfg.Provider switch
            {
                "Claude" when !string.IsNullOrWhiteSpace(_cfg.Claude.ApiKey)
                    => await LlamarClaudeAsync(prompt),
                "Ollama"
                    => await LlamarOllamaAsync(prompt),
                _ => GenerarMock(informe),
            };
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "[AsistenteService] Provider {Provider} fallo, usando Mock", _cfg.Provider);
            var mock = GenerarMock(informe);
            mock.Texto = $"El proveedor de IA fallo ({ex.Message}). Analisis fallback:\n\n" + mock.Texto;
            return mock;
        }
    }

    // ── Construccion del prompt ──────────────────────────────────────────────
    private static string ConstruirPrompt(InformeDiaDto i)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Eres un consultor de bares analizando el reporte del dia de Bar Avenida (cantina mexicana en Saltillo).");
        sb.AppendLine("Habla en espanol casual mexicano, directo, sin endulzar. Maximo 250 palabras.");
        sb.AppendLine("Da 3 secciones: 'Lo bueno', 'Lo regular', 'Lo malo y que hacer'.");
        sb.AppendLine("Si no hay datos suficientes, dilo y sugiere que hacer al respecto.");
        sb.AppendLine();
        sb.AppendLine($"FECHA: {i.FechaTexto}");
        sb.AppendLine($"VENTAS HOY: ${i.Resumen.VentasTotales:N0}");
        sb.AppendLine($"CUENTAS COBRADAS: {i.Resumen.CuentasCobradas}");
        sb.AppendLine($"TICKET PROMEDIO: ${i.Resumen.TicketPromedio:N0}");
        sb.AppendLine($"PRODUCTOS VENDIDOS: {i.Resumen.ProductosVendidos}");
        sb.AppendLine();
        sb.AppendLine("HIGHLIGHTS:");
        foreach (var h in i.Highlights)
            sb.AppendLine($"- {h.Titulo}: {h.Descripcion}");
        sb.AppendLine();
        sb.AppendLine($"COMPARATIVAS: {i.Comparativas.Ayer} | {i.Comparativas.SemanaAnterior}");
        sb.AppendLine();
        if (i.Anomalias.Count > 0)
        {
            sb.AppendLine("ANOMALIAS:");
            foreach (var a in i.Anomalias)
                sb.AppendLine($"- ({a.Severidad}) {a.Mensaje}");
            sb.AppendLine();
        }
        sb.AppendLine("Genera el analisis ahora.");
        return sb.ToString();
    }

    // ── Claude API ───────────────────────────────────────────────────────────
    private async Task<AnalisisIaRespuestaDto> LlamarClaudeAsync(string prompt)
    {
        var client = _http.CreateClient();
        client.BaseAddress = new Uri("https://api.anthropic.com/");
        client.DefaultRequestHeaders.Add("x-api-key", _cfg.Claude.ApiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = new
        {
            model      = _cfg.Claude.Model,
            max_tokens = _cfg.Claude.MaxTokens,
            messages   = new[] { new { role = "user", content = prompt } },
        };

        var resp = await client.PostAsJsonAsync("v1/messages", body);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            throw new Exception($"Claude API HTTP {(int)resp.StatusCode}: {err}");
        }

        var json   = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var texto  = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
        int? tokens = null;
        if (doc.RootElement.TryGetProperty("usage", out var usage)
            && usage.TryGetProperty("output_tokens", out var ot))
            tokens = ot.GetInt32();

        return new AnalisisIaRespuestaDto
        {
            Provider     = "Claude",
            Modelo       = _cfg.Claude.Model,
            Texto        = texto,
            EsMock       = false,
            TokensUsados = tokens,
        };
    }

    // ── Ollama local ─────────────────────────────────────────────────────────
    private async Task<AnalisisIaRespuestaDto> LlamarOllamaAsync(string prompt)
    {
        var client = _http.CreateClient();
        client.BaseAddress = new Uri(_cfg.Ollama.BaseUrl.TrimEnd('/') + "/");
        client.Timeout     = TimeSpan.FromMinutes(2);

        var body = new { model = _cfg.Ollama.Model, prompt, stream = false };

        var resp = await client.PostAsJsonAsync("api/generate", body);
        if (!resp.IsSuccessStatusCode)
            throw new Exception($"Ollama HTTP {(int)resp.StatusCode}");

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var texto = doc.RootElement.GetProperty("response").GetString() ?? "";

        return new AnalisisIaRespuestaDto
        {
            Provider = "Ollama",
            Modelo   = _cfg.Ollama.Model,
            Texto    = texto,
            EsMock   = false,
        };
    }

    // ── Mock (default) ───────────────────────────────────────────────────────
    private static AnalisisIaRespuestaDto GenerarMock(InformeDiaDto i)
    {
        var sb = new System.Text.StringBuilder();

        if (i.Resumen.CuentasCobradas == 0)
        {
            sb.AppendLine("**Analisis del dia**");
            sb.AppendLine();
            sb.AppendLine("Sin movimiento registrado. Posibles causas:");
            sb.AppendLine("- Bar cerrado");
            sb.AppendLine("- Falta capturar ventas");
            sb.AppendLine("- Problema tecnico");
            sb.AppendLine();
            sb.AppendLine("**Sugerencia:** revisa que las meseras esten usando bien la tablet y que se cierren las cuentas correctamente.");
        }
        else
        {
            sb.AppendLine("**Lo bueno**");
            sb.AppendLine($"Cerraste {i.Resumen.CuentasCobradas} cuentas por ${i.Resumen.VentasTotales:N0}, con ticket promedio de ${i.Resumen.TicketPromedio:N0}.");
            var topMesera = i.Highlights.FirstOrDefault(h => h.Tipo == "TopMesera");
            if (topMesera != null)
                sb.AppendLine($"- {topMesera.Descripcion}");
            sb.AppendLine();

            sb.AppendLine("**Lo regular**");
            sb.AppendLine(i.Comparativas.Ayer);
            sb.AppendLine();

            sb.AppendLine("**Lo malo y que hacer**");
            if (i.Anomalias.Count > 0)
            {
                foreach (var a in i.Anomalias)
                    sb.AppendLine($"- ({a.Severidad}) {a.Mensaje}");
            }
            else
            {
                sb.AppendLine("Nada grave detectado. Buen dia!");
            }
            sb.AppendLine();
            sb.AppendLine("_(Analisis en modo Mock. Configura Claude o Ollama en appsettings.json para IA real.)_");
        }

        return new AnalisisIaRespuestaDto
        {
            Provider = "Mock",
            Modelo   = "rule-based-fallback",
            Texto    = sb.ToString(),
            EsMock   = true,
        };
    }
}
