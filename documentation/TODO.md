# TODO: Tareas Pendientes - Firmar Instaladores

## ⚠️ Estado Actual

✅ **Completado en PC ARM64**:
- Instaladores creados para ARM64 y x64 mediante cross-compilation
- Scripts de Inno Setup configurados
- `latest.json` creado (sin firmas)
- Instaladores listos: 
  - `installers/Equinox_ERP_0.1.4_ARM64_Setup.exe` (7.7 MB)
  - `installers/Equinox_ERP_0.1.4_x64_Setup.exe` (7.9 MB)

❌ **Pendiente - Requiere PC Windows x86**:
- Firmar ambos instaladores
- Actualizar `latest.json` con firmas
- Publicar release completo en GitHub

---

## 📋 Tareas Pendientes

### 1. Transferir Archivos a PC x86

Copiar estos archivos/carpetas desde PC ARM64 a PC x86:

```
equinox-main/
├── installers/
│   ├── Equinox_ERP_0.1.4_ARM64_Setup.exe
│   ├── Equinox_ERP_0.1.4_x64_Setup.exe
│   └── latest.json
├── installer-arm64.iss
├── installer-x64.iss
└── src-tauri/
    ├── tauri.conf.json
    └── keys/
        └── private.key (CLAVE PRIVADA - NO SUBIR A GIT)
```

**Método recomendado**: 
- Commit y push los cambios a un branch
- Pull desde PC x86
- Copiar `private.key` manualmente (NO hacer commit de esta)

### 2. En PC x86: Firmar Instaladores

#### Opción A: Usando Variable de Entorno (Recomendado)

```cmd
cd equinox-main

set TAURI_SIGNING_PRIVATE_KEY=dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YWlPMEJtZHJYenlmTTY2dkdFTE1WWVU5UTV1VUdHV3VYMnQ4UVRQUXRSVUFBQkFBQUFBQUFBQUFBQUlBQUFBQWNJemU5M2FjTlE1T09la1ZoYUhMbHUzbWdYN1NXdjNCMk9iMnNSZW5TNGV0YWpMMEdXeFBNNnZpNkF3N1AyTzhobVN0TEppYTcxWTRJUHhtNDNGRHRUdTJ2TWpaNDFEbFh5aGxNT29mUWs2Vms5Witna0g4VTUwNHE0bXlqZTFpU2xKUGFQZWo0ZFE9Cg==

bun x @tauri-apps/cli signer sign installers\Equinox_ERP_0.1.4_ARM64_Setup.exe
bun x @tauri-apps/cli signer sign installers\Equinox_ERP_0.1.4_x64_Setup.exe
```

#### Opción B: Usando Archivo de Clave

```cmd
cd equinox-main

bun x @tauri-apps/cli signer sign --private-key src-tauri\keys\private.key installers\Equinox_ERP_0.1.4_ARM64_Setup.exe
bun x @tauri-apps/cli signer sign --private-key src-tauri\keys\private.key installers\Equinox_ERP_0.1.4_x64_Setup.exe
```

**Resultado esperado**:
```
installers/
├── Equinox_ERP_0.1.4_ARM64_Setup.exe.sig  ← NUEVO
└── Equinox_ERP_0.1.4_x64_Setup.exe.sig    ← NUEVO
```

### 3. Actualizar latest.json con Firmas

```cmd
REM Leer firma ARM64
type installers\Equinox_ERP_0.1.4_ARM64_Setup.exe.sig

REM Leer firma x64
type installers\Equinox_ERP_0.1.4_x64_Setup.exe.sig
```

Editar `installers/latest.json`:
1. Copiar el contenido del archivo `.sig` de ARM64
2. Reemplazar `PLACEHOLDER_FIRMA_ARM64_AQUI` con ese contenido
3. Copiar el contenido del archivo `.sig` de x64
4. Reemplazar `PLACEHOLDER_FIRMA_X64_AQUI` con ese contenido

**Formato**:
```json
{
  "platforms": {
    "windows-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1l...",  ← Pegar firma ARM64
      "url": "..."
    },
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1l...",  ← Pegar firma x64
      "url": "..."
    }
  }
}
```

### 4. Crear Release en GitHub

#### 4.1. Crear Tag de Git

```cmd
git tag v0.1.4
git push origin v0.1.4
```

#### 4.2. Crear Release en GitHub Web

1. Ir a: https://github.com/ArgonautaDev/equinox-ruby/releases
2. Click "Create a new release"
3. Seleccionar tag: `v0.1.4`
4. Título: `Equinox ERP v0.1.4`
5. Descripción: (copiar del `latest.json` o personalizar)

#### 4.3. Subir Archivos

Arrastrar estos 5 archivos:
- ✅ `Equinox_ERP_0.1.4_ARM64_Setup.exe`
- ✅ `Equinox_ERP_0.1.4_ARM64_Setup.exe.sig`
- ✅ `Equinox_ERP_0.1.4_x64_Setup.exe`
- ✅ `Equinox_ERP_0.1.4_x64_Setup.exe.sig`
- ✅ `latest.json`

#### 4.4. Publicar

- ✅ Marcar "Set as latest release"
- ✅ Click "Publish release"

---

## 🔄 Release Temporal SIN Firmas (Ahora en PC ARM64)

Si quieres publicar AHORA sin esperar a tener las firmas:

### Opción: Release sin Auto-Update

1. **Crear tag**:
   ```cmd
   git tag v0.1.4-unsigned
   git push origin v0.1.4-unsigned
   ```

2. **Crear release en GitHub**:
   - Tag: `v0.1.4-unsigned`
   - Título: `Equinox ERP v0.1.4 (Unsigned - Manual Install Only)`
   - Descripción:
     ```markdown
     ⚠️ **Nota**: Esta versión NO incluye firmas digitales.
     - Auto-update NO funcionará
     - Instalación manual disponible
     - Versión firmada será publicada próximamente
     
     ## Descargas
     - Windows ARM64: Equinox_ERP_0.1.4_ARM64_Setup.exe
     - Windows x64: Equinox_ERP_0.1.4_x64_Setup.exe
     ```

3. **Subir SOLO los .exe** (sin .sig ni latest.json):
   - `Equinox_ERP_0.1.4_ARM64_Setup.exe`
   - `Equinox_ERP_0.1.4_x64_Setup.exe`

4. **Marcar como Pre-release** (no como latest)

5. **Publicar release firmado completo después** cuando tengas las firmas

---

## 📌 Notas Importantes

### Seguridad de la Clave Privada

⚠️ **NUNCA hacer commit de `private.key`**

Agregar a `.gitignore`:
```
# Claves privadas Tauri
src-tauri/keys/*.key
private.key
*.key
```

### Verificar Firmas

Después de firmar, verificar que funcionan:
```cmd
bun x @tauri-apps/cli signer verify installers\Equinox_ERP_0.1.4_ARM64_Setup.exe --signature installers\Equinox_ERP_0.1.4_ARM64_Setup.exe.sig
```

### Auto-Update en tauri.conf.json

Verificar que el endpoint esté correcto:
```json
"updater": {
  "active": true,
  "endpoints": [
    "https://github.com/ArgonautaDev/equinox-ruby/releases/latest/download/latest.json"
  ],
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEE3REYyNjhCRjBGRDBBOEUKUldRZWJGL2RST2hMemFxbittT2l5Y0tQTG1sUG05ZTdjMzlYZHo0ZFRTUlZtMHJtcGxNMTZGNGxXOXEK"
}
```

---

## ✅ Checklist Final

Antes de publicar release completo:

- [ ] Instaladores firmados en PC x86
- [ ] Archivos `.sig` generados
- [ ] `latest.json` actualizado con firmas
- [ ] Tag `v0.1.4` creado
- [ ] Release en GitHub creado
- [ ] 5 archivos subidos (2 .exe + 2 .sig + 1 .json)
- [ ] Release marcado como "latest"
- [ ] Clave privada NO está en repositorio
- [ ] Auto-update testeado (opcional pero recomendado)

---

## 🚀 Después del Release

### Testing de Auto-Update

1. Instalar v0.1.4 desde installer
2. Crear versión v0.1.5 de prueba
3. Firmar y publicar v0.1.5
4. Ejecutar app v0.1.4
5. Verificar que detecta actualización
6. Aceptar actualización
7. Verificar que descarga e instala v0.1.5

### Próximas Versiones

Para futuras versiones:
1. Incrementar versión en `package.json` y `tauri.conf.json`
2. Compilar para ambas arquitecturas
3. Crear instaladores con Inno Setup
4. Firmar en PC x86
5. Actualizar `latest.json`
6. Crear tag y release

---

## 📞 Recursos

- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater)
- [Tauri Signer Docs](https://tauri.app/v1/guides/distribution/sign)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
