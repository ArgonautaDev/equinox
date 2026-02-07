#define MyAppName "Equinox ERP"
#define MyAppVersion "0.1.4"
#define MyAppPublisher "Equinox Team"
#define MyAppURL "https://github.com/ArgonautaDev/equinox-ruby"
#define MyAppExeName "equinox-erp.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
AppId={{E9C7F4B2-8D3A-4F1E-9B2C-5A6D7E8F9A0B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Output directory for the installer
OutputDir=installers
OutputBaseFilename=Equinox_ERP_{#MyAppVersion}_ARM64_Setup
SetupIconFile=src-tauri\icons\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
; Specify this installer is for ARM64 architecture only
ArchitecturesAllowed=arm64
ArchitecturesInstallIn64BitMode=arm64
; Uninstall information
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main executable from target/release (ARM64 build)
Source: "src-tauri\target\release\equinox-erp.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "src-tauri\target\release\equinox_lib.dll"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Check for WebView2 Runtime
function IsWebView2Available: Boolean;
var
  RegKey: String;
  RegValue: String;
begin
  Result := False;
  RegKey := 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  
  // Check if WebView2 is installed
  if RegQueryStringValue(HKLM, RegKey, 'pv', RegValue) then
    Result := True
  else if RegQueryStringValue(HKCU, RegKey, 'pv', RegValue) then
    Result := True;
end;

function InitializeSetup: Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // Check if WebView2 is installed
  if not IsWebView2Available then
  begin
    if MsgBox('Esta aplicación requiere Microsoft Edge WebView2 Runtime para funcionar.' + #13#10 + #13#10 +
              'WebView2 Runtime no está instalado en tu sistema.' + #13#10 + #13#10 +
              '¿Deseas abrir la página de descarga de WebView2?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://developer.microsoft.com/microsoft-edge/webview2/', '', '', SW_SHOW, ewNoWait, ResultCode);
    end;
    
    // Don't block installation, just warn the user
    MsgBox('Nota: La aplicación podría no funcionar correctamente sin WebView2 Runtime.' + #13#10 + #13#10 +
           'Puedes continuar con la instalación y descargar WebView2 más tarde.', mbInformation, MB_OK);
  end;
end;
