/**
 * Client Form Page (Create/Edit)
 */

import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

      // Use setValue for each field individually - works better with Select
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
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/clients">Clientes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
        </h1>
      </div>

      {/* Form */}
      <Form {...form} key={client?.id || 'new'}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
              {String(error)}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {/* Code - editable */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isEditing ? "" : "Se genera automáticamente"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
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
                      <Input placeholder="Ej: Distribuidora ABC, C.A." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RIF/Cédula - combined input with type prefix */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  RIF / Cédula
                </label>
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
                          key={`tax-type-${client?.id || 'new'}-${field.value || 'empty'}`}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Tipo" />
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
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                                {taxType}-
                              </span>
                            )}
                            <Input
                              placeholder="12345678-9"
                              className={taxType ? "pl-10 font-mono" : "font-mono"}
                              maxLength={10}
                              {...field}
                              onChange={(e) => {
                                const formatted = formatRifNumber(e.target.value);
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
                  Formato: V-12345678-9 (el guión final se agrega automáticamente)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="0414-1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Av. Principal, Edif. Torre Norte, Piso 5, Oficina 502" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Maracaibo" {...field} />
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
                      <Input placeholder="Zulia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el cliente..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/clients">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
