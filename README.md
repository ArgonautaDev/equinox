# equinox

en tu máquina Windows:

Clona o actualiza el repo:

git pull origin main
Ejecuta el Setup (como Administrador): Abre PowerShell como Admin y corre:

Set-ExecutionPolicy RemoteSigned -Scope Process
.\scripts\setup_windows.ps1
(Esto instalará Rust, Scoop, Bun, Node, NSIS y LLVM. Recuerda instalar manualmente las "C++ Build Tools" si el script te lo avisa).

Ejecuta el Build: En una terminal normal:

.\scripts\build_windows.ps1
(Te pedirá la contraseña, configurará la clave automáticamente y generará el .exe en src-tauri/target/release/bundle/nsis).