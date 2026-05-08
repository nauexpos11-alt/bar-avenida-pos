using BarAvenida.API.Data;
using BarAvenida.API.Helpers;
using BarAvenida.API.Hubs;
using BarAvenida.API.Services;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting.WindowsServices;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using Serilog;
using Serilog.Events;
using System.Text;

QuestPDF.Settings.License = LicenseType.Community;

// ============================================================================
// SERILOG — Logs persistentes a archivo + consola
// ============================================================================
var logsPath = @"F:\BarAvenida\Logs";
Directory.CreateDirectory(logsPath);

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

var builder = WebApplication.CreateBuilder(args);

// Sustituir el logger default por Serilog
builder.Host.UseSerilog();

// Habilitar Servicio de Windows (no afecta cuando corre con dotnet run)
builder.Host.UseWindowsService(opts =>
{
    opts.ServiceName = "Bar Avenida API";
});

// Configurar ContentRoot para que funcione cuando corre como servicio
// (los servicios arrancan con working directory = C:\Windows\System32)
builder.Environment.ContentRootPath = AppContext.BaseDirectory;

// ============================================================================
// SERVICIOS
// ============================================================================

// Controllers + JSON config
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

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

// SignalR para tiempo real
builder.Services.AddSignalR();

// CORS - permitir conexiones desde tablets, monitor, móvil
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirTodo", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
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

// Carpeta de tickets simulados
Directory.CreateDirectory(@"F:\BarAvenida\TicketsImpresos");

// Aplicar migraciones automáticamente al arrancar
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();
    try
    {
        context.Database.Migrate();
        Log.Information("Base de datos lista");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error al migrar BD");
    }
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Bar Avenida API v1");
    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();
app.UseCors("PermitirTodo");
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
