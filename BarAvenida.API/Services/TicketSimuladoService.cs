using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace BarAvenida.API.Services;

public class TicketSimuladoService : ITicketSimuladoService
{
    private static readonly string RUTA_CARPETA = BarAvenida.API.Helpers.PathHelper.TicketsImpresos;

    private readonly ILogger<TicketSimuladoService> _logger;

    public TicketSimuladoService(ILogger<TicketSimuladoService> logger)
    {
        _logger = logger;
    }

    public async Task<string> GenerarArchivosAsync(string textoTicket, string folio)
    {
        Directory.CreateDirectory(RUTA_CARPETA);

        string ts       = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        string baseName = $"ticket-{folio}-{ts}";

        string rutaTxt  = Path.Combine(RUTA_CARPETA, baseName + ".txt");
        string rutaPdf  = Path.Combine(RUTA_CARPETA, baseName + ".pdf");
        string rutaHtml = Path.Combine(RUTA_CARPETA, baseName + ".html");

        await Task.WhenAll(
            GenerarTxtAsync(textoTicket, rutaTxt),
            Task.Run(() => GenerarPdf(textoTicket, folio, rutaPdf)),
            GenerarHtmlAsync(textoTicket, folio, rutaHtml)
        );

        _logger.LogInformation(
            "🖨️ [SIMULADO] Ticket #{Folio} guardado en disco: {Ruta}",
            folio, RUTA_CARPETA);

        return RUTA_CARPETA;
    }

    public async Task<string> GenerarArchivosCorteAsync(string textoCorte, string tipo, string folio)
    {
        Directory.CreateDirectory(RUTA_CARPETA);

        string ts       = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        string baseName = $"corte-{tipo.ToLower()}-{folio}-{ts}";

        string rutaTxt  = Path.Combine(RUTA_CARPETA, baseName + ".txt");
        string rutaPdf  = Path.Combine(RUTA_CARPETA, baseName + ".pdf");
        string rutaHtml = Path.Combine(RUTA_CARPETA, baseName + ".html");

        string titulo = $"Corte {tipo.ToUpper()} #{folio}";

        await Task.WhenAll(
            GenerarTxtAsync(textoCorte, rutaTxt),
            Task.Run(() => GenerarPdf(textoCorte, titulo, rutaPdf)),
            GenerarHtmlAsync(textoCorte, titulo, rutaHtml)
        );

        _logger.LogInformation(
            "📊 [SIMULADO] Corte {Tipo} #{Folio} guardado en disco: {Ruta}",
            tipo, folio, RUTA_CARPETA);

        return RUTA_CARPETA;
    }

    public Task RegistrarAperturaCajonAsync(string usuario, string motivo)
    {
        _logger.LogInformation(
            "💰 [SIMULADO] Cajón abierto por {Usuario} - Motivo: {Motivo}",
            usuario, motivo);
        return Task.CompletedTask;
    }

    // ── TXT ──────────────────────────────────────────────────────────────────

    private static async Task GenerarTxtAsync(string texto, string ruta)
    {
        var enc = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        await File.WriteAllTextAsync(ruta, texto, enc);
    }

    // ── PDF ──────────────────────────────────────────────────────────────────

    private static void GenerarPdf(string texto, string folio, string ruta)
    {
        int lineCount  = texto.Split('\n').Length;
        float heightMm = Math.Clamp(lineCount * 3.8f + 20f, 80f, 500f);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(80, heightMm, Unit.Millimetre);
                page.Margin(3, Unit.Millimetre);
                page.DefaultTextStyle(s =>
                    s.FontFamily("Courier New").FontSize(8).LineHeight(1.2f));

                page.Content()
                    .Text(text =>
                    {
                        foreach (var line in texto.Split('\n'))
                            text.Line(line);
                    });
            });
        }).GeneratePdf(ruta);
    }

    // ── HTML ─────────────────────────────────────────────────────────────────

    private static async Task GenerarHtmlAsync(string texto, string folio, string ruta)
    {
        string escapado = texto
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;");

        string fecha = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");

        // $$""" = raw string with 2 $ — CSS braces need no escaping; interpolations use {{expr}}
        string html = $$"""
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <title>Ticket {{folio}}</title>
              <style>
                body { background: #e8e8e8; padding: 20px; font-family: Arial, sans-serif; margin: 0; }
                .meta {
                  width: 80mm;
                  margin: 0 auto 10px;
                  font-family: Arial, sans-serif;
                  font-size: 11px;
                  color: #666;
                }
                .ticket {
                  width: 80mm;
                  margin: 0 auto;
                  padding: 8px 6px;
                  background: #fff;
                  font-family: 'Courier New', Consolas, monospace;
                  font-size: 11px;
                  line-height: 1.3;
                  border: 1px dashed #999;
                  white-space: pre;
                  color: #000;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
                }
              </style>
            </head>
            <body>
              <div class="meta">📄 Ticket simulado &middot; #{{folio}} &middot; {{fecha}}</div>
              <div class="ticket">{{escapado}}</div>
            </body>
            </html>
            """;

        var enc = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        await File.WriteAllTextAsync(ruta, html, enc);
    }
}
