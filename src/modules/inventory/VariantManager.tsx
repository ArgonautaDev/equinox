/**
 * VariantManager - Embedded component for managing product variants
 * Used within ProductForm when has_variants is enabled
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, X } from "lucide-react";
import {
  variants,
  ProductVariant,
  CreateVariantDto,
  UpdateVariantDto,
} from "@/lib/tauri";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

interface VariantManagerProps {
  productId: string;
  productName: string;
}

interface AttributePair {
  key: string;
  value: string;
}

// Helper to convert attributes JSON to array of pairs
function parseAttributes(jsonStr: string | undefined): AttributePair[] {
  if (!jsonStr) return [];
  try {
    const obj = JSON.parse(jsonStr);
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  } catch {
    return [];
  }
}

// Helper to convert array of pairs to JSON string
function stringifyAttributes(pairs: AttributePair[]): string {
  const filtered = pairs.filter((p) => p.key.trim() !== "");
  if (filtered.length === 0) return "";
  const obj: Record<string, string> = {};
  filtered.forEach((p) => {
    obj[p.key.trim()] = p.value.trim();
  });
  return JSON.stringify(obj);
}

export function VariantManager({ productId, productName }: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [deleteVariant, setDeleteVariant] = useState<ProductVariant | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Omit<CreateVariantDto, 'attributes'>>({
    product_id: productId,
    name: "",
    sku: "",
    cost_price: 0,
    sale_price: 0,
    barcode: "",
  });
  
  // Attribute pairs state (separate for UX)
  const [attributePairs, setAttributePairs] = useState<AttributePair[]>([]);

  // Queries
  const { data: variantsList = [], isLoading } = useQuery({
    queryKey: ["variants", productId],
    queryFn: () => variants.list(productId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateVariantDto) => variants.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", productId] });
      resetForm();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVariantDto }) =>
      variants.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", productId] });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => variants.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", productId] });
      setDeleteVariant(null);
    },
  });

  const resetForm = () => {
    setFormData({
      product_id: productId,
      name: "",
      sku: "",
      cost_price: 0,
      sale_price: 0,
      barcode: "",
    });
    setAttributePairs([]);
    setEditingVariant(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      product_id: productId,
      name: variant.name,
      sku: variant.sku || "",
      cost_price: variant.cost_price,
      sale_price: variant.sale_price,
      barcode: variant.barcode || "",
    });
    setAttributePairs(parseAttributes(variant.attributes));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const attributes = stringifyAttributes(attributePairs);
    
    if (editingVariant) {
      updateMutation.mutate({
        id: editingVariant.id,
        data: {
          name: formData.name,
          sku: formData.sku || undefined,
          attributes: attributes || undefined,
          cost_price: formData.cost_price,
          sale_price: formData.sale_price,
          barcode: formData.barcode || undefined,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        attributes: attributes || undefined,
      });
    }
  };

  const calcMargin = () => {
    if (!formData.cost_price || formData.cost_price === 0) return 0;
    return (
      ((formData.sale_price! - formData.cost_price) / formData.cost_price) *
      100
    ).toFixed(1);
  };

  // Attribute pair handlers
  const addAttributePair = () => {
    setAttributePairs([...attributePairs, { key: "", value: "" }]);
  };

  const updateAttributePair = (index: number, field: "key" | "value", value: string) => {
    const newPairs = [...attributePairs];
    newPairs[index][field] = value;
    setAttributePairs(newPairs);
  };

  const removeAttributePair = (index: number) => {
    setAttributePairs(attributePairs.filter((_, i) => i !== index));
  };

  // Format attributes for display in table
  const formatAttributesDisplay = (attributes: string | undefined) => {
    if (!attributes) return null;
    try {
      const obj = JSON.parse(attributes);
      return Object.entries(obj).map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-xs mr-1">
          {key}: {String(value)}
        </Badge>
      ));
    } catch {
      return <span className="text-muted-foreground text-xs">{attributes}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Variantes del Producto</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las variantes de {productName}
          </p>
        </div>
        <Button type="button" onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Variante
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando variantes...
        </div>
      ) : variantsList.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No hay variantes creadas</p>
          <Button type="button" variant="link" onClick={openCreateDialog}>
            Crear primera variante
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variantsList.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-sm">
                    {variant.sku || "-"}
                  </TableCell>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell>
                    {formatAttributesDisplay(variant.attributes) || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    ${variant.cost_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${variant.sale_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {variant.stock_quantity}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(variant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteVariant(variant)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Editar Variante" : "Nueva Variante"}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? "Modifica los datos de la variante"
                : "Agrega una nueva variante al producto"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Azul Grande"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Auto-generado"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Key-Value Attributes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Atributos</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addAttributePair}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
              
              {attributePairs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Sin atributos. Agrega atributos como Color, Talla, Material, etc.
                </p>
              ) : (
                <div className="space-y-2">
                  {attributePairs.map((pair, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={pair.key}
                        onChange={(e) => updateAttributePair(index, "key", e.target.value)}
                        placeholder="Tipo (ej: Color)"
                        className="flex-1"
                      />
                      <Input
                        value={pair.value}
                        onChange={(e) => updateAttributePair(index, "value", e.target.value)}
                        placeholder="Valor (ej: Azul)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttributePair(index)}
                        className="h-8 w-8 shrink-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Precio Costo</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Precio Venta</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sale_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Margen</Label>
                <div className="h-10 flex items-center text-sm font-medium">
                  {calcMargin()}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode || ""}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingVariant ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVariant} onOpenChange={() => setDeleteVariant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar variante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la variante "{deleteVariant?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVariant && deleteMutation.mutate(deleteVariant.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
