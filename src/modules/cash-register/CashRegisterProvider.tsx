import { createContext, useContext, useEffect, useState } from "react";
import { CashRegisterSession, cashRegisters, OpenSessionDto, CloseSessionDto } from "@/lib/tauri";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface CashRegisterContextType {
  session: CashRegisterSession | null;
  isLoading: boolean;
  openSession: (data: OpenSessionDto) => Promise<void>;
  closeSession: (data: CloseSessionDto) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const CashRegisterContext = createContext<CashRegisterContextType | null>(null);

export function CashRegisterProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const refreshSession = async () => {
    if (!isAuthenticated) return;
    
    try {
      const active = await cashRegisters.getActiveSession();
      setSession(active);
    } catch (error) {
      console.error("Failed to get active session:", error);
      toast.error("Error al verificar estado de caja");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshSession();
    } else {
      setSession(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const openSession = async (data: OpenSessionDto) => {
    try {
      const newSession = await cashRegisters.openSession(data);
      setSession(newSession);
      toast.success("Caja abierta exitosamente");
    } catch (error) {
      console.error("Failed to open session:", error);
      toast.error("Error al abrir caja: " + String(error));
      throw error;
    }
  };

  const closeSession = async (data: CloseSessionDto) => {
    try {
      await cashRegisters.closeSession(data);
      setSession(null);
      toast.success("Caja cerrada exitosamente");
    } catch (error) {
      console.error("Failed to close session:", error);
      toast.error("Error al cerrar caja: " + String(error));
      throw error;
    }
  };

  return (
    <CashRegisterContext.Provider
      value={{
        session,
        isLoading,
        openSession,
        closeSession,
        refreshSession,
      }}
    >
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  const context = useContext(CashRegisterContext);
  if (!context) {
    throw new Error("useCashRegister must be used within a CashRegisterProvider");
  }
  return context;
}
