import { formatCurrency } from "@/lib/utils"; // Assuming utils

interface InvoiceFormTotalsProps {
    currency: string;
    exchangeRate: number;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
}

export function InvoiceFormTotals({ currency, exchangeRate, subtotal, taxTotal, grandTotal }: InvoiceFormTotalsProps) {
    return (
        <div className="bg-background border-t p-6 sticky bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="max-w-5xl mx-auto flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total a Pagar ({currency})</p>
                    <p className="text-4xl font-bold tracking-tight text-primary">
                        {formatCurrency(grandTotal, currency)}
                    </p>
                    {currency !== "VES" && (
                            <p className="text-sm text-muted-foreground mt-1">
                                ≈ {formatCurrency(grandTotal * (exchangeRate || 1), "VES")}
                            </p>
                    )}
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-1">
                    <p>Subtotal: {formatCurrency(subtotal, currency)}</p>
                    <p>Impuestos: {formatCurrency(taxTotal, currency)}</p>
                </div>
            </div>
        </div>
    );
}
