import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Save, Printer } from 'lucide-react';
import { format } from "date-fns";

interface InvoiceSummaryProps {
  subtotal: number;
  taxes: number;
  total: number;
  status?: string;
  issueDate?: Date;
  dueDate?: Date;
  paymentTerms?: string;
  onIssue?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  isSaving?: boolean;
  currency?: string;
}

export function InvoiceSummary({
  subtotal,
  taxes,
  total,
  status = "Borrador",
  issueDate,
  dueDate,
  paymentTerms,
  onIssue,
  onSave,
  onPrint,
  isSaving,
  currency = "VES",
}: InvoiceSummaryProps) {
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-VE", { 
        style: "currency", 
        currency: currency 
    }).format(amount);
  };

  return (
    <div className="sticky top-6 space-y-4">
      {/* Main Summary Card */}
      <Card className="p-6 bg-card border-border shadow-sm">
        <div className="space-y-4">
          {/* Status */}
          <div className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Estado
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm font-semibold text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                {status}
              </span>
            </div>
          </div>

          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-lg font-semibold text-foreground font-mono">
              {formatMoney(subtotal)}
            </span>
          </div>

          {/* Taxes */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Impuestos</span>
            <span className="text-lg font-semibold text-primary font-mono">
              {formatMoney(taxes)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-border pt-4"></div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">
              Total a Pagar
            </span>
            <span className="text-3xl font-black text-primary font-mono">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12"
          size="lg"
          onClick={onIssue}
          type="button"
        >
          <Send className="h-4 w-4 mr-2" />
          Emitir Factura
        </Button>
        <div className="flex gap-2">
            <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10 font-semibold h-10 bg-transparent"
            onClick={onPrint}
            type="button"
            >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
            </Button>
            <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10 font-semibold h-10 bg-transparent"
            onClick={onSave}
            disabled={isSaving}
            type="button"
            >
            {isSaving ? "..." : (
                <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                </>
            )}
            </Button>
        </div>
      </div>

      {/* Info Cards */}
      <Card className="p-4 bg-secondary/50 border-secondary shadow-none">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Fecha Emisión
            </p>
            <p className="text-sm font-semibold text-foreground">
                {issueDate ? format(issueDate, "dd/MM/yyyy") : "-"}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Fecha Vencimiento
            </p>
             <p className="text-sm font-semibold text-foreground">
                {dueDate ? format(dueDate, "dd/MM/yyyy") : "-"}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Condición
            </p>
            <p className="text-sm font-semibold text-foreground capitalize">
              {paymentTerms ? paymentTerms.replace("_", " ") : "-"}
            </p>
          </div>
        </div>
      </Card>

      {/* Help Text */}
      <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Verifica que todos los datos sean correctos antes de emitir la factura.
          Una vez emitida, no podrá ser modificada.
        </p>
      </div>
    </div>
  );
}
