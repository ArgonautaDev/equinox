import { useState, useEffect } from "react";
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
import { CloseSessionDto } from "@/lib/tauri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CloseRegisterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session, closeSession } = useCashRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Need to calculate expected totals on the fly or fetch them?
  // The backend calculates "expected" when closing, but for the UI we want to show it BEFORE closing.
  // We can't easily get it without a specialized command "get_session_summary".
  // For now, I'll assume the user counts blindly or manually checks.
  // Ideally, I'd add `get_session_details` to backend.
  
  // Just simple form for now.
  const { register, handleSubmit } = useForm<CloseSessionDto>({
    defaultValues: {
      closing_amount_usd: 0,
      closing_amount_ves: 0,
      closing_amount_eur: 0,
      notes: "Cierre de caja",
      session_id: session?.id || ""
    }
  });

  const onSubmit = async (data: CloseSessionDto) => {
    if (!session) return;
    try {
      setIsSubmitting(true);
      await closeSession({
        ...data,
        session_id: session.id
      });
      onClose();
    } catch (error) {
       // handled by provider
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cerrar Caja</DialogTitle>
          <DialogDescription>
            Realice el conteo final de dinero en efectivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Opening (Reference) */}
             <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm">Apertura (USD)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xl font-bold">
                    ${session.opening_amount_usd}
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm">Apertura (Bs)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xl font-bold">
                    Bs {session.opening_amount_ves}
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm">Apertura (EUR)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xl font-bold">
                    € {session.opening_amount_eur}
                </CardContent>
             </Card>
          </div>
          
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Conteo de Cierre</h3>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                <Label htmlFor="usd_close">Total USD ($)</Label>
                <Input
                    id="usd_close"
                    type="number"
                    step="0.01"
                    {...register("closing_amount_usd", { valueAsNumber: true })}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="ves_close">Total Bolívares (Bs)</Label>
                <Input
                    id="ves_close"
                    type="number"
                    step="0.01"
                    {...register("closing_amount_ves", { valueAsNumber: true })}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="eur_close">Total Euros (€)</Label>
                <Input
                    id="eur_close"
                    type="number"
                    step="0.01"
                    {...register("closing_amount_eur", { valueAsNumber: true })}
                />
                </div>
            </div>
          </div>

           <div className="space-y-2">
              <Label htmlFor="notes">Notas de Cierre</Label>
              <Input
                id="notes"
                {...register("notes")}
              />
            </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
