import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  invoices as invoicesApi,
  settings,
  clients as clientsApi,
  CreateInvoiceDto,
} from "@/lib/tauri";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ProductSelector } from "./ProductSelector";
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
  items: z
    .array(
      z.object({
        product_id: z.string(),
        variant_id: z.string().optional(),
        description: z.string(),
        quantity: z.coerce.number().min(0.01, "Cantidad mínima 0.01"),
        unit_price: z.coerce.number().min(0, "Precio no puede ser negativo"),
        discount_percent: z.coerce.number().min(0).max(100).default(0),
        tax_rate: z.coerce.number().min(0).default(0),
        original_sku: z.string().optional(),
      }),
    )
    .min(1, "Debe agregar al menos un ítem"),
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

  const { subtotal, taxTotal, grandTotal } = useInvoiceCalculation(
    form.control,
  );

  const paymentTerms = form.watch("payment_terms");
  const issueDate = form.watch("issue_date");
  const dueDate = form.watch("due_date");
  const currency = form.watch("currency");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.list({ isActive: true }),
  });

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: settings.getCompanySettings,
  });

  const { data: sequence } = useQuery({
    queryKey: ["invoice-sequence"],
    queryFn: settings.getInvoiceSequence,
  });

  const formatInvoiceNumber = (pattern: string, prefix: string, number: number, clientName?: string, clientCode?: string) => {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const numberStr = number.toString().padStart(8, '0');
      
      let clientIdentifier = "CLI";
      if (clientCode && clientCode.trim()) {
          clientIdentifier = clientCode;
      } else if (clientName) {
          const cleanName = clientName.toUpperCase().replace(/[^A-Z0-9\s]/g, ""); // Keep spaces for splitting
          const words = cleanName.split(/\s+/).filter(w => w.length > 0);
          
          if (words.length === 0) {
              clientIdentifier = "CLI";
          } else if (words.length === 1) {
              // Single word: first 3 chars
              clientIdentifier = words[0].substring(0, 3);
          } else {
              // Multi word: initials of first 3 words
              clientIdentifier = words.slice(0, 3).map(w => w[0]).join("");
          }
      }

      return pattern
        .replace("{PREFIX}", prefix)
        .replace("{NUMBER}", numberStr)
        .replace("{YEAR}", year)
        .replace("{MONTH}", month)
        .replace("{CLIENT}", clientIdentifier);
  };

  // const { dirtyFields } = form.formState;

  const initializedCurrency = useRef(false);

  useEffect(() => {
    if (companySettings?.default_currency && !initializedCurrency.current) {
      console.log("Initializing default currency:", companySettings.default_currency);
      form.setValue("currency", companySettings.default_currency);
      initializedCurrency.current = true;
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
    form.setValue(
      "due_date",
      daysToAdd > 0 ? addDays(issueDate, daysToAdd) : issueDate,
    );
  }, [paymentTerms, issueDate, form]);

  // State to track if we should issue after creating
  const [shouldIssue, setShouldIssue] = useState(false);

  const createInvoice = useMutation({
    mutationFn: (data: InvoiceFormValues) => {
      const dto: CreateInvoiceDto = {
        ...data,
        invoice_type: "standard",
        issue_date: data.issue_date.toISOString(),
        due_date: data.due_date?.toISOString(),
      };
      console.log("Creating invoice with DTO:", dto);
      return invoicesApi.create(dto);
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (shouldIssue && invoice?.id) {
         issueInvoice.mutate(invoice.id);
      } else {
         toast.success("Factura borrador creada exitosamente");
         navigate("/invoices");
      }
    },
    onError: (err: Error) => {
      toast.error("Error al crear factura: " + err.message);
      setShouldIssue(false);
    },
  });

  const issueInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.issue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura emitida exitosamente");
      navigate("/invoices");
    },
    onError: (err: Error) => {
      toast.error("Error al emitir factura: " + err.message);
    },
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

    toast.error(
      `Por favor complete los campos requeridos: ${missingFields.join(", ") || "Revise el formulario"}`,
    );
  };

  const handleIssue = () => {
    setShouldIssue(true);
    form.handleSubmit(onSubmit, (err) => {
        onError(err);
        setShouldIssue(false);
    })();
  };

  const handlePrint = () => {
    toast.info("Generando vista previa de impresión...");
    window.print();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="min-h-screen bg-background font-sans text-foreground animate-fade-in"
      >
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
                  type="button"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Nueva Factura
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Generar nueva factura de venta
                    {sequence && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        Próxima: {formatInvoiceNumber(
                          sequence.pattern, 
                          sequence.prefix, 
                          sequence.next_number,
                          form.watch("client_name_display") // Watch client name to update preview
                        )}
                      </span>
                    )} // Watch client name to update preview
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
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
                        <FormLabel className="text-sm font-medium">
                          Cliente
                        </FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const client = clients?.find((c) => c.id === val);
                            if (client) {
                              form.setValue("client_name_display", client.name);
                              form.setValue(
                                "client_tax_id_display",
                                client.tax_id || "",
                              );
                              form.setValue(
                                "client_email_display",
                                client.email || "",
                              );
                              form.setValue(
                                "client_phone_display",
                                client.phone || "",
                              );
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
                        <FormLabel className="text-sm font-medium">
                          Condición de Pago
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="contado">Contado</SelectItem>
                            <SelectItem value="credito_1">
                              Crédito 1 día
                            </SelectItem>
                            <SelectItem value="credito_3">
                              Crédito 3 días
                            </SelectItem>
                            <SelectItem value="credito_7">
                              Crédito 7 días
                            </SelectItem>
                            <SelectItem value="credito_15">
                              Crédito 15 días
                            </SelectItem>
                            <SelectItem value="credito_30">
                              Crédito 30 días
                            </SelectItem>
                            <SelectItem value="credito_60">
                              Crédito 60 días
                            </SelectItem>
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
                        <FormLabel className="text-sm font-medium">
                          Fecha Emisión
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined,
                              )
                            }
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
                        <FormLabel className="text-sm font-medium">
                          Fecha Vencimiento
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            disabled
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            className="bg-input border-border opacity-60"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Currency */}
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          Moneda
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                        <FormLabel className="text-sm font-medium">
                          Tasa de Cambio
                        </FormLabel>
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
                    Artículos
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
                  <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border">
                    <div className="col-span-5">Descripción</div>
                    <div className="col-span-2">Cantidad</div>
                    <div className="col-span-3">Precio Unitario</div>
                    <div className="col-span-2 text-right">Acciones</div>
                  </div>

                  {fields.length > 0 ? (
                    fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center p-3 md:p-0 bg-secondary/30 md:bg-transparent rounded-lg md:rounded-none md:border-b md:border-border/50 md:pb-3 hover:bg-secondary/10 transition-colors"
                      >
                        <div className="md:col-span-5">
                          <label className="text-xs font-medium text-muted-foreground md:hidden block mb-1">
                            Descripción
                          </label>
                          <Input
                            value={form.getValues(`items.${index}.description`)}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Use form.setValue directly for better perf or re-render if needed, field array needs care
                              form.setValue(`items.${index}.description`, val);
                            }}
                            className="bg-transparent border-transparent hover:border-border focus:border-primary"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground md:hidden block mb-1">
                            Cantidad
                          </label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            {...form.register(
                              `items.${index}.quantity` as const,
                            )}
                            className="bg-transparent border-transparent hover:border-border focus:border-primary"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground md:hidden block mb-1">
                            Precio Unitario
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...form.register(
                              `items.${index}.unit_price` as const,
                            )}
                            className="bg-transparent border-transparent hover:border-border focus:border-primary"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
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
                          className="bg-input border-border min-h-24 resize-none focus:ring-primary/20"
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
            <div className="lg:col-span-1">
              <div className="sticky top-24">
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
      </form>
    </Form>
  );
}
