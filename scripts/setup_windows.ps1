# ==========================================
# EQUINOX ERP - Windows Setup Script
# ==========================================
# Run as Administrator

Write-Host "🚀 Iniciando configuración de entorno para Equinox ERP en Windows..." -ForegroundColor Cyan

# 1. Install Scoop (Package Manager) if not installed
if (!(Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Scoop..."
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    irm get.scoop.sh | iex
} else {
    Write-Host "✅ Scoop ya está instalado."
}

# 2. Install Dependencies via Scoop
Write-Host "📦 Instalando dependencias básicas (git, node, bun)..."
scoop install git nodejs-lts bun

# 3. Install Rust
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "🦀 Instalando Rust..."
    $rustup = Invoke-WebRequest https://win.rustup.rs/x86_64 -UseBasicParsing
    # Manual step usually required for visual C++ build tools detection
    Write-Host "⚠️  IMPORTANTE: Rust requiere 'C++ Build Tools' de Visual Studio." -ForegroundColor Yellow
    Write-Host "    Si la instalación falla, instala VS Build Tools desde: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    rustup-init.exe -y
} else {
    Write-Host "✅ Rust ya está instalado."
}

# 4. Install NSIS (Required for bundling)
if (!(Get-Command makensis -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando NSIS (necesario para instalador)..."
    scoop install nsis
}

# 5. Install LLVM (Recommended for Tauri)
scoop install llvm

Write-Host ""
Write-Host "🎉 Entorno configurado (parcialmente)." -ForegroundColor Green
Write-Host "⚠️  PASO CRUCIAL PENDIENTE:" -ForegroundColor Yellow
Write-Host "    Asegúrate de haber instalado 'Desktop development with C++' en Visual Studio Build Tools."
Write-Host "    Esto incluye el compilador MSVC y el SDK de Windows 10/11."
Write-Host ""
Write-Host "Para construir, ejecuta: .\scripts\build_windows.ps1"
