import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { invoke } from "@tauri-apps/api/core";

import { Loader2, Key, Database, User, CheckCircle, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { open } from '@tauri-apps/plugin-dialog';
import { InstallationDetection } from "../components/InstallationDetection";
import { DatabaseSelector } from "../components/DatabaseSelector";

type InstallationMode = "new" | "upgrade" | "custom";

interface PreviousInstallation {
  path: string;
  version: string | null;
  database_path: string | null;
  found: boolean;
}

const steps = [
  { id: 0, title: "Detección", icon: Search },
  { id: 1, title: "Licencia", icon: Key },
  { id: 2, title: "Base de Datos", icon: Database },
  { id: 3, title: "Administrador", icon: User },
];

const licenseSchema = z.object({
  key: z.string().min(8, "Clave inválida"),
});

const adminSchema = z.object({
  orgName: z.string().min(3, "Mínimo 3 caracteres"),
  adminName: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [installMode, setInstallMode] = useState<InstallationMode>("new");
  const [previousInstall, setPreviousInstall] = useState<PreviousInstallation | null>(null);
  const [dbPath, setDbPath] = useState("Default (AppData)");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();


  // Forms
  const licenseForm = useForm({ resolver: zodResolver(licenseSchema) });
  const adminForm = useForm({ resolver: zodResolver(adminSchema) });

  const handleInstallModeSelect = (mode: InstallationMode) => {
    setInstallMode(mode);
    
    // If upgrading and have previous DB, use it
    if (mode === "upgrade" && previousInstall?.database_path) {
      setDbPath(previousInstall.database_path);
    }
    
    setStep(1); // Go to license step
  };

  const handleLicenseSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      const status: any = await invoke("validate_license", { key: data.key });
      if (status.valid) {
        setStep(2);
      } else {
        toast({ title: "Error", description: status.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.toString(), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectDbFolder = async () => {
    try {
      toast({ title: "Abriendo selector de carpeta...", description: "Por favor selecciona una ubicación" });
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Seleccionar ubicación de la Base de Datos",
      });
      
      if (selected) {
        const fullPath = typeof selected === 'string' ? selected : selected[0];
        setDbPath(`${fullPath}/equinox.db`);
        toast({ title: "Ubicación seleccionada", description: fullPath });
      } else {
        toast({ title: "Selección cancelada", description: "No se seleccionó ninguna carpeta" });
      }
    } catch (e: any) {
      console.error("Error selecting folder:", e);
      toast({ 
        title: "Error al seleccionar carpeta", 
        description: e.toString(), 
        variant: "destructive" 
      });
    }
  };

  const handleDatabaseSelect = async (selectedPath: string) => {
    setIsProcessing(true);
    try {
      // If it's a migration, copy the database
      if (installMode === "custom" && selectedPath !== dbPath) {
        const migratedPath: string = await invoke("migrate_database", {
          sourcePath: selectedPath,
          destinationPath: null, // Use default location
        });
        setDbPath(migratedPath);
        toast({ 
          title: "Base de datos migrada", 
          description: `Se copió la base de datos a ${migratedPath}` 
        });
      } else {
        setDbPath(selectedPath);
      }
      
      await invoke("configure_database", { path: selectedPath });
      setStep(3); // Skip to admin if using existing DB with users
    } catch (e: any) {
      toast({ title: "Error", description: e.toString(), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDbSubmit = async () => {
    setIsProcessing(true);
    try {
      // ALWAYS configure database, even if using default path
      const finalDbPath = dbPath === "Default (AppData)" ? "" : dbPath;
      
      toast({ 
        title: "Configurando base de datos...", 
        description: finalDbPath || "Usando ubicación predeterminada" 
      });
      
      await invoke("configure_database", { path: finalDbPath });
      
      toast({ 
        title: "Configuración guardada", 
        description: "Base de datos configurada correctamente." 
      });
      
      setStep(3);
    } catch (e: any) {
      console.error("Error configuring database:", e);
      toast({ 
        title: "Error en configuración de DB", 
        description: e.toString(), 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminSubmit = async (data: any) => {
    console.log("[DEBUG] handleAdminSubmit iniciado con data:", data);
    setIsProcessing(true);
    
    try {
      toast({ 
        title: "🔧 [DEBUG] Paso 1/5", 
        description: "Iniciando creación de administrador..." 
      });
      
      console.log("[DEBUG] Llamando a setup_initial_admin con:", {
        orgName: data.orgName,
        adminName: data.adminName,
        adminEmail: data.email,
        passwordLength: data.password?.length || 0
      });
      
      toast({ 
        title: "🔧 [DEBUG] Paso 2/5", 
        description: "Enviando comando a Tauri..." 
      });
      
      const result = await invoke("setup_initial_admin", {
        orgName: data.orgName,
        adminName: data.adminName,
        adminEmail: data.email,
        adminPassword: data.password
      });
      
      console.log("[DEBUG] Resultado de setup_initial_admin:", result);
      
      toast({ 
        title: "🔧 [DEBUG] Paso 3/5", 
        description: "Admin creado exitosamente" 
      });
      
      toast({ 
        title: "✅ ¡Instalación Completada!", 
        description: "Bienvenido a Equinox ERP. Redirigiendo..." 
      });
      
      console.log("[DEBUG] Recargando página para actualizar estado de setup...");
      
      // Reload the page to trigger App.tsx to re-check setup status
      // This will update needsSetup to false and allow navigation to /login
      window.location.href = "/login";
      
    } catch (e: any) {
      console.error("[ERROR] Error en handleAdminSubmit:", e);
      console.error("[ERROR] Stack trace:", e.stack);
      console.error("[ERROR] Tipo de error:", typeof e);
      console.error("[ERROR] Error completo:", JSON.stringify(e, null, 2));
      
      toast({ 
        title: "❌ Error en la configuración", 
        description: `${e.toString()} - Ver consola para detalles`, 
        variant: "destructive" 
      });
      
      // Keep this toast visible longer
      setTimeout(() => {
        toast({ 
          title: "ℹ️ Información del Error", 
          description: e.message || e.toString(),
          variant: "destructive"
        });
      }, 1000);
    } finally {
      console.log("[DEBUG] handleAdminSubmit finalizando, setIsProcessing(false)");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-primary/20 shadow-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            {steps.map((s) => (
              <div key={s.id} className={`flex flex-col items-center gap-2 ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s.id ? "border-primary bg-primary/10" : "border-muted"}`}>
                    {step > s.id ? <CheckCircle className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                 </div>
                 <span className="text-xs font-medium">{s.title}</span>
              </div>
            ))}
          </div>
          <CardTitle className="text-2xl text-center">
            {step === 0 && "Bienvenido a Equinox ERP"}
            {step === 1 && "Verificación de Licencia"}
            {step === 2 && "Configuración de Base de Datos"}
            {step === 3 && "Cuenta Administrativa"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 0 && "Configuremos tu instalación"}
            {step === 1 && "Ingresa tu clave de producto para continuar."}
            {step === 2 && `${installMode === "new" ? "Elige dónde se guardarán tus datos" : "Selecciona tu base de datos"}`}
            {step === 3 && "Configura la organización y el primer usuario."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <InstallationDetection
              onContinue={handleInstallModeSelect}
              onPreviousInstallation={setPreviousInstall}
            />
          )}

          {step === 1 && (
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium">Clave de Licencia</label>
                 <Input {...licenseForm.register("key")} placeholder="XXXX-XXXX-XXXX-XXXX" />
               </div>
               <Button onClick={licenseForm.handleSubmit(handleLicenseSubmit)} className="w-full" disabled={isProcessing}>
                 {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Verificar y Continuar
               </Button>
            </div>
          )}

          {step === 2 && installMode === "new" && (
            <div className="space-y-6">
              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="text-primary h-5 w-5" />
                  <span className="font-medium">Ubicación Actual</span>
                </div>
                <code className="text-xs break-all bg-background p-2 rounded block border border-border/50">
                  {dbPath}
                </code>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <Button variant="outline" onClick={() => setDbPath("Default (AppData)")} className="h-auto py-4 flex flex-col gap-2">
                    <Database className="h-6 w-6" />
                    <span>Usar Predeterminado</span>
                 </Button>
                 <Button variant="outline" onClick={selectDbFolder} className="h-auto py-4 flex flex-col gap-2">
                    <FolderOpen className="h-6 w-6" />
                    <span>Elegir Carpeta...</span>
                 </Button>
              </div>

               <Button onClick={handleDbSubmit} className="w-full" disabled={isProcessing}>
                 {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Continuar
               </Button>
            </div>
          )}

          {step === 2 && (installMode === "upgrade" || installMode === "custom") && (
            <DatabaseSelector
              onSelect={handleDatabaseSelect}
              onUseNew={() => setInstallMode("new")}
            />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-sm font-medium">Nombre de la Organización</label>
                 <Input {...adminForm.register("orgName")} placeholder="Mi Empresa C.A." />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium">Nombre del Administrador</label>
                 <Input {...adminForm.register("adminName")} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium">Correo Electrónico</label>
                 <Input {...adminForm.register("email")} type="email" placeholder="admin@empresa.com" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium">Contraseña Maestra</label>
                 <Input {...adminForm.register("password")} type="password" />
              </div>

               <Button onClick={adminForm.handleSubmit(handleAdminSubmit)} className="w-full" disabled={isProcessing}>
                 {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Finalizar Instalación
               </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="absolute bottom-4 text-xs text-muted-foreground text-center">
        Equinox ERP "The Kraken" Installer &copy; 2026
      </div>
    </div>
  );
}

