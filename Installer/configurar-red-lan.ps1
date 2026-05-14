# Configurar perfil de red como Privada para que tablets/celulares vean al servidor.
# Lo ejecuta el instalador Inno Setup en post-install (como Admin).
# v1.10.3
$ErrorActionPreference = "SilentlyContinue"

try {
    $profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue
    if ($profiles) {
        foreach ($p in $profiles) {
            if ($p.NetworkCategory -eq 'Public') {
                Set-NetConnectionProfile -InterfaceIndex $p.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue
            }
        }
    }
    exit 0
} catch {
    exit 0
}
