import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { payments, settings, Invoice, CreatePaymentDto } from "@/lib/tauri";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, Trash2, History, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PaymentModalProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

export function PaymentModal({ invoice, open, onClose }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("new");
  const [amount, setAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState(""); // New state for bank currency amount
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const pendingAmount = invoice ? invoice.total - invoice.paid_amount : 0;

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => settings.listBankAccounts(),
    enabled: open,
  });

  // Fetch payment history
  const { data: paymentHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["payments", invoice?.id],
    queryFn: () => (invoice ? payments.list(invoice.id) : Promise.resolve([])),
    enabled: !!invoice && open,
  });

  useEffect(() => {
    if (invoice && open) {
      setAmount((invoice.total - invoice.paid_amount).toFixed(2));
      setReceivedAmount("");
      setMethod("transfer");
      setReference("");
      setNotes("");
      setBankAccountId(undefined);
      setActiveTab("new");
    }
  }, [invoice, open]);

  const mutation = useMutation({
    mutationFn: payments.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      toast.success("Pago registrado exitosamente");
      onClose();
    },
    onError: (err: string) => toast.error(err),
  });

  const deleteMutation = useMutation({
    mutationFn: payments.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      toast.success("Pago eliminado");
    },
    onError: (err: string) => toast.error(err),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (payAmount > pendingAmount + 0.01) {
      toast.error("El monto excede el saldo pendiente");
      return;
    }

    // Prepare DTO
    let finalReceivedAmount = payAmount; 
    
    // If receivedAmount is set (implied conversion), use it
    if (receivedAmount && parseFloat(receivedAmount) > 0) {
        finalReceivedAmount = parseFloat(receivedAmount);
    }
    
    // Calculate exchange rate for this transaction if needed
    // The backend stores the "exchange_rate" of the INVOICE usually, 
    // or we might want to store the transaction rate?
    // Current model: exchange_rate is stored. Usually that's the invoice rate.
    // Ideally we should store the transaction rate if different, but let's stick to invoice rate for now unless we add a specific field for transaction rate.
    
    const paymentData: CreatePaymentDto = {
      invoice_id: invoice.id,
      amount: payAmount,
      currency: invoice.currency,
      received_amount: finalReceivedAmount, // Pass to backend
      exchange_rate: invoice.exchange_rate,
      payment_method: method,
      reference: reference || undefined,
      bank_account_id: bankAccountId,
      payment_date: new Date().toISOString(),
      notes: notes || undefined,
    };

    console.log("Submitting payment:", paymentData);
    mutation.mutate(paymentData);
  };

  const handlePayAll = () => {
    setAmount(pendingAmount.toFixed(2));
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Gestionar Pagos</DialogTitle>
          <DialogDescription>
             Factura #{invoice.invoice_number} - {invoice.client_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Registrar Pago</TabsTrigger>
            <TabsTrigger value="history">Historial ({paymentHistory?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Saldo Pendiente:</span>
                <span className="text-lg font-bold text-primary">
                  {invoice.currency} {pendingAmount.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Monto a Abonar ({invoice.currency})</Label>
                    <button
                      type="button"
                      onClick={handlePayAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Pagar Todo
                    </button>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-8"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="mobile">Pago Móvil</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cuenta Destino (Opcional)</Label>
                <Select
                  value={bankAccountId || ""}
                  onValueChange={(val) => setBankAccountId(val || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency Conversion Logic */}
              {bankAccountId && bankAccounts && (
                 (() => {
                    const selectedAccount = bankAccounts.find(a => a.id === bankAccountId);
                    if (selectedAccount && selectedAccount.currency !== invoice.currency) {
                        return (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-3">
                                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    Conversión de Divisas Detectada
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">
                                        Monto Recibido en Banco ({selectedAccount.currency})
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Monto en ${selectedAccount.currency}`}
                                        value={receivedAmount}
                                        onChange={(e) => setReceivedAmount(e.target.value)}
                                        className="bg-background"
                                    />
                                    {receivedAmount && amount && parseFloat(amount) > 0 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                            Tasa Implícita: 1 {invoice.currency} = {(parseFloat(receivedAmount) / parseFloat(amount)).toFixed(4)} {selectedAccount.currency}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }
                    return null;
                 })()
              )}

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: 123456"
                />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="h-20"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Registrar Pago
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 py-4">
            {isLoadingHistory ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !paymentHistory || paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No hay pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {payment.amount.toFixed(2)} {payment.currency}
                        <span className="text-xs text-muted-foreground font-normal px-2 py-0.5 bg-secondary rounded-full">
                          {payment.payment_method}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm")}
                        {payment.reference && ` • Ref: ${payment.reference}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("¿Estás seguro de eliminar este pago?")) {
                          deleteMutation.mutate(payment.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
