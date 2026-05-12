namespace BarAvenida.API.Services;

/// <summary>
/// Valida fortaleza mínima de un PIN.
///   - Mesera/Barman: 4 dígitos
///   - Admin:         6 dígitos
/// Bloquea PINs obvios (blacklist) y secuencias ascendentes/descendentes.
/// </summary>
public static class PinValidator
{
    private static readonly HashSet<string> Blacklist = new()
    {
        // 4 dígitos
        "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
        "1234","4321","1212","0123","9876","6789","2580",
        // 6 dígitos
        "000000","111111","123456","654321","112233","121212"
    };

    public static (bool ok, string? error) Validar(string pin, bool esAdmin = false)
    {
        if (string.IsNullOrWhiteSpace(pin))
            return (false, "PIN requerido");

        var len = esAdmin ? 6 : 4;
        if (pin.Length != len)
            return (false, $"PIN debe tener {len} digitos");

        if (!pin.All(char.IsDigit))
            return (false, "PIN solo puede tener numeros");

        if (Blacklist.Contains(pin))
            return (false, "PIN demasiado obvio. Usa otro mas seguro.");

        if (EsSecuencia(pin))
            return (false, "PIN demasiado obvio (es una secuencia)");

        return (true, null);
    }

    private static bool EsSecuencia(string pin)
    {
        // ascendente o descendente continuo (1234, 6789, 4321, 9876...)
        var asc = true;
        var desc = true;
        for (int i = 1; i < pin.Length; i++)
        {
            if (pin[i] != pin[i - 1] + 1) asc = false;
            if (pin[i] != pin[i - 1] - 1) desc = false;
        }
        return asc || desc;
    }
}
