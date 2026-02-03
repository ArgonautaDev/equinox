import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Package,
  PackageX,
  AlertCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { products, categories, Category } from "@/lib/tauri";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { InventoryNav } from "./components/InventoryNav";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", search, showInactive, categoryFilter, showLowStock],
    queryFn: () =>
      products.list({
        search: search || undefined,
        isActive: !showInactive,
        categoryId: categoryFilter === "all" ? undefined : categoryFilter,
        lowStock: showLowStock || undefined,
      }),
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categories.list({ isActive: true }),
  });

  // Delete (deactivate) mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteId(null);
    },
  });

  // Restore (reactivate) mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => products.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const productToDelete = data?.find((p) => p.id === deleteId);
  const lowStockCount =
    data?.filter((p) => p.stock_quantity <= p.min_stock && p.min_stock > 0)
      .length || 0;

  const isLowStock = (stock: number, minStock: number) =>
    stock <= minStock && minStock > 0;

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Productos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona tu inventario de productos
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
        >
          <Link to="/inventory/products/new">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Link>
        </Button>
      </div>

      <InventoryNav />

      {/* Low Stock Alert */}
      {lowStockCount > 0 && !showInactive && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            <strong>{lowStockCount}</strong> producto(s) con stock bajo
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            {showLowStock ? "Ver todos" : "Ver solo stock bajo"}
          </Button>
        </div>
      )}

      <div className="bg-gradient-to-br from-card to-secondary/30 rounded-xl border border-primary/15 transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              placeholder="Buscar por nombre, SKU, código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-background/50 border-border focus:bg-background focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background/50 border-border">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoriesData?.map((cat: Category) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            value={showInactive ? "inactive" : "active"}
            onValueChange={(v: string) => setShowInactive(v === "inactive")}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-10 bg-background/50 border border-border p-1">
              <TabsTrigger
                value="active"
                className="gap-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Package className="h-3.5 w-3.5" />
                Activos
              </TabsTrigger>
              <TabsTrigger
                value="inactive"
                className="gap-2 text-xs data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive"
              >
                <PackageX className="h-3.5 w-3.5" />
                Inactivos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop Table View */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive bg-destructive/5 m-4 rounded-xl border border-destructive/20">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            Error al cargar productos: {String(error)}
          </div>
        ) : data?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data?.map((product, index) => (
                    <tr
                      key={product.id}
                      className="hover:bg-secondary/30 transition-colors duration-300 animate-fade-in"
                      style={{
                        animationDelay: `${Math.min(index * 30, 500)}ms`,
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isLowStock(
                            product.stock_quantity,
                            product.min_stock,
                          ) &&
                            product.stock_quantity > 0 && (
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                          {product.stock_quantity === 0 && (
                            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                          )}
                          <span className="font-medium text-foreground text-sm">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground text-xs font-mono bg-secondary/50 px-2 py-1 rounded border border-border/50">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {product.category_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            product.stock_quantity === 0
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : isLowStock(
                                    product.stock_quantity,
                                    product.min_stock,
                                  )
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-green-500/15 text-green-500 border-green-500/30"
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground text-sm">
                        {new Intl.NumberFormat("es-VE", {
                          style: "currency",
                          currency: "USD",
                        }).format(product.sale_price)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-foreground text-sm">
                        {new Intl.NumberFormat("es-VE", {
                          style: "currency",
                          currency: "USD",
                        }).format(product.sale_price * product.stock_quantity)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {showInactive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10"
                              onClick={() => restoreMutation.mutate(product.id)}
                              title="Restaurar"
                            >
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Link to={`/inventory/products/${product.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-primary hover:bg-primary/10 transition-all duration-300"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 transition-all duration-300"
                                onClick={() => setDeleteId(product.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {data?.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-card border border-border/50 rounded-xl p-4 shadow-sm animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {isLowStock(
                          product.stock_quantity,
                          product.min_stock,
                        ) &&
                          product.stock_quantity > 0 && (
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          )}
                        {product.stock_quantity === 0 && (
                          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {product.sku}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {showInactive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10"
                            onClick={() => restoreMutation.mutate(product.id)}
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Link to={`/inventory/products/${product.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-border/50 pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Stock
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold border ${
                            product.stock_quantity === 0
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : isLowStock(
                                    product.stock_quantity,
                                    product.min_stock,
                                  )
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-green-500/15 text-green-500 border-green-500/30"
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-2">
                          Precio
                        </p>
                        <p className="font-semibold text-foreground">
                          {new Intl.NumberFormat("es-VE", {
                            style: "currency",
                            currency: "USD",
                          }).format(product.sale_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto <strong>{productToDelete?.name}</strong> será marcado
              como inactivo. Podrás reactivarlo en cualquier momento desde la
              pestaña "Inactivos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
