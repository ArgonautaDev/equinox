import { useQuery } from "@tanstack/react-query";
import { invoices as invoicesApi, settings, payments, Payment, InvoiceItem } from "@/lib/tauri"; // Restored payments
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Printer, User, FileText, History } from "lucide-react"; // Added icons
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/modules/invoices/InvoicePDF";

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoiceId, open, onClose }: InvoiceDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => invoicesApi.get(invoiceId!),
    enabled: !!invoiceId && open,
  });

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: settings.getCompanySettings,
    enabled: open,
  });

  // Added payment history fetch
  const { data: paymentHistory } = useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => (invoiceId ? payments.list(invoiceId) : Promise.resolve([])),
    enabled: !!invoiceId && open,
  });

  const [invoice, items] = data || [null, []];
// ... (rest of imports/logic until return)



  const statusMap: Record<string, string> = {
    draft: "Borrador",
    issued: "Emitida / Pendiente",
    partial: "Pago Parcial",
    paid: "Pagada",
    cancelled: "Anulada"
  };

  if (!invoiceId) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
              </span>
            ) : invoice ? (
              <>
                <span>Factura {invoice.invoice_number}</span>
                <Badge variant="secondary" className="text-sm font-normal">
                    {statusMap[invoice.status] || invoice.status}
                </Badge>
              </>
            ) : (
                <span>Detalle de Factura</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-end">
                 <PDFDownloadLink
                    document={
                        <InvoicePDF 
                            invoice={invoice} 
                            items={items} 
                            settings={companySettings || undefined} 
                        />
                    }
                    fileName={`FACT-${invoice.invoice_number}.pdf`}
                >
                    {({ loading }) => (
                        <Button variant="outline" size="sm" disabled={loading}>
                            <Printer className="mr-2 h-4 w-4" />
                            {loading ? "Generando PDF..." : "Imprimir / Descargar"}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-secondary/10 rounded-lg border">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                        <User className="w-4 h-4" />
                        <h3>Cliente</h3>
                    </div>
                    <div className="text-sm space-y-1 pl-6">
                        <p className="font-medium text-base">{invoice.client_name}</p>
                        <p className="text-muted-foreground">{invoice.client_tax_id}</p>
                        <p className="text-muted-foreground">{invoice.client_address || "Sin dirección"}</p>
                    </div>
                </div>

                <div className="space-y-3">
                     <div className="flex items-center gap-2 font-semibold text-primary">
                        <FileText className="w-4 h-4" />
                        <h3>Fiscal</h3>
                    </div>
                    <div className="text-sm space-y-1 pl-6">
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha Emisión:</span>
                            <span>{format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: es })}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Vencimiento:</span>
                            <span className={invoice.due_date && new Date(invoice.due_date) < new Date() ? "text-red-500 font-medium" : ""}>
                                {invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "N/A"}
                            </span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Moneda:</span>
                            <span>{invoice.currency} (Tasa: {invoice.exchange_rate})</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item: InvoiceItem) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="font-medium">{item.description}</div>
                                    <div className="text-xs text-muted-foreground">{item.code}</div>
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">{item.line_total.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Totals & Payments */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 space-y-4">
                     <h3 className="font-semibold flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Historial de Pagos
                     </h3>
                     {paymentHistory && paymentHistory.length > 0 ? (
                        <div className="space-y-3">
                            {paymentHistory.map((p: Payment) => (
                                <div key={p.id} className="p-3 border rounded-lg bg-card text-sm space-y-1">
                                    <div className="flex justify-between font-medium">
                                        <span>
                                            {p.amount.toFixed(2)} {p.currency}
                                            {p.received_amount && p.received_amount !== p.amount && (
                                              <span className="text-xs text-muted-foreground ml-1">
                                                (Reflejado: {p.received_amount.toFixed(2)})
                                              </span>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground">{format(new Date(p.payment_date), "dd/MM/yyyy")}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground text-xs">
                                        <span>{p.payment_method} {p.reference ? `- Ref: ${p.reference}` : ""}</span>
                                    </div>
                                    {/* Ideally show bank account name, but we only have ID here pending join or manual fetch */}
                                </div>
                            ))}
                        </div>
                     ) : (
                        <div className="p-4 border border-dashed rounded text-center text-muted-foreground text-sm">
                            No hay pagos registrados
                        </div>
                     )}
                </div>

                <div className="w-full md:w-1/2 bg-card border rounded-lg p-4 space-y-2 shadow-sm h-fit">
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Impuestos:</span>
                        <span>{invoice.currency} {invoice.tax_total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-red-500">
                        <span>Descuentos:</span>
                        <span>- {invoice.currency} {invoice.discount_total.toFixed(2)}</span>
                     </div>
                     <Separator className="my-2" />
                     <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-green-600 font-medium pt-1">
                        <span>Pagado:</span>
                        <span>{invoice.currency} {invoice.paid_amount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-amber-600 font-medium">
                        <span>Pendiente:</span>
                        <span>{invoice.currency} {(invoice.total - invoice.paid_amount).toFixed(2)}</span>
                     </div>
                </div>
            </div>
          </div>
        ) : (
            <div className="p-8 text-center text-red-500">
                No se pudo cargar la información de la factura.
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
