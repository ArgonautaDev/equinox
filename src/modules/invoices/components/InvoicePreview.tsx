import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useInvoiceCalculation } from "../hooks/useInvoiceCalculation";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";


interface InvoicePreviewProps {
    companySettings?: any;
}

export function InvoicePreview({ companySettings }: InvoicePreviewProps) {
    const { watch } = useFormContext();
    const { subtotal, discountTotal, taxTotal, grandTotal, formatCurrency } = useInvoiceCalculation();

    const clientName = watch("client_name_display") || "Nombre del Cliente";
    const clientTaxId = watch("client_tax_id_display") || "V-00000000";
    const clientEmail = watch("client_email_display");
    const clientPhone = watch("client_phone_display");
    
    const invoiceNumber = "BORRADOR";
    const issueDate = watch("issue_date") || new Date();
    const dueDate = watch("due_date");
    const paymentTerms = watch("payment_terms") || "Contado";
    const currency = watch("currency");
    const exchangeRate = watch("exchange_rate");

    const items = watch("items") || [];
    const notes = watch("notes") || "";

    // Format terms label
    const termsLabel = paymentTerms.startsWith("credito_") 
        ? `Crédito ${paymentTerms.split("_")[1]} días` 
        : "Contado";

    return (
        <Card className="h-full bg-white text-black font-sans shadow-lg overflow-hidden border-none mx-auto max-w-[210mm] aspect-[210/297] flex flex-col p-12 text-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2 uppercase">
                        {companySettings?.name || "NOMBRE EMPRESA"}
                    </div>
                    <div className="text-muted-foreground text-xs uppercase tracking-widest space-y-1">
                        <p>{companySettings?.tax_id}</p>
                        <p>{companySettings?.address}</p>
                        <p>{companySettings?.phone} | {companySettings?.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-light text-muted-foreground mb-1">FACTURA</h2>
                    <p className="font-mono font-bold text-lg">{invoiceNumber}</p>
                </div>
            </div>

            {/* Client & Date Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8">
                <div>
                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Facturar a:</h3>
                    <p className="font-bold text-lg">{clientName}</p>
                    <p className="text-muted-foreground">{clientTaxId}</p>
                    {(clientEmail || clientPhone) && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                            {clientEmail && <p>{clientEmail}</p>}
                            {clientPhone && <p>{clientPhone}</p>}
                        </div>
                    )}
                </div>
                <div className="text-right space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha Emisión:</span>
                        <span className="font-medium">
                            {format(issueDate, "dd MMM yyyy", { locale: es })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Vencimiento:</span>
                        <span className="font-medium text-red-600">
                             {dueDate ? format(dueDate, "dd MMM yyyy", { locale: es }) : "N/A"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Condición:</span>
                        <span className="font-medium capitalize">{termsLabel}</span>
                    </div>
                </div>
            </div>

            {/* Payment Details (Currency) */}
            <div className="mb-8 grid grid-cols-2 gap-8">
                <div className="col-start-2 text-right text-xs">
                     <span className="text-muted-foreground mr-2">Moneda:</span>
                     <span className="font-bold">{currency}</span>
                     {currency !== "VES" && (
                         <>
                            <span className="mx-2 text-muted-foreground">|</span>
                            <span className="text-muted-foreground mr-2">Tasa:</span>
                            <span className="font-bold">{exchangeRate}</span>
                         </>
                     )}
                </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-primary/20">
                            <th className="text-left py-2 font-bold text-muted-foreground w-1/2">Descripción</th>
                            <th className="text-right py-2 font-bold text-muted-foreground">Cant.</th>
                            <th className="text-right py-2 font-bold text-muted-foreground">Precio</th>
                            <th className="text-right py-2 font-bold text-muted-foreground">Desc%</th>
                             <th className="text-right py-2 font-bold text-muted-foreground">IVA%</th>
                            <th className="text-right py-2 font-bold text-muted-foreground">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.map((item: any, i: number) => {
                             const lineTotal = (item.quantity * item.unit_price) * (1 - (item.discount_percent || 0)/100) * (1 + (item.tax_rate || 0)/100);
                             return (
                                <tr key={i} className="group text-xs">
                                    <td className="py-3 group-hover:bg-muted/50 transition-colors pl-2 rounded-l-md">
                                        <div className="font-medium text-sm">{item.description}</div>
                                        {item.original_sku && <div className="text-[10px] text-muted-foreground">SKU: {item.original_sku}</div>}
                                    </td>
                                    <td className="text-right py-3">{item.quantity}</td>
                                    <td className="text-right py-3">{formatCurrency(item.unit_price)}</td>
                                    <td className="text-right py-3 text-muted-foreground">{item.discount_percent > 0 ? `-${item.discount_percent}%` : "-"}</td>
                                    <td className="text-right py-3 text-muted-foreground">{item.tax_rate}%</td>
                                    <td className="text-right py-3 pr-2 rounded-r-md font-medium">{formatCurrency(lineTotal)}</td>
                                </tr>
                             );
                        })}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                                    No hay items en la factura
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="mt-8 flex justify-end">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountTotal > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Descuento Global</span>
                            <span>-{formatCurrency(discountTotal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <span>Impuestos (IVA)</span>
                        <span>{formatCurrency(taxTotal)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-xl">
                        <span>Total</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-[10px] text-muted-foreground text-center">
                <p>{notes}</p>
                <p className="mt-2 font-medium">Gracias por su preferencia.</p>
            </div>
        </Card>
    );
}
