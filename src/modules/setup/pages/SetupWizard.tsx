import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { Loader2, Key, Database, User, CheckCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { open } from '@tauri-apps/plugin-dialog';

const steps = [
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
  const [step, setStep] = useState(1);
  const [dbPath, setDbPath] = useState("Default (AppData)");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Forms
  const licenseForm = useForm({ resolver: zodResolver(licenseSchema) });
  const adminForm = useForm({ resolver: zodResolver(adminSchema) });

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
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Seleccionar ubicación de la Base de Datos",
      });
      
      if (selected) {
        const fullPath = typeof selected === 'string' ? selected : selected[0];
        // Append filename to directory
        // Note: We need to handle path separators based on OS, but for now simple slash might work or let backend handle it
        // A safer way is to send just the directory to backend and let backend join it
        // For now let's assume valid path string
        setDbPath(`${fullPath}/equinox.db`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDbSubmit = async () => {
    setIsProcessing(true);
    try {
      if (dbPath !== "Default (AppData)") {
         await invoke("configure_database", { path: dbPath });
         // App might need restart here ideally, but let's proceed for now
         toast({ title: "Configuración guardada", description: "Se ha establecido la ruta de la base de datos." });
      }
      setStep(3);
    } catch (e: any) {
      toast({ title: "Error", description: e.toString(), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      await invoke("setup_initial_admin", {
        orgName: data.orgName,
        adminName: data.adminName,
        adminEmail: data.email,
        adminPassword: data.password
      });
      
      toast({ title: "¡Instalación Completada!", description: "Bienvenido a Equinox ERP." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Error", description: e.toString(), variant: "destructive" });
    } finally {
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
                 {s.id !== 3 && <Separator className={`w-full absolute left-1/2 top-5 -z-10 ${step > s.id ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <CardTitle className="text-2xl text-center">
            {step === 1 && "Verificación de Licencia"}
            {step === 2 && "Configuración de Almacenamiento"}
            {step === 3 && "Cuenta Administrativa"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 && "Ingresa tu clave de producto para continuar."}
            {step === 2 && "Elige dónde se guardarán tus datos."}
            {step === 3 && "Configura la organización y el primer usuario."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          {step === 2 && (
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
