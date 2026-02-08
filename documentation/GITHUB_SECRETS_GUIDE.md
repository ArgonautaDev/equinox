# 🔐 Guía Paso a Paso: Configurar GitHub Secrets para Tauri

## 📋 Valores que Necesitas Copiar

### Secret #1: `TAURI_SIGNING_PRIVATE_KEY`
```
untrusted comment: rsign encrypted secret key
RWRTYTMxamhhOTI2S0FLdG80QW5wSHhIQStLdVdEOHF0N1MvRU1TZEtvL2lSdlRJK2w0bm5JZW5Sc0FobE5OMjZWYVpneDFmdkRWbzZ2K3c9Cg==
```

### Secret #2: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
```
EquinoxSecure2026
```

---

## 🚀 Pasos Detallados en GitHub

### Paso 1: Ir al Repositorio
1. Abre tu navegador
2. Ve a: `https://github.com/ArgonautaDev/equinox-ruby`
3. Asegúrate de estar logueado

### Paso 2: Acceder a Settings
1. En la parte superior de la página del repositorio, haz clic en la pestaña **Settings** (⚙️)
2. Si no ves "Settings", es porque no tienes permisos de administrador en el repo

### Paso 3: Ir a Secrets and Variables
1. En el menú lateral **izquierdo**, desplázate hacia abajo
2. Busca la sección **"Security"**
3. Dentro de Security, haz clic en **"Secrets and variables"**
4. Luego haz clic en **"Actions"**

### Paso 4: Crear el Primer Secret (Clave Privada)
1. Haz clic en el botón verde **"New repository secret"** (arriba a la derecha)
2. En el campo **"Name"**, escribe exactamente:
   ```
   TAURI_SIGNING_PRIVATE_KEY
   ```
3. En el campo **"Secret"** (la caja grande), copia y pega TODO lo siguiente:
   ```
   untrusted comment: rsign encrypted secret key
   RWRTYTMxamhhOTI2S0FLdG80QW5wSHhIQStLdVdEOHF0N1MvRU1TZEtvL2lSdlRJK2w0bm5JZW5Sc0FobE5OMjZWYVpneDFmdkRWbzZ2K3c9Cg==
   ```
   ⚠️ **IMPORTANTE**: Debe incluir ambas líneas (el comentario y la clave)
4. Haz clic en **"Add secret"**
5. ✅ Verás el mensaje "Secret TAURI_SIGNING_PRIVATE_KEY was added"

### Paso 5: Crear el Segundo Secret (Contraseña)
1. Haz clic nuevamente en **"New repository secret"**
2. En el campo **"Name"**, escribe exactamente:
   ```
   TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   ```
3. En el campo **"Secret"**, escribe:
   ```
   EquinoxSecure2026
   ```
4. Haz clic en **"Add secret"**
5. ✅ Verás el mensaje "Secret TAURI_SIGNING_PRIVATE_KEY_PASSWORD was added"

### Paso 6: Verificar
1. En la página de "Actions secrets", deberías ver **2 secrets listados**:
   - `TAURI_SIGNING_PRIVATE_KEY` (Updated now)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (Updated now)
2. No podrás ver sus valores (GitHub los oculta por seguridad)

---

## ✅ Verificación Final

Una vez configurados los secrets:

1. **Pushea el código** con el workflow actualizado:
   ```bash
   git push origin windows-building
   ```

2. **Crea el tag** `v0.1.5`:
   ```bash
   git tag v0.1.5
   git push origin v0.1.5
   ```

3. **GitHub Actions** se ejecutará automáticamente
4. Ve a la pestaña **"Actions"** en GitHub para ver el progreso
5. Si todo está correcto, verás:
   - ✅ Build exitoso
   - ✅ Archivos firmados (.exe, .dmg, .AppImage + sus .sig)
   - ✅ Release creado con todos los archivos adjuntos

---

## 🆘 Solución de Problemas

### Error: "Wrong password for that key"
- Verifica que copiaste la contraseña exactamente: `EquinoxSecure2026`
- Asegúrate de que no tiene espacios al inicio o final

### Error: "Failed to decode secret key"
- Asegúrate de copiar **AMBAS LÍNEAS** de la clave privada:
  - La línea del comentario (`untrusted comment:...`)
  - La línea de la clave (empieza con `RWR...`)

### No veo la pestaña "Settings"
- Contacta al dueño del repositorio para que te dé permisos de administrador

---

## 📝 Notas de Seguridad

- ✅ Los secrets están **cifrados por GitHub**
- ✅ Solo son accesibles durante los workflows autorizados
- ✅ No se exponen en los logs
- ⚠️ **NUNCA** subas estos valores al código del repositorio
- ✅ El `.gitignore` ya excluye `src-tauri/keys/`
