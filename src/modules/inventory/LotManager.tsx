/**
 * LotManager - View and manage inventory lots with expiration tracking
 * Supports lots for both products and variants
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  AlertTriangle,
  Package,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import {
  lots,
  products,
  variants,
  InventoryLot,
  CreateLotDto,
  Product,
  ProductVariant,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryNav } from "./components/InventoryNav";

export function LotManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<InventoryLot | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Form state
  const [formData, setFormData] = useState<CreateLotDto>({
    product_id: "",
    variant_id: undefined,
    lot_number: "",
    quantity: 0,
    cost_price: undefined,
    expiration_date: "",
  });

  // Queries
  const { data: allLots = [], isLoading } = useQuery({
    queryKey: ["lots"],
    queryFn: () => lots.list(),
  });

  const { data: expiringLots = [] } = useQuery({
    queryKey: ["lots", "expiring", 30],
    queryFn: () => lots.getExpiring(30),
  });

  const { data: productsList = [] } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => products.list({ isActive: true }),
  });

  // Fetch variants for the selected product (in dialog)
  const { data: variantsList = [] } = useQuery({
    queryKey: ["variants", formData.product_id],
    queryFn: () => variants.list(formData.product_id),
    enabled: !!formData.product_id,
  });

  // Check if selected product has variants
  const selectedProduct = useMemo(() => {
    return productsList.find((p: Product) => p.id === formData.product_id);
  }, [productsList, formData.product_id]);

  const showVariantSelector = selectedProduct?.has_variants && variantsList.length > 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateLotDto) => lots.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity, reason }: { id: string; quantity: number; reason?: string }) =>
      lots.adjust(id, { quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      setAdjustDialog(null);
      setAdjustAmount(0);
      setAdjustReason("");
    },
  });

  const resetForm = () => {
    setFormData({
      product_id: "",
      variant_id: undefined,
      lot_number: "",
      quantity: 0,
      cost_price: undefined,
      expiration_date: "",
    });
  };

  const handleProductChange = (productId: string) => {
    setFormData({
      ...formData,
      product_id: productId,
      variant_id: undefined, // Reset variant when product changes
    });
  };

  const getProductName = (productId: string) => {
    const product = productsList.find((p: Product) => p.id === productId);
    return product?.name || "Producto desconocido";
  };

  const getDaysUntilExpiration = (expirationDate?: string) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadge = (expirationDate?: string) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return null;
    
    if (days < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">Vence en {days} días</Badge>;
    } else if (days <= 30) {
      return <Badge variant="secondary" className="text-yellow-600">Vence en {days} días</Badge>;
    }
    return <Badge variant="outline">{days} días</Badge>;
  };

  const displayedLots = activeTab === "expiring" ? expiringLots : allLots;

  const expiredCount = allLots.filter((lot: InventoryLot) => {
    const days = getDaysUntilExpiration(lot.expiration_date);
    return days !== null && days < 0;
  }).length;

  const expiringCount = expiringLots.length;

  // Generate automatic lot number
  const generateLotNumber = () => {
    const date = new Date();
    const prefix = "LOT";
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${dateStr}-${random}`;
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      lot_number: generateLotNumber(),
    }));
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Lotes</h1>
          <p className="text-muted-foreground">
            Control de lotes e inventario con fechas de vencimiento
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Lote
        </Button>
      </div>

      <InventoryNav />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Lotes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allLots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer (30 días)</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos los Lotes ({allLots.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Por Vencer ({expiringCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando lotes...
            </div>
          ) : displayedLots.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/30">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {activeTab === "expiring" ? "No hay lotes próximos a vencer" : "No hay lotes registrados"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Producto / Variante</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead>Fecha Recepción</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedLots.map((lot: InventoryLot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono font-medium">
                        {lot.lot_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getProductName(lot.product_id)}</span>
                          {lot.variant_id && (
                            <span className="text-xs text-muted-foreground">
                              Variante: {lot.variant_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {lot.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {lot.cost_price ? `$${lot.cost_price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(lot.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {lot.expiration_date ? (
                          <div className="flex items-center gap-2">
                            {new Date(lot.expiration_date).toLocaleDateString()}
                            {getExpirationBadge(lot.expiration_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin vencimiento</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustDialog(lot)}
                        >
                          <ArrowUpDown className="h-4 w-4 mr-1" />
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Lot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Lote</DialogTitle>
            <DialogDescription>
              Registra un nuevo lote de inventario para un producto o variante
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Product selector */}
            <div className="space-y-2">
              <Label htmlFor="product">Producto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={handleProductChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {productsList.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.has_variants && (
                          <Badge variant="outline" className="text-xs">
                            Con variantes
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variant selector - only shown if product has variants */}
            {showVariantSelector && (
              <div className="space-y-2">
                <Label htmlFor="variant">Variante *</Label>
                <Select
                  value={formData.variant_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, variant_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una variante" />
                  </SelectTrigger>
                  <SelectContent>
                    {variantsList.map((variant: ProductVariant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name} {variant.sku && `(${variant.sku})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Este producto tiene variantes. Selecciona a cuál variante pertenece el lote.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_number">Número de Lote *</Label>
                <Input
                  id="lot_number"
                  value={formData.lot_number}
                  onChange={(e) =>
                    setFormData({ ...formData, lot_number: e.target.value })
                  }
                  placeholder="LOT-20260120-001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                      cost_price: parseFloat(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Fecha Vencimiento</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={formData.expiration_date || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expiration_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={
                !formData.product_id ||
                !formData.lot_number ||
                !formData.quantity ||
                (showVariantSelector && !formData.variant_id) ||
                createMutation.isPending
              }
            >
              Crear Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Lot Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Lote</DialogTitle>
            <DialogDescription>
              Lote: {adjustDialog?.lot_number} | Cantidad actual: {adjustDialog?.quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjust_amount">Cantidad a Ajustar</Label>
              <Input
                id="adjust_amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                placeholder="Positivo para agregar, negativo para restar"
              />
              <p className="text-sm text-muted-foreground">
                Nueva cantidad: {(adjustDialog?.quantity || 0) + adjustAmount}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust_reason">Razón (opcional)</Label>
              <Input
                id="adjust_reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej: Ajuste por inventario"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                adjustDialog &&
                adjustMutation.mutate({
                  id: adjustDialog.id,
                  quantity: adjustAmount,
                  reason: adjustReason || undefined,
                })
              }
              disabled={adjustAmount === 0 || adjustMutation.isPending}
            >
              Aplicar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
