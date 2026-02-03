import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  settings,
  type TaxSetting,
  type CreateTaxSettingDto,
  type UpdateTaxSettingDto,
} from "@/lib/tauri";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const taxSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  rate: z.number().min(0, "La tasa debe ser mayor o igual a 0"),
  applies_to: z.string().min(1, "Debe seleccionar a qué aplica"),
  is_active: z.boolean(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export function TaxSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxSetting | null>(null);
  const [deleteTaxId, setDeleteTaxId] = useState<string | null>(null);

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ["tax-settings"],
    queryFn: settings.listTaxSettings,
  });

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      name: "",
      rate: 16,
      applies_to: "all",
      is_active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaxSettingDto) => settings.createTaxSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-settings"] });
      toast.success("Impuesto creado correctamente");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaxSettingDto }) =>
      settings.updateTaxSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-settings"] });
      toast.success("Impuesto actualizado correctamente");
      setDialogOpen(false);
      setEditingTax(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settings.deleteTaxSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-settings"] });
      toast.success("Impuesto eliminado correctamente");
      setDeleteTaxId(null);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const onSubmit = (data: TaxFormValues) => {
    if (editingTax) {
      updateMutation.mutate({ id: editingTax.id, data });
    } else {
      createMutation.mutate(data as CreateTaxSettingDto);
    }
  };

  const handleEdit = (tax: TaxSetting) => {
    setEditingTax(tax);
    form.reset({
      name: tax.name,
      rate: tax.rate,
      applies_to: tax.applies_to,
      is_active: tax.is_active,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTax(null);
    form.reset({
      name: "",
      rate: 16,
      applies_to: "all",
      is_active: true,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Configuración de Impuestos
            </h2>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Impuesto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTax ? "Editar Impuesto" : "Nuevo Impuesto"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="IVA, IGTF, ISR..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tasa (%) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="16.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applies_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aplica a *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="products">Productos</SelectItem>
                            <SelectItem value="services">Servicios</SelectItem>
                            <SelectItem value="foreign_currency">
                              Divisas
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingTax(null);
                        form.reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                    >
                      {(createMutation.isPending ||
                        updateMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingTax ? "Guardar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : taxes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay impuestos configurados
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tasa</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>{tax.rate}%</TableCell>
                    <TableCell className="capitalize">
                      {tax.applies_to}
                    </TableCell>
                    <TableCell>
                      {tax.is_active ? (
                        <Badge
                          variant="default"
                          className="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(tax)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTaxId(tax.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteTaxId}
          onOpenChange={() => setDeleteTaxId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar impuesto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El impuesto será eliminado
                permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteTaxId && deleteMutation.mutate(deleteTaxId)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
