import { useFormContext, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { products as productsApi, variants as variantsApi } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";

interface InvoiceItemRowProps {
    index: number;
    onRemove: () => void;
}

export function InvoiceItemRow({ index, onRemove }: InvoiceItemRowProps) {
    const { control, register, setValue } = useFormContext();
    const productId = useWatch({ control, name: `items.${index}.product_id` });
    const variantId = useWatch({ control, name: `items.${index}.variant_id` });

    // Watch values for calculating row total (display only)
    const quantity = useWatch({ control, name: `items.${index}.quantity` }) || 0;
    const unitPrice = useWatch({ control, name: `items.${index}.unit_price` }) || 0;
    const discountPercent = useWatch({ control, name: `items.${index}.discount_percent` }) || 0;
    const taxRate = useWatch({ control, name: `items.${index}.tax_rate` }) || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    // Fetch product details to know if it has variants
    const { data: variants } = useQuery({
        queryKey: ["variants", productId],
        queryFn: () => variantsApi.list(productId),
        enabled: !!productId
    });

    const hasVariants = variants && variants.length > 0;

    // Fetch product details for base info (needed for reset)
    const { data: product } = useQuery({
        queryKey: ["product", productId],
        queryFn: () => productsApi.get(productId),
        enabled: !!productId
    });

    // Effect: Update price and SKU when variant changes OR when switching back to base
    useEffect(() => {
        if (!hasVariants) return;

        if (variantId && variantId !== "base") {
            const variant = variants?.find(v => v.id === variantId);
            if (variant) {
                setValue(`items.${index}.unit_price`, variant.sale_price);
                setValue(`items.${index}.original_sku`, variant.sku);
                setValue(`items.${index}.description`, `${variant.name} ${variant.sku ? `(${variant.sku})` : ''}`);
            }
        } else if (product && (variantId === "base" || variantId === null)) {
            // Restore base product values
            setValue(`items.${index}.unit_price`, product.sale_price);
            setValue(`items.${index}.original_sku`, product.sku);
            setValue(`items.${index}.description`, product.name);
        }
    }, [variantId, variants, product, setValue, index, hasVariants]);

    return (
        <div className="border rounded-lg p-4 bg-card hover:border-primary/30 transition-colors mb-4 shadow-sm">
            {/* Description Row */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                     <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                        Descripción
                    </label>
                    <Input 
                        {...register(`items.${index}.description`)} 
                        className="bg-input border-border"
                        placeholder="Nombre del producto"
                        readOnly={true /* Modify if description should be editable */}
                    />
                </div>
                
                         {hasVariants ? (
                            <FormField
                                control={control}
                                name={`items.${index}.variant_id`}
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Var.</label>
                                        <Select 
                                            onValueChange={(val) => {
                                                field.onChange(val === "base" ? null : val);
                                            }} 
                                            value={field.value || "base"}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="bg-input border-border">
                                                    <SelectValue placeholder="Variante" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="base">Producto Principal</SelectItem>
                                                {variants.map((v) => (
                                                    <SelectItem key={v.id} value={v.id}>
                                                        {v.name} {v.sku ? `(${v.sku})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        ) : (
                           <div className="hidden md:block"></div>
                        )}
            </div>

            {/* Grid of fields */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-2">
                {/* Cantidad */}
                <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                             <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Cant.</label>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    className="bg-input border-border text-center"
                                    min="0"
                                    {...field} 
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Precio Unitario */}
                <FormField
                    control={control}
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Precio Unit.</label>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    className="bg-input border-border text-center font-mono" 
                                    min="0"
                                    {...field} 
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Descuento % */}
                <FormField
                    control={control}
                    name={`items.${index}.discount_percent`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Desc %</label>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    className="bg-input border-border text-center" 
                                    min="0"
                                    max="100"
                                    {...field} 
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* IVA % */}
                <FormField
                    control={control}
                    name={`items.${index}.tax_rate`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">IVA %</label>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    className="bg-input border-border text-center" 
                                    min="0"
                                    max="100"
                                    {...field} 
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Total Column (Display Only) */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Total</label>
                    <div className="h-10 px-3 py-2 bg-secondary rounded text-center font-semibold text-foreground text-sm flex items-center justify-center font-mono">
                         {total.toFixed(2)}
                    </div>
                </div>

                {/* Delete Button */}
                <div className="flex items-end">
                    <Button
                        onClick={onRemove}
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive h-10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Footer for Row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t text-xs">
                 <div className="col-span-2 md:col-span-3 text-muted-foreground flex items-center">
                   Subtotal: <span className="ml-2 font-mono font-medium text-foreground">{subtotal.toFixed(2)}</span>
                </div>
                <div className="text-right text-muted-foreground">
                    Desc: <span className="ml-1 font-mono text-destructive">-{discountAmount.toFixed(2)}</span>
                </div>
                 <div className="text-right text-muted-foreground">
                    Impuestos: <span className="ml-1 font-mono text-primary">+{taxAmount.toFixed(2)}</span>
                </div>
                <div></div>
            </div>
        </div>
    );
}
