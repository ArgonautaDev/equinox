import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCashRegister } from "./CashRegisterProvider";
import { OpenRegisterModal } from "./OpenRegisterModal";
import { CloseRegisterModal } from "./CloseRegisterModal";
import { WalletCards, ArchiveX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CashRegisterStatus() {
  const { session, isLoading } = useCashRegister();
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  if (isLoading) return null;

  return (
    <>
      <div className="flex items-center mr-2">
        {session ? (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 h-9 border-green-500/20 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20"
                        onClick={() => setCloseModalOpen(true)}
                    >
                        <WalletCards className="w-4 h-4" />
                        <span className="hidden sm:inline">Caja Abierta</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Click para cerrar caja</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Abierta: {new Date(session.start_time).toLocaleTimeString()}
                    </p>
                </TooltipContent>
            </Tooltip>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 h-9 text-muted-foreground hover:text-foreground"
            onClick={() => setOpenModalOpen(true)}
          >
            <ArchiveX className="w-4 h-4" />
            <span className="hidden sm:inline">Caja Cerrada</span>
          </Button>
        )}
      </div>

      <OpenRegisterModal 
        isOpen={openModalOpen} 
        onClose={() => setOpenModalOpen(false)} 
      />
      
      <CloseRegisterModal 
        isOpen={closeModalOpen} 
        onClose={() => setCloseModalOpen(false)} 
      />
    </>
  );
}
