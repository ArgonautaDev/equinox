import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cashRegisters } from "@/lib/tauri";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashRegister } from "./CashRegisterProvider";
import { OpenSessionDto } from "@/lib/tauri";

export function OpenRegisterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { openSession, isLoading: isContextLoading } = useCashRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRegisters, setLoadingRegisters] = useState(false);
  const [registers, setRegisters] = useState<{id: string, name: string}[]>([]);

  // Fetch registers on open
  useEffect(() => {
    if (isOpen) {
        setLoadingRegisters(true);
        cashRegisters.list()
            .then(async (list) => {
                if (list.length === 0) {
                    // Auto-create default register if none exist
                    try {
                        const newReg = await cashRegisters.create("Caja Principal");
                        setRegisters([newReg]);
                    } catch (e) {
                         toast.error("Error creando caja por defecto");
                    }
                } else {
                    setRegisters(list);
                }
            })
            .catch(e => console.error(e))
            .finally(() => setLoadingRegisters(false));
    }
  }, [isOpen]);

  const { register, handleSubmit, formState: { errors } } = useForm<OpenSessionDto>({
    defaultValues: {
      opening_amount_usd: 0,
      opening_amount_ves: 0,
      opening_amount_eur: 0,
      exchange_rate_ves: 0,
      exchange_rate_eur: 0,
      notes: "Apertura de caja",
      register_id: "" 
    }
  });

  const onSubmit = async (data: OpenSessionDto) => {
    try {
      if (registers.length === 0) {
          toast.error("No hay cajas registradas disponibles");
          return;
      }
      
      setIsSubmitting(true);
      
      // Select the first available register for now
      // In future add a Select for multiple registers
      const registerId = registers[0].id;

      await openSession({
        ...data,
        register_id: registerId
      });
      onClose();
    } catch (error) {
      // Toast handled in provider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Abrir Caja</DialogTitle>
          <DialogDescription>
            Ingrese los montos iniciales en caja para cada moneda.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usd">USD ($)</Label>
              <Input
                id="usd"
                type="number"
                step="0.01"
                {...register("opening_amount_usd", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ves">Bolívares (Bs)</Label>
              <Input
                id="ves"
                type="number"
                step="0.01"
                {...register("opening_amount_ves", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eur">Euros (€)</Label>
              <Input
                id="eur"
                type="number"
                step="0.01"
                {...register("opening_amount_eur", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>Tasas de Cambio (Referencia)</Label>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="rate_ves">Tasa VES/USD</Label>
                    <Input
                        id="rate_ves"
                        type="number"
                        step="0.01"
                        {...register("exchange_rate_ves", { required: true, valueAsNumber: true })}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="rate_eur">Tasa USD/EUR</Label>
                    <Input
                        id="rate_eur"
                        type="number"
                        step="0.01"
                         {...register("exchange_rate_eur", { required: true, valueAsNumber: true })}
                    />
                </div>
             </div>
          </div>

           <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                {...register("notes")}
              />
            </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
