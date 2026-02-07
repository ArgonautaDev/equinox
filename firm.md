# Guía de Firmado Digital de Equinox ERP

Este documento detalla el proceso para firmar digitalmente los instaladores de Equinox ERP para Windows, macOS y Linux.

## 🔑 Requisitos Previos

- **Clave Privada**: El archivo `private.key` debe estar en `src-tauri/keys/` o su contenido en la variable de entorno `TAURI_SIGNING_PRIVATE_KEY`.
- **Contraseña**: La clave está protegida por la contraseña `EquinoxSecure2026`. Defínela en la variable de entorno `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` para evitar prompts interactivos.
- **Tauri CLI**: Se requiere tener instalado el CLI de Tauri o usar `bun x @tauri-apps/cli`.

## 📦 Proceso de Firmado

El comando general es:
```bash
bun x @tauri-apps/cli signer sign --private-key /ruta/a/private.key /ruta/al/instalador
```

Para automatización (recomendado):
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content src-tauri\keys\private.key
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = 'EquinoxSecure2026'

bun x @tauri-apps/cli signer sign instalador.exe
```

### Windows (x64 y ARM64)
Archivos a firmar: `.exe` en `installers/`.

```bash
# x64
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_x64_Setup.exe

# ARM64
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_ARM64_Setup.exe
```

### macOS (Intel y Silicon)
Archivos a firmar: `.dmg` o `.app.tar.gz`.

```bash
# Intel (x86_64)
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_x64.dmg

# Silicon (aarch64)
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_aarch64.dmg
```

### Linux
Archivos a firmar: `.AppImage` o `.deb`.

```bash
bun x @tauri-apps/cli signer sign installers/Equinox_ERP_0.1.4_amd64.AppImage
```

## 🔄 Actualización de `latest.json`

Después de firmar, se generarán archivos `.sig` (ej: `instalador.exe.sig`).

1. Abrir cada archivo `.sig` con un editor de texto.
2. Copiar **todo el contenido** del archivo.
3. Pegarlo en el campo `signature` correspondiente en `installers/latest.json`.

```json
{
  "platforms": {
    "windows-x86_64": {
      "signature": "PEGAR_CONTENIDO_SIG_AQUI",
      "url": "..."
    },
    "linux-x86_64": {
      "signature": "PEGAR_CONTENIDO_SIG_AQUI",
      "url": "..."
    }
  }
}
```

## ⚠️ Solución de Problemas

- **Error: password for that key**: Indica que no se proporcionó la contraseña o es incorrecta. Asegúrate de configurar `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **Error: update server.e field... / incorrect updater public key**: Verifica que la clave pública en `tauri.conf.json` coincida con la pareja de tu `private.key`.
