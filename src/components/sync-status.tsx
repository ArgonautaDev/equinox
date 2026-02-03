import { Cloud, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SyncStatusData {
  last_sync: string | null;
  pending_uploads: number;
  pending_downloads: number;
  is_syncing: boolean;
  last_error: string | null;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData>({
    last_sync: null,
    pending_uploads: 0,
    pending_downloads: 0,
    is_syncing: false,
    last_error: null,
  });

  const checkStatus = async () => {
    try {
      // Check for pending downloads from cloud
      const pendingDownloads = await invoke<number>("check_cloud_updates");
      
      setStatus(prev => ({ 
        ...prev, 
        pending_downloads: pendingDownloads,
      }));
    } catch (error) {
      console.error("Failed to get sync status", error);
    }
  };

  const startSyncInternal = async (isAuto: boolean = false) => {
    setStatus(prev => ({ ...prev, is_syncing: true }));
    try {
      const result = await invoke<{ uploaded: number; downloaded: number }>("start_sync");
      
      // Update status after sync
      const pendingDownloads = await invoke<number>("check_cloud_updates");
      setStatus(prev => ({ 
        ...prev, 
        is_syncing: false, 
        pending_downloads: pendingDownloads,
        last_sync: new Date().toISOString()
      }));
      
      if (result.uploaded > 0 || result.downloaded > 0) {
        toast.success(`Sincronización completada (${isAuto ? 'Auto' : 'Manual'})`, {
          description: `Subidos: ${result.uploaded} | Bajados: ${result.downloaded}`,
        });
      } else if (!isAuto) {
        // Only show "No changes" toast on manual trigger
        toast.info("Todo está actualizado", {
          description: "No hay cambios pendientes de sincronizar",
        });
      }
    } catch (error) {
      console.error("Sync failed", error);
      setStatus(prev => ({ ...prev, is_syncing: false, last_error: String(error) }));
      if (!isAuto) {
        toast.error("Error de sincronización", {
          description: String(error),
        });
      }
    }
  };

  const handleManualSync = () => startSyncInternal(false);

  // Auto-sync interval
  useEffect(() => {
    const runAutoSync = async () => {
      // Don't sync if already syncing
      if (status.is_syncing) return;

      console.log("Running Auto-Sync...");
      try {
        await startSyncInternal(true);
      } catch (e) {
        console.error("Auto-sync failed", e);
      }
    };

    // Initial check
    checkStatus();

    // Set up auto-sync every 30s
    const interval = setInterval(runAutoSync, 30000);
    return () => clearInterval(interval);
  }, [status.is_syncing]);

  const hasPending = status.pending_uploads > 0 || status.pending_downloads > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={status.last_error ? "destructive" : hasPending ? "default" : "outline"}
              size={hasPending ? "default" : "icon"}
              className={cn(
                "rounded-full shadow-lg transition-all duration-300",
                status.is_syncing && "animate-pulse border-blue-500 bg-blue-50",
                hasPending && "pl-4 pr-4 w-auto bg-amber-500 hover:bg-amber-600 border-amber-600 text-white"
              )}
              onClick={handleManualSync}
              disabled={status.is_syncing}
            >
              <div className="flex items-center gap-2">
                {status.is_syncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : status.last_error ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Cloud className={cn("h-4 w-4", !hasPending && "text-green-500", hasPending && "text-white")} />
                )}
                
                {hasPending && !status.is_syncing && (
                  <span className="text-xs font-semibold">
                    {status.pending_downloads} updates available
                  </span>
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="text-xs">
              <p className="font-semibold">Cloud Sync (Auto: 30s)</p>
              {status.is_syncing ? (
                <p>Syncing...</p>
              ) : status.last_error ? (
                <p className="text-red-500">Error: {status.last_error}</p>
              ) : (
                <>
                  <p>Up: {status.pending_uploads} | Down: {status.pending_downloads}</p>
                  <p className="text-muted-foreground">
                    Last: {status.last_sync ? new Date(status.last_sync).toLocaleTimeString() : "Never"}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
