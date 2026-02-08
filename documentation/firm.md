# Guía de Firmado de Instaladores - Equinox ERP

Este documento describe el proceso para firmar digitalmente las actualizaciones de Equinox ERP y publicar nuevas versiones.

## � Prerrequisitos

1.  **Tauri CLI**: `bun install` o `cargo install tauri-cli`
2.  **Clave Privada**: Archivo `src-tauri/keys/private.key` (Minisign).
3.  **Contraseña**: Variable de entorno `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## 🔑 Gestión de Claves

**Importante**: Si la clave privada viene de GitHub Secrets, puede estar en Base64. `tauri signer` requiere el formato de texto plano (Minisign).

### Verificar Formato
Si `private.key` es una sola línea larga (`dW50...`), está en Base64. Debes decodificarla:

```powershell
# PowerShell
$c = Get-Content src-tauri\keys\private.key
$b = [System.Convert]::FromBase64String($c)
$t = [System.Text.Encoding]::UTF8.GetString($b)
Set-Content src-tauri\keys\private.decoded.key $t
```

Usa esta variable para firmar sin crear archivos temporales.

---

## 🪟 Windows (x64 / ARM64)

### 1. Construir
Genera el instalador estándar de Tauri (NSIS):
```bash
bun run tauri build
```
El instalador se generará en: `src-tauri/target/release/bundle/nsis/`

### 2. Firmar
# Cargar clave en variable de entorno
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content src-tauri\keys\private.key
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = 'TU_CONTRASEÑA'

# Copiar a installers/ (opcional, para organizar)
cp "src-tauri/target/release/bundle/nsis/Equinox ERP_0.1.4_x64-setup.exe" installers/Equinox_ERP_0.1.4_x64_Setup.exe

# Firmar (La CLI usará la variable de entorno automáticamente si no se pasa --private-key)
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_x64_Setup.exe

### 3. Verificar Firma
El comando generará archivos `.sig` (ej. `Equinox_ERP_0.1.4_x64_Setup.exe.sig`).
Abre estos archivos para obtener el string de firma necesario para `latest.json`.

---

## 🍎 macOS (Silicon / Intel)

Requiere una Mac para firmar `.dmg` o `.app`.

```bash
# Firmar Apple Silicon (aarch64)
bun x @tauri-apps/cli signer sign --private-key src-tauri/keys/private.key installers/Equinox_ERP_0.1.4_aarch64.dmg

# Firmar Intel (x86_64)
bun x @tauri-apps/cli signer sign --private-key src-tauri/keys/private.key installers/Equinox_ERP_0.1.4_x64.dmg
```

**Nota**: macOS también requiere **Notarización** de Apple si se distribuye fuera de la App Store. Esto se configura en `tauri.conf.json` bajo `bundle.macOS.signingIdentity`.

---

## 🐧 Linux (AppImage / Deb)

```bash
bun x @tauri-apps/cli signer sign --private-key src-tauri/keys/private.key installers/equinox-erp_0.1.4_amd64.AppImage
```

---

## � Publicar Actualización (`latest.json`)

Edita `installers/latest.json` con las nuevas versiones y firmas:

```json
{
  "version": "0.1.4",
  "notes": "Notas de la versión...",
  "pub_date": "2026-02-07T18:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "PEGAR_CONTENIDO_DE_SIG_AQUI",
      "url": "https://github.com/.../Equinox_ERP_0.1.4_x64_Setup.exe"
    },
    "windows-aarch64": {
      "signature": "PEGAR_CONTENIDO_DE_SIG_AQUI",
      "url": "https://github.com/.../Equinox_ERP_0.1.4_ARM64_Setup.exe"
    }
    // Agregar darwin-x86_64, darwin-aarch64, linux-x86_64 igual
  }
}
```

Sube los archivos `.exe` y `latest.json` a GitHub Releases.
