#!/bin/bash

# ==========================================
# EQUINOX ERP - macOS Local Build Helper
# ==========================================

# 1. Configurar la clave privada (Base64 decodificada)
# Esta es la clave correcta para Tauri (Single Base64)
# Extraída de la depuración previa.
export TAURI_SIGNING_PRIVATE_KEY="dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YWlPMEJtZHJYenlmTTY2dkdFTE1WWVU5UTV1VUdHV3VYMnQ4UVRQUXRSVUFBQkFBQUFBQUFBQUFBQUlBQUFBQWNJemU5M2FjTlE1T09la1ZoYUhMbHUzbWdYN1NXdjNCMk9iMnNSZW5TNGV0YWpMMEdXeFBNNnZpNkF3N1AyTzhobVN0TEppYTcxWTRJUHhtNDNGRHRUdTJ2TWpaNDFEbFh5aGxNT29mUWs2Vms5Witna0g4VTUwNHE0bXlqZTFpU2xKUGFQZWo0ZFE9Cg=="

echo "🔑 Clave de firma configurada."

# 2. Solicitar contraseña si no está configurada
if [ -z "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" ]; then
  echo ""
  echo "🔒 Por favor ingresa la contraseña de la clave privada:"
  read -s TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  echo "✅ Contraseña capturada."
fi

# 3. Ejecutar Build
echo ""
echo "🚀 Iniciando proceso de build con Bun..."
bun run tauri build

echo ""
echo "✨ Build finalizado. Revisa 'src-tauri/target/release/bundle/macos' o 'dmg'."
