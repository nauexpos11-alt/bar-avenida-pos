namespace BarAvenida.API.Helpers;

/// <summary>
/// Paths del sistema con fallback automatico:
///   - Si F:\ existe, usa F:\BarAvenida\ (configuracion productiva del bar)
///   - Si F:\ NO existe, usa C:\BarAvenida-data\ (fallback para PC sin drive F:)
/// </summary>
public static class PathHelper
{
    private static readonly string _dataRoot =
        Directory.Exists("F:\\") ? @"F:\BarAvenida" : @"C:\BarAvenida-data";

    public static string DataRoot => _dataRoot;
    public static string TicketsImpresos => Path.Combine(_dataRoot, "TicketsImpresos");
    public static string Backups => Path.Combine(_dataRoot, "Backups");
    public static string Logs => Path.Combine(_dataRoot, "Logs");

    static PathHelper()
    {
        // Asegurar que existan los directorios al primer acceso
        try { Directory.CreateDirectory(TicketsImpresos); } catch { }
        try { Directory.CreateDirectory(Backups); } catch { }
        try { Directory.CreateDirectory(Logs); } catch { }
    }
}
