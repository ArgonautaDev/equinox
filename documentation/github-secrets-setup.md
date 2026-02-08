# Configuración de Secretos de GitHub para Tauri

## Secretos Requeridos

Para que el workflow de GitHub Actions pueda firmar los instaladores automáticamente, necesitas configurar **2 secretos**:

---

## 1. `TAURI_SIGNING_PRIVATE_KEY`

**Descripción:** Clave privada para firmar los artefactos del updater de Tauri.

### Formato Correcto

El secreto debe contener **exactamente** el contenido del archivo `src-tauri/keys/updater` (2 líneas):

```
untrusted comment: rsign encrypted secret key
RWRTYTMxamhhOTI2S0FLdG80QW5wSHhIQStLdVdEOHF0N1MvRU1TZEtvL2lSdlRJK2w0bm5JZW5Sc0FobE5OMjZWYVpneDFmdkRWbzZ2K3c9Cg==
```

> ⚠️ **IMPORTANTE:** Ambas líneas son obligatorias. La primera línea con `untrusted comment:` es esencial para que Tauri pueda decodificar la clave correctamente.

### Cómo Obtener el Valor

```bash
cat src-tauri/keys/updater
```

Copia **todo** el output (ambas líneas).

---

## 2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

**Descripción:** Contraseña para descifrar la clave privada.

**Valor:**
```
EquinoxSecure2026
```

Esta es la contraseña que se usó al generar la clave con `tauri signer generate`.

---

## Pasos para Configurar en GitHub

### Acceder a la Configuración

1. Ve al repositorio: https://github.com/ArgonautaDev/equinox-ruby
2. Click en **Settings** (pestaña superior)
3. En el menú lateral: **Secrets and variables** → **Actions**

### Agregar/Actualizar `TAURI_SIGNING_PRIVATE_KEY`

1. Si el secreto ya existe:
   - Click en el secreto `TAURI_SIGNING_PRIVATE_KEY`
   - Click en **Update**
   
2. Si no existe:
   - Click en **New repository secret**
   - **Name:** `TAURI_SIGNING_PRIVATE_KEY`

3. En **Value:**
   - Pega el contenido completo del archivo `src-tauri/keys/updater`
   - Debe incluir ambas líneas (comentario + clave)

4. Click en **Add secret** o **Update secret**

### Agregar/Actualizar `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

1. Click en **New repository secret** (o actualiza si ya existe)
2. **Name:** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. **Value:** `EquinoxSecure2026`
4. Click en **Add secret** o **Update secret**

---

## Verificación

Después de configurar los secretos correctamente:

1. **El workflow validará automáticamente el formato** de la clave privada
2. Si el formato es incorrecto, el workflow fallará con un mensaje claro
3. Si todo está correcto, el build continuará y firmará los instaladores

### Señales de Éxito

En el log del workflow verás:
```
✅ Formato de clave válido
```

---

## Notas de Seguridad

- ✅ **NO** subas el archivo `src-tauri/keys/updater` al repositorio
- ✅ El `.gitignore` ya está configurado para excluir `src-tauri/keys/`
- ✅ Los secretos de GitHub están cifrados y son seguros
- ✅ Solo los workflows autorizados pueden acceder a ellos
- ✅ Los secretos no se pueden ver después de guardarlos

---

## Solución de Problemas

### Error: "Missing comment in secret key"

**Causa:** El secreto `TAURI_SIGNING_PRIVATE_KEY` no incluye la primera línea con `untrusted comment:`

**Solución:** 
1. Actualiza el secreto con el contenido completo del archivo (2 líneas)
2. Asegúrate de copiar ambas líneas del archivo `src-tauri/keys/updater`

### Error: "incorrect updater private key password"

**Causa:** El secreto `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` es incorrecto

**Solución:**
1. Verifica que la contraseña sea exactamente: `EquinoxSecure2026`
2. Sin espacios adicionales al inicio o al final
