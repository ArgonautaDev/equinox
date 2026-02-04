import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, AlertCircle, CheckCircle, RefreshCw, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreviousInstallation {
  path: string;
  version: string | null;
  database_path: string | null;
  found: boolean;
}

interface Props {
  onContinue: (mode: "new" | "upgrade" | "custom") => void;
  onPreviousInstallation: (installation: PreviousInstallation) => void;
}

export function InstallationDetection({ onContinue, onPreviousInstallation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [previousInstall, setPreviousInstall] = useState<PreviousInstallation | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    detectInstallation();
  }, []);

  const detectInstallation = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result: PreviousInstallation = await invoke("detect_previous_installation");
      setPreviousInstall(result);
      if (result.found) {
        onPreviousInstallation(result);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Detectando instalación previa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={detectInstallation}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!previousInstall?.found) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            No se detectó una instalación previa de Equinox ERP.
          </AlertDescription>
        </Alert>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Nueva Instalación</CardTitle>
            <CardDescription>
              Configuraremos Equinox ERP desde cero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onContinue("new")} className="w-full" size="lg">
              Continuar con Instalación Nueva
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="ml-2">
          Se detectó una instalación previa de Equinox ERP
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Instalación Encontrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ubicación:</span>
              <code className="text-xs bg-secondary px-2 py-1 rounded">{previousInstall.path}</code>
            </div>
            {previousInstall.database_path && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base de Datos:</span>
                <code className="text-xs bg-secondary px-2 py-1 rounded truncate max-w-[200px]">
                  {previousInstall.database_path}
                </code>
              </div>
            )}
            {previousInstall.version && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versión:</span>
                <span className="font-medium">{previousInstall.version}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button 
              onClick={() => onContinue("upgrade")} 
              className="w-full"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Actualizar Instalación
            </Button>
            
            <Button 
              onClick={() => onContinue("custom")} 
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuración Personalizada
            </Button>

            <Button 
              onClick={() => onContinue("new")} 
              variant="ghost"
              className="w-full"
            >
              Instalar desde Cero (Nuevo)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
