# Bar Avenida POS

Sistema de punto de venta multi-app para **Bar Avenida** — cantina tradicional mexicana en Saltillo, Coahuila.

## Stack

- **Backend:** ASP.NET Core .NET 8 + Entity Framework Core + SQL Server LocalDB + SignalR
- **Tablet meseras:** React 19 + Vite (PWA instalable con offline queue en IndexedDB)
- **Admin:** React 19 + Vite + Electron (instalador `.exe` con auto-detect de IP del backend)
- **KDS Barra:** React 19 + Vite + Electron (instalador `.exe`)
- **Tema:** dorado `#f0c842` + negro `#0a0a0a`
- **IA:** Anthropic Claude API (haiku-4-5) para análisis interpretativo

## Arquitectura

```
PC central del bar
├── Backend ASP.NET — Servicio Windows "BarAvenidaAPI"
├── SQL Server LocalDB + backups horarios automáticos
├── Admin Electron instalado
└── Impresora térmica GHIA GTP801 USB + cajón RJ-11

WiFi local 192.168.100.x
├── Tablet/celulares meseras  → PWA en /tablet/
├── KDS barra                  → Electron .exe instalable
└── Otras PCs admin            → Electron .exe instalable
```

## Estructura del repo

```
F:\BarAvenida\
├── BarAvenida.API\           Backend .NET 8
├── BarAvenida.Tablet\        Tablet meseras (PWA)
├── BarAvenida.Admin\         Admin React+Vite
├── BarAvenida.KDS\           KDS React+Vite
├── BarAvenida.Desktop\       Wrapper Electron del Admin
├── BarAvenida.KDS.Desktop\   Wrapper Electron del KDS
├── Backups\                  Scripts PowerShell (los .bak no van a git)
├── Scripts\                  Scripts de deploy y mantenimiento
├── Installer\                Inno Setup del backend installer
├── specs\                    Specs de cada feature implementada
├── CLAUDE.md                 Memoria del proyecto para Claude
└── README.md                 Este archivo
```

## Features implementadas

- ✅ POS completo: mesas, captura, cobro (efectivo/tarjeta/mixto), tickets ESC/POS, apertura cajón
- ✅ Solicitudes de cancelación: mesera solicita, admin aprueba/rechaza
- ✅ Caja inteligente: sugerencia de fondo, alertas activas en tiempo real, cierre asistido
- ✅ Dashboard vivo + reportes interpretativos con narrativa
- ✅ KDS auto-pilot, smart suggestions, anti-fuga
- ✅ Análisis IA del Informe del Día con Claude API real
- ✅ Backend como Servicio Windows + Serilog persistente
- ✅ Tablet PWA con offline queue (IndexedDB)
- ✅ Instaladores Electron para Admin y KDS con auto-detect del backend

## Operación

### Estado del backend

```powershell
Get-Service BarAvenidaAPI    # debe estar Running
Invoke-WebRequest http://localhost:7000/admin/ -UseBasicParsing | Select StatusCode
Get-Content F:\BarAvenida\Logs\baravenida-*.log -Tail 30 -Encoding UTF8
```

### URLs

- Admin web:    `http://localhost:7000/admin/`
- KDS web:       `http://localhost:7000/kds`
- Tablet PWA:    `http://localhost:7000/tablet/`

### Backups

Tarea programada `BarAvenida_BackupHorario` corre cada hora. Genera `.bak` en `F:\BarAvenida\Backups\` con retención de 7 días.

```powershell
# Backup manual
F:\BarAvenida\Backups\backup-baravenida.ps1

# Listar backups disponibles
F:\BarAvenida\Backups\restore-baravenida.ps1

# Restaurar uno específico
F:\BarAvenida\Backups\restore-baravenida.ps1 -Backup "BarAvenida_YYYYMMDD_HHMMSS.bak"
```

## Deploy

```powershell
# Backend (recompila + reinstala servicio)
F:\BarAvenida\Scripts\publish-y-reinstalar.ps1

# Tablet PWA (build + copia a wwwroot/tablet + republish backend)
F:\BarAvenida\Scripts\deploy-tablet.ps1

# KDS web (build + copia a wwwroot/kds + republish backend)
F:\BarAvenida\Scripts\deploy-kds.ps1
```

Todos requieren PowerShell como **administrador** (manejan el servicio Windows).

## Roadmap

Ver `CLAUDE.md` sección "Roadmap" para detalles.

- ⏳ Fase 4: instalador todo-en-uno del backend, distribución profesional
- ⏳ Fase 5: WhatsApp del bar, loyalty, Pidemusic
- ⏳ IA.2: chat asistente flotante en Admin

## Credenciales por defecto

| Usuario          | Código  | PIN    | Rol     |
|------------------|---------|--------|---------|
| Coronado (admin) | `ADMIN` | `1234` | Admin   |
| ABBY GZZ         | `23`    | `0001` | Mesera  |
| IRIS             | `28`    | `0001` | Mesera  |
| Barman 1         | `BAR1`  | `0002` | Barman  |

⚠ Cambiar PINs antes de operación real.

## Licencia

Privado — uso exclusivo de Bar Avenida.
