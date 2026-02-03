import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoices as invoicesApi, settings, clients as clientsApi, CreateInvoiceDto } from "@/lib/tauri";
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ProductSelector } from "./ProductSelector";
// import { InvoicePreview } from "./components/InvoicePreview"; // Preview removed or moved to modal/print view if needed
import { InvoiceItemRow } from "./components/InvoiceItemRow";
import { InvoiceSummary } from "./components/InvoiceSummary";
import { useInvoiceCalculation } from "./hooks/useInvoiceCalculation";

const invoiceSchema = z.object({
    client_id: z.string().min(1, "El cliente es requerido"),
    client_name_display: z.string().optional(),
    client_tax_id_display: z.string().optional(),
    client_email_display: z.string().optional(),
    client_phone_display: z.string().optional(),
    price_list_id: z.string().optional(),
    currency: z.string().default("VES"),
    exchange_rate: z.coerce.number().min(0.0001, "Tasa de cambio inválida"),
    issue_date: z.date(),
    due_date: z.date().optional(),
    payment_terms: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
        product_id: z.string(),
        variant_id: z.string().optional(),
        description: z.string(),
        quantity: z.coerce.number().min(0.01, "Cantidad mínima 0.01"),
        unit_price: z.coerce.number().min(0, "Precio no puede ser negativo"),
        discount_percent: z.coerce.number().min(0).max(100).default(0),
        tax_rate: z.coerce.number().min(0).default(0),
        original_sku: z.string().optional(),
    })).min(1, "Debe agregar al menos un ítem"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function InvoiceForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Setup Form
    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema) as any,
        defaultValues: {
            currency: "VES",
            exchange_rate: 1,
            issue_date: new Date(),
            items: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const { subtotal, taxTotal, grandTotal } = useInvoiceCalculation(form.control);

    const paymentTerms = form.watch("payment_terms");
    const issueDate = form.watch("issue_date");
    const dueDate = form.watch("due_date");
    const currency = form.watch("currency");

    const { data: clients } = useQuery({ 
        queryKey: ["clients"], 
        queryFn: () => clientsApi.list({ isActive: true }) 
    });

    const { data: companySettings } = useQuery({
        queryKey: ["companySettings"],
        queryFn: settings.getCompanySettings
    });

    useEffect(() => {
        if (companySettings?.default_currency) {
            form.setValue("currency", companySettings.default_currency);
        }
    }, [companySettings, form]);

    useEffect(() => {
        if (!paymentTerms || !issueDate) return;
        let daysToAdd = 0;
        if (paymentTerms === "contado") daysToAdd = 0;
        else if (paymentTerms.startsWith("credito_")) {
            const parts = paymentTerms.split("_");
            if (parts.length === 2) daysToAdd = parseInt(parts[1], 10) || 0;
        }
        form.setValue("due_date", daysToAdd > 0 ? addDays(issueDate, daysToAdd) : issueDate);
    }, [paymentTerms, issueDate, form]);

    const createInvoice = useMutation({
        mutationFn: (data: InvoiceFormValues) => {
            const dto: CreateInvoiceDto = {
                ...data,
                invoice_type: "standard",
                issue_date: data.issue_date.toISOString(),
                due_date: data.due_date?.toISOString(),
            };
            return invoicesApi.create(dto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast.success("Factura borrador creada exitosamente");
            navigate("/invoices");
        },
        onError: (err: Error) => {
            toast.error("Error al crear factura: " + err.message);
        }
    });

    const onSubmit = (data: InvoiceFormValues) => {
        createInvoice.mutate(data);
    };

    const handleAddProduct = (product: any) => {
        append({
            product_id: product.id,
            description: product.name,
            quantity: 1,
            unit_price: product.sale_price,
            discount_percent: 0,
            tax_rate: product.tax_rate || 0,
            original_sku: product.sku,
        });
        toast.success("Producto agregado");
    };

    const onError = (errors: any) => {
        const missingFields = [];
        if (errors.client_id) missingFields.push("Cliente");
        if (errors.items) missingFields.push("Items");
        if (errors.issue_date) missingFields.push("Fecha de emisión");
        
        toast.error(`Por favor complete los campos requeridos: ${missingFields.join(", ") || "Revise el formulario"}`);
    };

    const handleIssue = () => {
        toast.info("Funcionalidad de emisión directa en desarrollo. Guardando como borrador.");
        form.handleSubmit(onSubmit, onError)();
    };

    const handlePrint = () => {
        toast.info("Generando vista previa de impresión...");
        window.print();
    };

    return (
        <Form {...form}>
            <div className="min-h-screen bg-background font-sans text-foreground">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="border-b bg-card">
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-lg hover:bg-secondary transition-colors"
                                    onClick={() => navigate("/invoices")}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Nueva Factura
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        Generar nueva factura de venta
                                    </p>
                                </div>
                            </div>
                            
                            {/* Header Actions (Optional secondary actions) */}
                            {/* <div className="flex items-center gap-3"></div> */}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                        {/* Main Content (Left Column) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Client Details */}
                            <Card className="p-6 bg-card border-border shadow-sm">
                                <h2 className="text-lg font-semibold mb-6 text-foreground">
                                    Detalles del Cliente
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Client */}
                                    <FormField
                                        control={form.control}
                                        name="client_id"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Cliente</FormLabel>
                                                <Select 
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        const client = clients?.find(c => c.id === val);
                                                        if (client) {
                                                            form.setValue("client_name_display", client.name);
                                                            form.setValue("client_tax_id_display", client.tax_id || "");
                                                            form.setValue("client_email_display", client.email || "");
                                                            form.setValue("client_phone_display", client.phone || "");
                                                        }
                                                    }} 
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-input border-border">
                                                            <SelectValue placeholder="Seleccionar Cliente" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {clients?.map((client) => (
                                                            <SelectItem key={client.id} value={client.id}>
                                                                {client.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Payment Terms */}
                                    <FormField
                                        control={form.control}
                                        name="payment_terms"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Condición de Pago</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-input border-border">
                                                            <SelectValue placeholder="Seleccionar" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="contado">Contado</SelectItem>
                                                        <SelectItem value="credito_1">Crédito 1 día</SelectItem>
                                                        <SelectItem value="credito_3">Crédito 3 días</SelectItem>
                                                        <SelectItem value="credito_7">Crédito 7 días</SelectItem>
                                                        <SelectItem value="credito_15">Crédito 15 días</SelectItem>
                                                        <SelectItem value="credito_30">Crédito 30 días</SelectItem>
                                                        <SelectItem value="credito_60">Crédito 60 días</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Issue Date */}
                                    <FormField
                                        control={form.control}
                                        name="issue_date"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Fecha Emisión</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                        className="bg-input border-border"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Due Date */}
                                    <FormField
                                        control={form.control}
                                        name="due_date"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Fecha Vencimiento</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        disabled
                                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                        className="bg-input border-border opacity-60"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Currency Selection - Added from old form to keep functionality */}
                                    <FormField
                                        control={form.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Moneda</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-input border-border">
                                                            <SelectValue placeholder="Moneda" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="VES">Bolívares (VES)</SelectItem>
                                                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                                                        <SelectItem value="EUR">Euros (EUR)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                     <FormField
                                        control={form.control}
                                        name="exchange_rate"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Tasa de Cambio</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001" 
                                                        className="bg-input border-border"
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Card>

                            {/* Items Section */}
                            <Card className="p-6 bg-card border-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Items de Factura
                                    </h2>
                                    <ProductSelector 
                                        onSelect={handleAddProduct}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                                                type="button"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Agregar Producto
                                            </Button>
                                        }
                                    />
                                </div>
                                <div className="space-y-3">
                                    {fields.length > 0 ? (
                                        fields.map((field, index) => (
                                            <InvoiceItemRow 
                                                key={field.id} 
                                                index={index} 
                                                onRemove={() => remove(index)} 
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-muted-foreground mb-4">
                                                No hay items agregados
                                            </p>
                                            <ProductSelector 
                                                onSelect={handleAddProduct}
                                                trigger={
                                                     <Button
                                                        variant="outline"
                                                        className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                                                        type="button"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Agregar Producto
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Notes Section */}
                            <Card className="p-6 bg-card border-border shadow-sm">
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-lg font-semibold mb-4 block text-foreground">
                                                Notas Adicionales
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Instrucciones de pago, notas de entrega..."
                                                    className="bg-input border-border min-h-24 resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Card>

                        </div>

                        {/* Sidebar Summary (Right Column) */}
                        <div>
                            <InvoiceSummary
                                subtotal={subtotal}
                                taxes={taxTotal}
                                total={grandTotal}
                                status="Borrador"
                                issueDate={issueDate}
                                dueDate={dueDate}
                                paymentTerms={paymentTerms}
                                onIssue={handleIssue}
                                onSave={form.handleSubmit(onSubmit, onError)}
                                onPrint={handlePrint}
                                isSaving={createInvoice.isPending}
                                currency={currency}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Form>
    );
}
