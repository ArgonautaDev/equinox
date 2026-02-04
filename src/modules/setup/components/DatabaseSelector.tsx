import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { 
  Loader2, Database, FolderOpen, AlertCircle, 
  CheckCircle, Users, Package, Calendar, HardDrive 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DatabaseFile {
  path: string;
  size_bytes: number;
  modified_timestamp: number;
  is_valid: boolean;
}

interface DatabaseInfo {
  path: string;
  user_count: number;
  product_count: number;
  last_modified: number;
  size_bytes: number;
  schema_version: string | null;
}

interface Props {
  onSelect: (dbPath: string) => void;
  onUseNew: () => void;
}

export function DatabaseSelector({ onSelect, onUseNew }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<DatabaseFile[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result: DatabaseFile[] = await invoke("list_database_files");
      setDatabases(result);
      
      // Auto-select first valid database
      const firstValid = result.find(db => db.is_valid);
      if (firstValid) {
        selectDatabase(firstValid.path);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const selectDatabase = async (path: string) => {
    setSelectedDb(path);
    setIsLoadingInfo(true);
    setDbInfo(null);
    
    try {
      const info: DatabaseInfo = await invoke("check_existing_database", { path });
      setDbInfo(info);
    } catch (e: any) {
      console.error("Error loading database info:", e);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const browseDatabase = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: "Base de Datos", extensions: ["db", "sqlite", "sqlite3"] }],
        title: "Seleccionar Base de Datos",
      });

      if (selected) {
        const path = typeof selected === "string" ? selected : selected[0];
        selectDatabase(path);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Buscando bases de datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {databases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Bases de Datos Encontradas
            </CardTitle>
            <CardDescription>Selecciona una base de datos existente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {databases.map((db) => (
              <button
                key={db.path}
                onClick={() => selectDatabase(db.path)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedDb === db.path
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${!db.is_valid ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <code className="text-xs block truncate">{db.path}</code>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatBytes(db.size_bytes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(db.modified_timestamp)}
                      </span>
                    </div>
                  </div>
                  {selectedDb === db.path && (
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                  )}
                  {!db.is_valid && (
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={browseDatabase} variant="outline" className="flex-1">
          <FolderOpen className="h-4 w-4 mr-2" />
          Examinar...
        </Button>
        <Button onClick={onUseNew} variant="outline" className="flex-1">
          <Database className="h-4 w-4 mr-2" />
          Crear Nueva
        </Button>
      </div>

      {isLoadingInfo && selectedDb && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {dbInfo && !isLoadingInfo && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Información de la Base de Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{dbInfo.user_count}</p>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{dbInfo.product_count}</p>
                  <p className="text-xs text-muted-foreground">Productos</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño:</span>
                <span className="font-medium">{formatBytes(dbInfo.size_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última modificación:</span>
                <span className="font-medium">{formatDate(dbInfo.last_modified)}</span>
              </div>
              {dbInfo.schema_version && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versión del esquema:</span>
                  <span className="font-medium">{dbInfo.schema_version}</span>
                </div>
              )}
            </div>

            <Button onClick={() => onSelect(selectedDb)} className="w-full" size="lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              Usar Esta Base de Datos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
