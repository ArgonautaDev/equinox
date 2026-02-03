/**
 * Stock View Page - View and adjust inventory stock for products and variants
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Package, AlertTriangle, Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { products, variants, Product, ProductVariant } from "@/lib/tauri";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdjustmentType = "add" | "subtract";
type AdjustTarget = { type: "product"; item: Product } | { type: "variant"; item: ProductVariant };
import { InventoryNav } from "./components/InventoryNav";

export function StockView() {
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", "stock", search, showLowStock],
    queryFn: () =>
      products.list({
        search: search || undefined,
        isActive: true,
        lowStock: showLowStock || undefined,
      }),
  });

  // Fetch low stock products
  const { data: lowStockData } = useQuery({
    queryKey: ["products", "lowStock"],
    queryFn: () => products.getLowStock(),
  });

  // Adjust product stock mutation
  const adjustProductMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason?: string }) =>
      products.adjustStock(productId, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeAdjustDialog();
    },
  });

  // Adjust variant stock mutation
  const adjustVariantMutation = useMutation({
    mutationFn: ({ variantId, quantity, reason }: { variantId: string; quantity: number; reason?: string }) =>
      variants.adjustStock(variantId, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeAdjustDialog();
    },
  });

  const openAdjustDialog = (target: AdjustTarget, type: AdjustmentType) => {
    setAdjustTarget(target);
    setAdjustmentType(type);
    setAdjustmentQty(0);
    setAdjustmentReason("");
  };

  const closeAdjustDialog = () => {
    setAdjustTarget(null);
    setAdjustmentQty(0);
    setAdjustmentReason("");
  };

  const handleAdjust = () => {
    if (!adjustTarget || adjustmentQty <= 0) return;
    
    const finalQty = adjustmentType === "add" ? adjustmentQty : -adjustmentQty;
    
    if (adjustTarget.type === "product") {
      adjustProductMutation.mutate({
        productId: adjustTarget.item.id,
        quantity: finalQty,
        reason: adjustmentReason || undefined,
      });
    } else {
      adjustVariantMutation.mutate({
        variantId: adjustTarget.item.id,
        quantity: finalQty,
        reason: adjustmentReason || undefined,
      });
    }
  };

  const toggleExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const lowStockCount = lowStockData?.length || 0;

  const getStockStatus = (current: number, min: number, max: number) => {
    if (min > 0 && current <= min) {
      return { label: "Bajo", color: "destructive" as const };
    }
    if (max > 0 && current >= max) {
      return { label: "Alto", color: "secondary" as const };
    }
    return { label: "Normal", color: "default" as const };
  };

  const getAdjustItemStock = () => {
    if (!adjustTarget) return 0;
    return adjustTarget.type === "product" 
      ? (adjustTarget.item as Product).stock_quantity 
      : (adjustTarget.item as ProductVariant).stock_quantity;
  };

  const getAdjustItemName = () => {
    if (!adjustTarget) return "";
    return adjustTarget.type === "product" 
      ? (adjustTarget.item as Product).name 
      : (adjustTarget.item as ProductVariant).name;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Control de Stock</h1>
        <p className="text-muted-foreground">
          Visualiza y ajusta el inventario de productos y variantes
        </p>
      </div>

      <InventoryNav />

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Stock Bajo Detectado
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {lowStockCount} producto(s) necesitan reabastecimiento
            </p>
          </div>
          <Button
            variant={showLowStock ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            {showLowStock ? "Ver todos" : "Ver stock bajo"}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={showLowStock ? "low" : "all"}
          onValueChange={(v) => setShowLowStock(v === "low")}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Package className="h-4 w-4" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="low" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Stock Bajo
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {lowStockCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stock Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          Error al cargar productos: {String(error)}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {showLowStock ? "No hay productos con stock bajo" : "No hay productos"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Mín</TableHead>
                <TableHead className="text-center">Máx</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((product) => (
                <ProductStockRow
                  key={product.id}
                  product={product}
                  isExpanded={expandedProducts.has(product.id)}
                  onToggleExpand={() => toggleExpand(product.id)}
                  onAdjust={(target, type) => openAdjustDialog(target, type)}
                  getStockStatus={getStockStatus}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustTarget} onOpenChange={() => closeAdjustDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustmentType === "add" ? (
                <Plus className="h-5 w-5 text-green-600" />
              ) : (
                <Minus className="h-5 w-5 text-red-600" />
              )}
              {adjustmentType === "add" ? "Agregar Stock" : "Restar Stock"}
              {adjustTarget?.type === "variant" && (
                <Badge variant="secondary" className="ml-2">Variante</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {getAdjustItemName()} - Stock actual: <strong>{getAdjustItemStock()}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              {adjustTarget && adjustmentQty > 0 && (
                <p className="text-sm text-muted-foreground">
                  Nuevo stock:{" "}
                  <strong>
                    {adjustmentType === "add"
                      ? getAdjustItemStock() + adjustmentQty
                      : Math.max(0, getAdjustItemStock() - adjustmentQty)}
                  </strong>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ej: Compra a proveedor, Merma, Inventario físico..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAdjustDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustmentQty <= 0 || adjustProductMutation.isPending || adjustVariantMutation.isPending}
              className={adjustmentType === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {adjustmentType === "add" ? "Agregar" : "Restar"} {adjustmentQty || 0} unidades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for product row with expandable variants
function ProductStockRow({
  product,
  isExpanded,
  onToggleExpand,
  onAdjust,
  getStockStatus,
}: {
  product: Product;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAdjust: (target: AdjustTarget, type: AdjustmentType) => void;
  getStockStatus: (current: number, min: number, max: number) => { label: string; color: "destructive" | "secondary" | "default" };
}) {
  // Fetch variants if product has_variants
  const { data: variantsList = [] } = useQuery({
    queryKey: ["variants", product.id],
    queryFn: () => variants.list(product.id),
    enabled: product.has_variants && isExpanded,
  });

  const status = getStockStatus(product.stock_quantity, product.min_stock, product.max_stock);
  const isLow = product.min_stock > 0 && product.stock_quantity <= product.min_stock;

  return (
    <>
      <TableRow className={isLow ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
        <TableCell className="w-8">
          {product.has_variants && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">
          {product.sku || "-"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            <span className="font-medium">{product.name}</span>
            {product.has_variants && (
              <Badge variant="outline" className="text-xs">
                Con variantes
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <span className={`font-mono text-lg font-bold ${isLow ? "text-amber-600" : ""}`}>
            {product.stock_quantity}
          </span>
        </TableCell>
        <TableCell className="text-center text-muted-foreground">
          {product.min_stock || "-"}
        </TableCell>
        <TableCell className="text-center text-muted-foreground">
          {product.max_stock || "-"}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={status.color}>{status.label}</Badge>
        </TableCell>
        <TableCell className="text-right">
          {!product.has_variants && (
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onAdjust({ type: "product", item: product }, "add")}
                title="Agregar stock"
              >
                <Plus className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onAdjust({ type: "product", item: product }, "subtract")}
                title="Restar stock"
              >
                <Minus className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
      
      {/* Variant sub-rows */}
      {isExpanded && variantsList.map((variant) => {
        const variantStatus = getStockStatus(variant.stock_quantity, 0, 0);
        
        return (
          <TableRow key={variant.id} className="bg-muted/30">
            <TableCell></TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground pl-6">
              ↳ {variant.sku || "-"}
            </TableCell>
            <TableCell className="pl-6">
              <span className="text-sm">{variant.name}</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-mono font-medium">
                {variant.stock_quantity}
              </span>
            </TableCell>
            <TableCell className="text-center text-muted-foreground">-</TableCell>
            <TableCell className="text-center text-muted-foreground">-</TableCell>
            <TableCell className="text-center">
              <Badge variant={variantStatus.color} className="text-xs">
                {variantStatus.label}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAdjust({ type: "variant", item: variant }, "add")}
                  title="Agregar stock"
                >
                  <Plus className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAdjust({ type: "variant", item: variant }, "subtract")}
                  title="Restar stock"
                >
                  <Minus className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
