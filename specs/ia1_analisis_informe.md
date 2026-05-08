# SPEC IA.1 — Análisis IA del Informe del Día

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork
> **Primer entregable de Fase 3 (IA integrada)**
> **CON una librería opcional** (`System.Net.Http.Json` ya viene con .NET 8 — no requiere paquete extra)
> **Sin migración EF**
> **Sesión estimada:** 2-3h Claude Code

---

## 1. Objetivo

Agregar un botón "🤖 Pedir análisis IA" en `InformeDiaScreen`. Al darle click,
el backend recopila los datos del día (los mismos que ya calcula
`/api/admin/reportes/informe-dia`) y los manda a una IA con un prompt
estructurado. La IA responde con un análisis ejecutivo en lenguaje natural
más rico que las heurísticas estáticas:

- Identifica **patrones** que las heurísticas no ven (ej: "tu mejor venta de
  cervezas fue durante una hora donde no se vendieron botanas — pierde
  oportunidad de cross-sell")
- **Recomendaciones específicas** basadas en la situación del día
- **Tono mexicano casual** consistente con el resto del sistema

## 2. Decisiones tomadas

1. **Provider configurable** en `appsettings.json` con 3 opciones:
   - `"Mock"` — respuestas pre-armadas (default, para desarrollo)
   - `"Claude"` — llama Anthropic API (requiere `ClaudeApiKey`)
   - `"Ollama"` — llama Ollama local en `http://localhost:11434` (requiere modelo descargado)

2. **Si no hay API key configurada** → fallback a Mock automáticamente. Toast informativo en frontend.

3. **El análisis NO se guarda en BD** — siempre se calcula on-demand. Si en futuro queremos historial, agregar tabla.

4. **Scope del prompt:** SOLO datos del día consultado. No mandamos histórico completo a la IA (privacidad + costo).

5. **Render frontend:** texto del análisis en formato Markdown (negritas, listas, etc.). Render con un mini-parser sencillo (sin librería).

## 3. Backend

### 3.1 Settings

En `Settings/CajaSettings.cs` o crear archivo nuevo `Settings/AsistenteSettings.cs`:

```csharp
namespace BarAvenida.API.Settings;

public class AsistenteSettings
{
    /// <summary>"Mock" | "Claude" | "Ollama"</summary>
    public string Provider { get; set; } = "Mock";

    public ClaudeProviderSettings Claude { get; set; } = new();
    public OllamaProviderSettings Ollama { get; set; } = new();
}

public class ClaudeProviderSettings
{
    public string ApiKey { get; set; } = "";
    public string Model  { get; set; } = "claude-haiku-4-5-20251001";
    public int    MaxTokens { get; set; } = 800;
}

public class OllamaProviderSettings
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model   { get; set; } = "llama3.2:3b";
}
```

En `Program.cs` registrar:
```csharp
builder.Services.Configure<AsistenteSettings>(builder.Configuration.GetSection("Asistente"));
builder.Services.AddHttpClient(); // necesario para llamar APIs externas
builder.Services.AddSingleton<AsistenteService>();
```

En `appsettings.json` agregar al final (al mismo nivel que "Caja"):
```json
"Asistente": {
  "Provider": "Mock",
  "Claude": {
    "ApiKey": "",
    "Model": "claude-haiku-4-5-20251001",
    "MaxTokens": 800
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "Model": "llama3.2:3b"
  }
}
```

**Nota Importante para Coronado:** Para activar Claude API real, edita
`appsettings.json` y pon:
- `Provider: "Claude"`
- `Claude.ApiKey: "sk-ant-..."` (la API key de Anthropic console)

### 3.2 DTO

`F:\BarAvenida\BarAvenida.API\DTOs\AnalisisIaDto.cs`:

```csharp
namespace BarAvenida.API.DTOs;

public class AnalisisIaSolicitudDto
{
    public string Fecha { get; set; } = ""; // "2026-05-07"
}

public class AnalisisIaRespuestaDto
{
    public string Provider { get; set; } = ""; // "Mock" | "Claude" | "Ollama"
    public string Modelo   { get; set; } = "";
    public string Texto    { get; set; } = ""; // Markdown
    public bool   EsMock   { get; set; } = false;
    public DateTime FechaGeneracion { get; set; } = DateTime.Now;
    public int? TokensUsados { get; set; }
}
```

### 3.3 Service

`F:\BarAvenida\BarAvenida.API\Services\AsistenteService.cs`:

```csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BarAvenida.API.DTOs;
using BarAvenida.API.Settings;
using Microsoft.Extensions.Options;

namespace BarAvenida.API.Services;

public class AsistenteService
{
    private readonly IHttpClientFactory _http;
    private readonly AsistenteSettings _cfg;
    private readonly ILogger<AsistenteService> _log;

    public AsistenteService(
        IHttpClientFactory http,
        IOptions<AsistenteSettings> opts,
        ILogger<AsistenteService> log)
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
            _log.LogWarning(ex, "[AsistenteService] Provider {Provider} falló, usando Mock", _cfg.Provider);
            var mock = GenerarMock(informe);
            mock.Texto = $"⚠ El proveedor de IA falló ({ex.Message}). Análisis fallback:\n\n" + mock.Texto;
            return mock;
        }
    }

    // ── Prompt construido del informe ────────────────────────────────────────
    private string ConstruirPrompt(InformeDiaDto i)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Eres un consultor de bares analizando el reporte del día de Bar Avenida (cantina mexicana en Saltillo).");
        sb.AppendLine("Habla en español casual mexicano, directo, sin endulzar. Máximo 250 palabras.");
        sb.AppendLine("Da 3 secciones: 'Lo bueno', 'Lo regular', 'Lo malo y qué hacer'.");
        sb.AppendLine("Si no hay datos suficientes, dilo y sugiere qué hacer al respecto.");
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
        if (i.Anomalias.Any())
        {
            sb.AppendLine("ANOMALÍAS:");
            foreach (var a in i.Anomalias)
                sb.AppendLine($"- ({a.Severidad}) {a.Mensaje}");
            sb.AppendLine();
        }
        sb.AppendLine("Genera el análisis ahora.");
        return sb.ToString();
    }

    // ── Llamada a Claude API ─────────────────────────────────────────────────
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
            messages   = new[] {
                new { role = "user", content = prompt }
            }
        };

        var resp = await client.PostAsJsonAsync("v1/messages", body);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            throw new Exception($"Claude API HTTP {(int)resp.StatusCode}: {err}");
        }

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var texto = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
        int? tokens = null;
        if (doc.RootElement.TryGetProperty("usage", out var usage)
            && usage.TryGetProperty("output_tokens", out var ot))
        {
            tokens = ot.GetInt32();
        }

        return new AnalisisIaRespuestaDto
        {
            Provider     = "Claude",
            Modelo       = _cfg.Claude.Model,
            Texto        = texto,
            EsMock       = false,
            TokensUsados = tokens,
        };
    }

    // ── Llamada a Ollama local ───────────────────────────────────────────────
    private async Task<AnalisisIaRespuestaDto> LlamarOllamaAsync(string prompt)
    {
        var client = _http.CreateClient();
        client.BaseAddress = new Uri(_cfg.Ollama.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromMinutes(2);

        var body = new
        {
            model  = _cfg.Ollama.Model,
            prompt = prompt,
            stream = false,
        };

        var resp = await client.PostAsJsonAsync("api/generate", body);
        if (!resp.IsSuccessStatusCode)
            throw new Exception($"Ollama HTTP {(int)resp.StatusCode}");

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var texto = doc.RootElement.GetProperty("response").GetString() ?? "";

        return new AnalisisIaRespuestaDto
        {
            Provider = "Ollama",
            Modelo   = _cfg.Ollama.Model,
            Texto    = texto,
            EsMock   = false,
        };
    }

    // ── Mock provider ────────────────────────────────────────────────────────
    private AnalisisIaRespuestaDto GenerarMock(InformeDiaDto i)
    {
        var sb = new System.Text.StringBuilder();

        if (i.Resumen.CuentasCobradas == 0)
        {
            sb.AppendLine("**📊 Análisis del día**");
            sb.AppendLine();
            sb.AppendLine("Sin movimiento registrado. Posibles causas:");
            sb.AppendLine("- Bar cerrado");
            sb.AppendLine("- Falta capturar ventas");
            sb.AppendLine("- Problema técnico");
            sb.AppendLine();
            sb.AppendLine("**Sugerencia:** revisa que las meseras estén usando bien la tablet y que se cierren las cuentas correctamente.");
        }
        else
        {
            sb.AppendLine($"**🟢 Lo bueno**");
            sb.AppendLine($"Cerraste {i.Resumen.CuentasCobradas} cuentas por ${i.Resumen.VentasTotales:N0}, con ticket promedio de ${i.Resumen.TicketPromedio:N0}.");
            if (i.Highlights.Any(h => h.Tipo == "TopMesera"))
                sb.AppendLine($"- {i.Highlights.First(h => h.Tipo == "TopMesera").Descripcion}");
            sb.AppendLine();

            sb.AppendLine($"**🟡 Lo regular**");
            sb.AppendLine(i.Comparativas.Ayer);
            sb.AppendLine();

            sb.AppendLine($"**🔴 Lo malo y qué hacer**");
            if (i.Anomalias.Any())
            {
                foreach (var a in i.Anomalias)
                    sb.AppendLine($"- ({a.Severidad}) {a.Mensaje}");
            }
            else
            {
                sb.AppendLine("Nada grave detectado por las heurísticas. ¡Buen día!");
            }
            sb.AppendLine();
            sb.AppendLine("_(Análisis generado en modo Mock — configura Claude o Ollama en appsettings.json para análisis IA real.)_");
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
```

### 3.4 Endpoint

Agregar al `ReportesInterpretativosController`:

```csharp
private readonly AsistenteService _asistente;

// En el constructor agregar:
public ReportesInterpretativosController(
    BarAvenidaDbContext db,
    IOptions<CajaSettings> opts,
    AsistenteService asistente)
{
    _db = db;
    _h  = opts.Value.Reportes.Heuristicas;
    _asistente = asistente;
}

// POST /api/admin/reportes/analisis-ia?fecha=2026-05-07
[HttpPost("analisis-ia")]
public async Task<IActionResult> AnalisisIa([FromQuery] DateTime? fecha)
{
    // Reutilizar la lógica de InformeDia para construir el DTO
    var informeResp = await InformeDia(fecha) as OkObjectResult;
    if (informeResp?.Value is not InformeDiaDto informe)
        return StatusCode(500, new { mensaje = "No se pudo generar el informe base" });

    var analisis = await _asistente.AnalizarInforme(informe);
    return Ok(analisis);
}
```

## 4. Frontend Admin

### 4.1 `api.js`

Agregar:
```javascript
adminAnalisisIa: (t, fecha) => {
  const qs = fecha ? `?fecha=${fecha}` : ''
  return req(`/api/admin/reportes/analisis-ia${qs}`, { method: 'POST' }, t)
},
```

### 4.2 Modificar `InformeDiaScreen.jsx`

Agregar estado:
```javascript
const [analisis, setAnalisis] = useState(null)
const [analizando, setAnalizando] = useState(false)
```

Agregar función:
```javascript
const pedirAnalisisIa = async () => {
  setAnalizando(true)
  try {
    const r = await api.adminAnalisisIa(auth.token, fecha)
    setAnalisis(r)
  } catch (e) {
    setAnalisis({ texto: '⚠ Error: ' + e.message, esMock: true, provider: 'Error' })
  } finally {
    setAnalizando(false)
  }
}
```

Agregar **al final** del body (después de Recomendaciones):

```jsx
<section className="id-section id-ia-section">
  <div className="id-ia-header">
    <h2 className="id-sec-titulo">🤖 ANÁLISIS IA</h2>
    <button
      className="id-ia-btn"
      onClick={pedirAnalisisIa}
      disabled={analizando}
    >
      {analizando ? '🤖 Analizando…' : '🤖 Pedir análisis IA'}
    </button>
  </div>

  {analisis && (
    <div className={`id-ia-resultado ${analisis.esMock ? 'id-ia-mock' : 'id-ia-real'}`}>
      <div className="id-ia-meta">
        <span className="id-ia-provider">{analisis.provider}</span>
        {analisis.modelo && <span className="id-ia-modelo">· {analisis.modelo}</span>}
        {analisis.tokensUsados && <span className="id-ia-tokens">· {analisis.tokensUsados} tokens</span>}
      </div>
      <MarkdownSimple texto={analisis.texto} />
    </div>
  )}
</section>
```

### 4.3 Mini-parser Markdown (sin librería)

Componente helper inline en el mismo archivo:

```javascript
function MarkdownSimple({ texto }) {
  // Soporte mínimo: **negritas**, _italicas_, listas con - o *, párrafos
  const lineas = texto.split('\n')
  const elementos = []
  let listaActual = null

  lineas.forEach((linea, i) => {
    const trim = linea.trim()
    const esLista = /^[-*]\s+/.test(trim)

    if (esLista) {
      if (!listaActual) {
        listaActual = []
        elementos.push({ tipo: 'lista', items: listaActual })
      }
      listaActual.push(trim.replace(/^[-*]\s+/, ''))
    } else {
      listaActual = null
      if (trim) elementos.push({ tipo: 'parrafo', texto: trim })
    }
  })

  function renderInline(t) {
    // Reemplazos secuenciales — orden importa
    const partes = []
    let i = 0
    let key = 0
    while (i < t.length) {
      // **bold**
      if (t.slice(i, i + 2) === '**') {
        const end = t.indexOf('**', i + 2)
        if (end > -1) {
          partes.push(<strong key={key++}>{t.slice(i + 2, end)}</strong>)
          i = end + 2
          continue
        }
      }
      // _italic_ (rodeado por espacio o inicio)
      if (t[i] === '_' && (i === 0 || t[i - 1] === ' ')) {
        const end = t.indexOf('_', i + 1)
        if (end > -1) {
          partes.push(<em key={key++}>{t.slice(i + 1, end)}</em>)
          i = end + 1
          continue
        }
      }
      // texto plano hasta el siguiente token
      const next = t.slice(i).search(/\*\*|\s_/)
      if (next === -1) {
        partes.push(t.slice(i))
        break
      } else {
        partes.push(t.slice(i, i + next))
        i += next
      }
    }
    return partes
  }

  return (
    <div className="id-md">
      {elementos.map((el, i) => {
        if (el.tipo === 'lista') {
          return <ul key={i}>{el.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>
        }
        return <p key={i}>{renderInline(el.texto)}</p>
      })}
    </div>
  )
}
```

### 4.4 CSS

Agregar al `InformeDiaScreen.css`:

```css
.id-ia-section {
  border-color: #6d28d9; /* morado para distinguir de las otras secciones doradas */
}

.id-ia-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.id-ia-btn {
  background: linear-gradient(135deg, #6d28d9 0%, #a855f7 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 0.08s, opacity 0.12s;
}
.id-ia-btn:hover  { transform: scale(1.03); }
.id-ia-btn:active { transform: scale(0.97); }
.id-ia-btn:disabled { opacity: 0.6; cursor: wait; }

.id-ia-resultado {
  margin-top: 12px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #1a0e2e 0%, #110820 100%);
  border: 1px solid #6d28d9;
  border-radius: 8px;
  animation: idFadeIn 0.3s ease-out;
}

.id-ia-mock { border-color: #888; opacity: 0.92; }
.id-ia-real { border-color: #a855f7; }

.id-ia-meta {
  font-size: 0.7rem;
  color: #888;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.id-ia-provider { color: #c4b5fd; font-weight: 800; }

.id-md p {
  margin: 0 0 10px;
  color: #ddd;
  line-height: 1.5;
  font-size: 0.92rem;
}
.id-md ul {
  margin: 0 0 10px 18px;
  padding: 0;
  color: #ddd;
}
.id-md li { margin: 3px 0; line-height: 1.4; }
.id-md strong { color: #f0c842; }
.id-md em { color: #c4b5fd; }

@keyframes idFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

## 5. Criterios de aceptación

### Backend
- [ ] `POST /api/admin/reportes/analisis-ia?fecha=YYYY-MM-DD` retorna `AnalisisIaRespuestaDto`.
- [ ] Con `Provider="Mock"` (default): retorna análisis pre-armado basado en heurísticas, `EsMock=true`.
- [ ] Con `Provider="Claude"` y key vacía: fallback a Mock con toast informativo.
- [ ] Con `Provider="Claude"` y key válida: llama Anthropic API, retorna texto real.
- [ ] Errores de Claude/Ollama → fallback a Mock con disclaimer.
- [ ] **Build backend en 0/0**.

### Frontend
- [ ] Botón "🤖 Pedir análisis IA" visible en `InformeDiaScreen` debajo de Recomendaciones.
- [ ] Click → spinner "🤖 Analizando..." → render del análisis.
- [ ] Texto Markdown render correctamente (negritas en dorado, listas, párrafos).
- [ ] Indicador visual de provider (Mock vs Claude vs Ollama).
- [ ] Si es Mock, banner discreto "Análisis generado en modo Mock".
- [ ] **Build admin en 0/0**.

## 6. Pruebas manuales

1. **Modo Mock (default):** Click botón → ver análisis con heurísticas + disclaimer "modo Mock".
2. **Modo Claude:** edita `appsettings.json`:
   ```json
   "Asistente": {
     "Provider": "Claude",
     "Claude": { "ApiKey": "sk-ant-...", "Model": "claude-haiku-4-5-20251001" }
   }
   ```
   Reinicia backend. Click botón → ver análisis real generado por Claude.
3. **Error handling:** poner API key inválida → click botón → ver fallback a Mock con mensaje de error.

## 7. Reglas de oro

- **NO** instalar librerías nuevas. `IHttpClientFactory` y `System.Text.Json` ya vienen con .NET 8.
- **NO** ejecutar dotnet run / npm run dev.
- **NO** modificar `DashboardLiveScreen.jsx` ni otras pantallas existentes salvo `InformeDiaScreen.jsx`.
- Builds en **0/0**.
- Reportar archivos modificados, builds, decisiones.

## 8. Archivos esperados

| Archivo | Acción | Aprox |
|---|---|---|
| `Settings/AsistenteSettings.cs` | NUEVO | ~30 líneas |
| `appsettings.json` | Modificar (+sección Asistente) | +12 |
| `Program.cs` | Modificar (Configure + AddHttpClient + AddSingleton) | +3 |
| `DTOs/AnalisisIaDto.cs` | NUEVO | ~20 |
| `Services/AsistenteService.cs` | NUEVO | ~180 |
| `Controllers/ReportesInterpretativosController.cs` | Modificar (+endpoint + DI) | +25 |
| `BarAvenida.Admin/src/api.js` | Modificar | +4 |
| `BarAvenida.Admin/src/screens/InformeDiaScreen.jsx` | Modificar (+sección IA + MarkdownSimple) | +120 |
| `BarAvenida.Admin/src/screens/InformeDiaScreen.css` | Modificar (+estilos id-ia-*) | +90 |

**Total: ~480 líneas, 3 archivos nuevos, sin migración EF, sin librerías nuevas.**
