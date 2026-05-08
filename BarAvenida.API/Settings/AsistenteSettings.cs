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
    public string ApiKey    { get; set; } = "";
    public string Model     { get; set; } = "claude-haiku-4-5-20251001";
    public int    MaxTokens { get; set; } = 800;
}

public class OllamaProviderSettings
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model   { get; set; } = "llama3.2:3b";
}
