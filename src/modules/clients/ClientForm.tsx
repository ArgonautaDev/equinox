import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  MapPin,
  FileText,
  CreditCard,
} from "lucide-react";
import { clients, CreateClientDto } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  tax_type: z.string().optional(),
  rif_number: z.string().optional(), // Just the numbers: 12345678-9
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

/**
 * Format RIF numbers automatically:
 * - Input: "123456789" -> Output: "12345678-9"
 * - Only allows numbers and the final dash
 */
function formatRifNumber(value: string): string {
  // Remove everything except numbers
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 8) {
    return digits;
  }

  // Format: 8 digits + dash + 1 digit
  const mainPart = digits.slice(0, 8);
  const checkDigit = digits.slice(8, 9);

  return `${mainPart}-${checkDigit}`;
}

export function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      tax_type: "",
      rif_number: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      notes: "",
    },
  });

  const taxType = form.watch("tax_type");

  // Fetch client for editing
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clients.get(id!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (client) {
      // Parse existing tax_id: "J-12345678-9" -> type: "J", number: "12345678-9"
      let parsedTaxType = client.tax_type || "";
      let rifNumber = "";

      if (client.tax_id) {
        const match = client.tax_id.match(/^([VEJGP])-(.+)$/);
        if (match) {
          // If tax_type wasn't stored separately, extract from tax_id
          if (!parsedTaxType) {
            parsedTaxType = match[1];
          }
          rifNumber = match[2];
        } else {
          rifNumber = client.tax_id;
        }
      }

      // Use setValue for each field individually
      form.setValue("code", client.code ?? "");
      form.setValue("name", client.name);
      form.setValue("tax_type", parsedTaxType);
      form.setValue("rif_number", rifNumber);
      form.setValue("email", client.email ?? "");
      form.setValue("phone", client.phone ?? "");
      form.setValue("address", client.address ?? "");
      form.setValue("city", client.city ?? "");
      form.setValue("state", client.state ?? "");
      form.setValue("notes", client.notes ?? "");
    }
  }, [client, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      navigate("/clients");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clients.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      navigate("/clients");
    },
  });

  const onSubmit = (data: FormData) => {
    // Build full tax_id from type + number: "J" + "12345678-9" = "J-12345678-9"
    let fullTaxId: string | undefined;
    if (data.tax_type && data.rif_number) {
      fullTaxId = `${data.tax_type}-${data.rif_number}`;
    } else if (data.rif_number) {
      fullTaxId = data.rif_number;
    }

    if (isEditing) {
      // For updates, include code field
      const updateData = {
        code: data.code || undefined,
        name: data.name,
        tax_id: fullTaxId || undefined,
        tax_type: data.tax_type || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        notes: data.notes || undefined,
      };
      updateMutation.mutate(updateData);
    } else {
      // For create, don't include code (it's auto-generated)
      const createData: CreateClientDto = {
        name: data.name,
        tax_id: fullTaxId || undefined,
        tax_type: data.tax_type || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        notes: data.notes || undefined,
      };
      createMutation.mutate(createData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  if (isEditing && isLoadingClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg hover:bg-secondary transition-colors"
          asChild
        >
          <Link to="/clients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Actualiza la información del cliente"
              : "Registra un nuevo cliente en el sistema"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {String(error)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Information General */}
            <Card className="md:col-span-2 border-primary/15 shadow-sm hover:border-primary/25 transition-all duration-300">
              <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Información General</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 p-6">
                {/* Code - editable */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            isEditing ? "" : "Se genera automáticamente"
                          }
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Deja vacío para generar automáticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre o Razón Social *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Distribuidora ABC, C.A."
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0414-1234567"
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Fiscal Information */}
            <Card className="border-primary/15 shadow-sm hover:border-primary/25 transition-all duration-300">
              <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Información Fiscal</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <FormLabel>RIF / Cédula</FormLabel>
                  <div className="flex gap-2">
                    {/* Type selector */}
                    <FormField
                      control={form.control}
                      name="tax_type"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px] bg-background/50">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="V">V</SelectItem>
                              <SelectItem value="E">E</SelectItem>
                              <SelectItem value="J">J</SelectItem>
                              <SelectItem value="G">G</SelectItem>
                              <SelectItem value="P">P</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Number input with auto-formatting */}
                    <FormField
                      control={form.control}
                      name="rif_number"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="relative">
                              {taxType && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                                  {taxType}-
                                </span>
                              )}
                              <Input
                                placeholder="12345678-9"
                                className={`bg-background/50 ${taxType ? "pl-8 font-mono" : "font-mono"}`}
                                maxLength={10}
                                {...field}
                                onChange={(e) => {
                                  const formatted = formatRifNumber(
                                    e.target.value,
                                  );
                                  field.onChange(formatted);
                                }}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Formato: V-12345678-9
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-primary/15 shadow-sm hover:border-primary/25 transition-all duration-300">
              <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Dirección</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección Detallada</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Av. Principal, Edif. Torre Norte, Piso 5..."
                          className="bg-background/50 min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Maracaibo"
                            className="bg-background/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Zulia"
                            className="bg-background/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="md:col-span-2 border-primary/15 shadow-sm hover:border-primary/25 transition-all duration-300">
              <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Notas Adicionales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Información adicional sobre el cliente..."
                          className="min-h-[100px] bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              className="bg-transparent hover:bg-secondary/50"
              asChild
            >
              <Link to="/clients">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[150px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
