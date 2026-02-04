# ==========================================
# EQUINOX ERP - Windows Local Build Helper
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Preparando Build para Windows..." -ForegroundColor Cyan

# 1. Configurar Clave Privada (Single Base64)
# Misma clave usada en macOS, formato correcto para Tauri v2
$env:TAURI_SIGNING_PRIVATE_KEY = "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YWlPMEJtZHJYenlmTTY2dkdFTE1WWVU5UTV1VUdHV3VYMnQ4UVRQUXRSVUFBQkFBQUFBQUFBQUFBQUlBQUFBQWNJemU5M2FjTlE1T09la1ZoYUhMbHUzbWdYN1NXdjNCMk9iMnNSZW5TNGV0YWpMMEdXeFBNNnZpNkF3N1AyTzhobVN0TEppYTcxWTRJUHhtNDNGRHRUdTJ2TWpaNDFEbFh5aGxNT29mUWs2Vms5Witna0g4VTUwNHE0bXlqZTFpU2xKUGFQZWo0ZFE9Cg=="

Write-Host "🔑 Clave de firma inyectada al entorno."

# 2. Solicitar Contraseña
if ([string]::IsNullOrWhiteSpace($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD)) {
    Write-Host ""
    $pass = Read-Host -Prompt "🔒 Ingresa la contraseña de la clave privada" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    Write-Host "✅ Contraseña capturada."
}

# 3. Instalar dependencias Frontend
Write-Host "📦 Instalando dependencias de Bun..."
bun install

# 4. Ejecutar Build
Write-Host "🔨 Compilando y empaquetando (esto puede tardar)..."
bun run tauri build

Write-Host ""
Write-Host "✨ Build Finalizado." -ForegroundColor Green
Write-Host "📂 Busca el instalador en: src-tauri\target\release\bundle\nsis"
