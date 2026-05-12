using BarAvenida.API.Data;
using BarAvenida.API.Helpers;
using BarAvenida.API.Hubs;
using BarAvenida.API.Services;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting.WindowsServices;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using Serilog;
using Serilog.Events;
using System.Net;
using System.Text;
using System.Threading.RateLimiting;

QuestPDF.Settings.License = LicenseType.Community;

// ============================================================================
// SERILOG — Logs persistentes a archivo + consola
// Fallback automatico: si F:\ no existe, usa C:\BarAvenida-data\
// ============================================================================
var dataRoot = Directory.Exists("F:\\") ? @"F:\BarAvenida" : @"C:\BarAvenida-data";
var logsPath = Path.Combine(dataRoot, "Logs");
try { Directory.CreateDirectory(logsPath); } catch { /* el servicio igual debe arrancar */ }

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: Path.Combine(logsPath, "baravenida-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        fileSizeLimitBytes: 50_000_000,
        rollOnFileSizeLimit: true,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

// IMPORTANTE: ContentRootPath se debe establecer ANTES de CreateBuilder
// para que appsettings.json se cargue desde el directorio del .exe,
// no desde el working directory (que puede ser C:\Windows\System32 cuando corre como servicio).
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});

// Sustituir el logger default por Serilog
builder.Host.UseSerilog();

// Habilitar Servicio de Windows
builder.Host.UseWindowsService(opts =>
{
    opts.ServiceName = "Bar Avenida API";
});

// ============================================================================
// SEGURIDAD v1.9.0 — Kestrel HTTPS opcional (Round 2)
//   - HTTP siempre en :7000 (LAN local + loopback)
//   - HTTPS en :7443 solo si Https:PfxPath está configurado y el archivo existe
// ============================================================================
builder.WebHost.ConfigureKestrel(options =>
{
    // HTTP :7000 — escucha en TODAS las IPs (IPv4 + IPv6) en cualquier PC.
    // ListenAnyIP bindea a IPv4 0.0.0.0 + IPv6 :: simultaneamente sin doble-bind.
    // Asi el backend responde a localhost (que en Win11 resuelve a ::1), a 127.0.0.1,
    // a 192.168.100.10 (si la PC la tiene), y a cualquier otra IP local.
    options.ListenAnyIP(7000);

    var pfxPath = builder.Configuration["Https:PfxPath"];
    var pfxPwd  = builder.Configuration["Https:PfxPassword"];
    if (!string.IsNullOrWhiteSpace(pfxPath) && File.Exists(pfxPath))
    {
        try
        {
            options.ListenAnyIP(7443, lo => lo.UseHttps(pfxPath, pfxPwd));
        }
        catch (Exception ex) { Log.Warning(ex, "No se pudo iniciar HTTPS"); }
    }
    else
    {
        Log.Information("HTTPS deshabilitado — Https:PfxPath no configurado o archivo no existe ({Path})", pfxPath ?? "(null)");
    }
});

// ============================================================================
// SERVICIOS
// ============================================================================

// Controllers + JSON config
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// HttpContextAccessor — necesario para AuditoriaService
builder.Services.AddHttpContextAccessor();

// Entity Framework con SQL Server
builder.Services.AddDbContext<BarAvenidaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SqlServer")));

// Configuración de Caja Inteligente (PROMPT C)
builder.Services.Configure<CajaSettings>(builder.Configuration.GetSection("Caja"));

// Asistente IA (PROMPT IA.1)
builder.Services.Configure<AsistenteSettings>(builder.Configuration.GetSection("Asistente"));
builder.Services.AddHttpClient();
builder.Services.AddSingleton<AsistenteService>();

// PROMPT C.2 — Detector de alertas activas en background
builder.Services.AddHostedService<DetectorAlertasCaja>();

// JWT Helper
builder.Services.AddSingleton<JwtHelper>();

// Simulated printing (must register before EscPosService which depends on it)
builder.Services.AddSingleton<ITicketSimuladoService, TicketSimuladoService>();

// ESC/POS printing
builder.Services.AddSingleton<EscPosService>();
builder.Services.AddScoped<TicketService>();

// SEGURIDAD v1.9.0 — Servicio de auditoría
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();

// SignalR para tiempo real
builder.Services.AddSignalR();

// ============================================================================
// CORS — Round 2 estricto: lista blanca de orígenes LAN + dev (v1.9.0)
// ============================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("BarAvenidaLAN", policy => policy
        .WithOrigins(
            "http://localhost:7000",  "http://localhost:7443",
            "https://localhost:7000", "https://localhost:7443",
            "http://192.168.100.10:7000",  "https://192.168.100.10:7443",
            "http://localhost:3001", "http://localhost:3002", "http://localhost:3003",
            "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});

// ============================================================================
// RATE LIMITING — Round 1 (v1.9.0)
//   - Global:  100 req/min por IP
//   - "Login": 10 req/min por IP (aplicado en AuthController.Login)
// ============================================================================
builder.Services.AddRateLimiter(opts =>
{
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    opts.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http =>
    {
        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window      = TimeSpan.FromMinutes(1),
            QueueLimit  = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        });
    });

    opts.AddPolicy("Login", http =>
    {
        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window      = TimeSpan.FromMinutes(1),
            QueueLimit  = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        });
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "BarAvenida_LlaveSuperSecretaParaJWT_2026_MinimoCaracteres";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BarAvenida";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // Permitir token JWT en SignalR (vía query string)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/barhub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Swagger con JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Bar Avenida API",
        Version = "v1",
        Description = "API completa para sistema POS, KDS, inventario y reportes del Bar Avenida"
    });

    // Soporte JWT en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Pega el token JWT así: Bearer {tu_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ============================================================================
// PIPELINE
// ============================================================================

// Carpeta de tickets simulados (con fallback a C:\BarAvenida-data si F: no existe)
try { Directory.CreateDirectory(BarAvenida.API.Helpers.PathHelper.TicketsImpresos); } catch { }

// Aplicar migraciones automáticamente al arrancar
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();
    try
    {
        context.Database.Migrate();

        // SEGURIDAD v1.9.0 — aplicar esquema Round 1 (Usuario lockout + EventosAuditoria)
        await MigracionSeguridadRound1.AplicarAsync(
            context,
            scope.ServiceProvider.GetService<ILogger<Program>>());

        Log.Information("Base de datos lista");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error al migrar BD");
    }
}

// ============================================================================
// SECURITY HEADERS (v1.9.0 Round 1)
// ============================================================================
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"]        = "DENY";
    ctx.Response.Headers["Referrer-Policy"]        = "no-referrer";
    ctx.Response.Headers["Permissions-Policy"]     = "camera=(), microphone=(), geolocation=()";
    await next();
});

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Bar Avenida API v1");
    c.RoutePrefix = "swagger";
});

// NO se usa UseHttpsRedirection: las apps Electron usan HTTP :7000 por compatibilidad
// y para evitar problemas de cert self-signed. Quien quiera HTTPS va directo al :7443.

// CORS estricto v1.9.0
app.UseCors("BarAvenidaLAN");

// Rate limiter (debe ir antes de Authorization para limitar requests sin auth)
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// ── Helper: sirve SPA desde una carpeta wwwroot/{prefix} ─────────────────────
static IResult ServeSpa(string root, string slug)
{
    var filePath = Path.Combine(root, slug.Replace('/', Path.DirectorySeparatorChar));
    if (File.Exists(filePath))
    {
        var mime = Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".js"   => "application/javascript",
            ".css"  => "text/css",
            ".svg"  => "image/svg+xml",
            ".png"  => "image/png",
            ".ico"  => "image/x-icon",
            ".json" => "application/json",
            _       => "application/octet-stream"
        };
        return Results.File(filePath, mime);
    }
    return Results.File(Path.Combine(root, "index.html"), "text/html");
}

// ── Admin SPA (wwwroot/admin) ────────────────────────────────────────────────
var adminRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "admin"));

app.UseStaticFiles();

app.MapGet("/admin/{**slug}", (HttpContext ctx) =>
    ServeSpa(adminRoot, ctx.Request.RouteValues["slug"]?.ToString() ?? "")
).ExcludeFromDescription();

// ── KDS SPA (wwwroot/kds) ────────────────────────────────────────────────────
var kdsRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "kds"));

app.MapGet("/kds", () =>
    Results.File(Path.Combine(kdsRoot, "index.html"), "text/html")
).ExcludeFromDescription();

app.MapGet("/kds/{**slug}", (HttpContext ctx) =>
    ServeSpa(kdsRoot, ctx.Request.RouteValues["slug"]?.ToString() ?? "")
).ExcludeFromDescription();

// ── Tablet PWA (wwwroot/tablet) ──────────────────────────────────────────────
var tabletRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "tablet"));

app.MapGet("/tablet", () =>
    Results.File(Path.Combine(tabletRoot, "index.html"), "text/html")
).ExcludeFromDescription();

app.MapGet("/tablet/{**slug}", (HttpContext ctx) =>
    ServeSpa(tabletRoot, ctx.Request.RouteValues["slug"]?.ToString() ?? "")
).ExcludeFromDescription();

app.MapControllers();
app.MapHub<BarHub>("/barhub");

Log.Information("================================================================");
Log.Information("Bar Avenida API arrancando — modo: {Modo}",
    WindowsServiceHelpers.IsWindowsService() ? "Windows Service" : "Console");
Log.Information("Swagger: http://localhost:7000/swagger");
Log.Information("KDS:     http://localhost:7000/kds/");
Log.Information("SignalR: /barhub");
Log.Information("================================================================");

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "El backend se cayó por una excepción no manejada");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
