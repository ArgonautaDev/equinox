import { useMemo, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export interface InvoiceItem {
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_rate: number;
}

export function useInvoiceCalculation(control?: any) {
    const context = useFormContext();
    const finalControl = control || context?.control;
    
    if (!finalControl) {
        console.warn("useInvoiceCalculation: No control provided or found in context");
    }

    const items = useWatch({
        control: finalControl,
        name: "items",
        defaultValue: []
    }) as InvoiceItem[];

    // Memoize totals calculation to avoid re-renders
    const totals = useMemo(() => {
        let subtotal = 0;
        let discountTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const discountPct = Number(item.discount_percent) || 0;
            const taxRate = Number(item.tax_rate) || 0;

            const lineGross = qty * price;
            const lineDiscount = lineGross * (discountPct / 100);
            const lineSubtotal = lineGross - lineDiscount;
            const lineTax = lineSubtotal * (taxRate / 100);

            subtotal += lineGross; // Some systems prefer gross subtotal, others net. Staying consistent with previous logic if possible, or improving.
            // Previous logic: subtotal += lineSubtotal (net). 
            // Standard accounting: Subtotal usually means Gross before discount, or Net before Tax.
            // Let's stick to Net before Tax for subtotal based on previous code usually
            // but let's correct it: 
            // Subtotal (Base Imponible) usually implies Sum(Price * Qty - Discount).
            
            // Re-reading previous InvoiceForm logic:
            // sub += lineSub; (where lineSub = qty * price) -> Gross Subtotal
            // disc += itemDisc;
            // tax += itemTax;
            // setGrandTotal(sub - disc + tax);
            
            // OK, so previously:
            // Subtotal = Gross Sales
            // Discount = Total Discounts
            // Tax = Total Tax
            // Total = Subtotal - Discount + Tax
            
            discountTotal += lineDiscount;
            taxTotal += lineTax;
        });

        // Current subtotal should be the sum of Gross Amounts
        // Then we display Discount
        // Then Tax
        // Then Total
        
        return {
            subtotal,
            discountTotal,
            taxTotal,
            grandTotal: subtotal - discountTotal + taxTotal
        };
    }, [items]);

    const formatCurrency = useCallback((amount: number, currency: string = "VES") => {
        return new Intl.NumberFormat('es-VE', { 
            style: 'currency', 
            currency 
        }).format(amount);
    }, []);

    return {
        ...totals,
        formatCurrency,
        itemCount: items.length
    };
}
