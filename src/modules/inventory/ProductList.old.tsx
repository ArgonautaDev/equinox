/**
 * Product List Page
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Package, PackageX, AlertTriangle } from "lucide-react";
import { products, categories, Category } from "@/lib/tauri";
import { createColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
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

  const columns = createColumns({
    onDelete: (id) => setDeleteId(id),
    onRestore: (id) => restoreMutation.mutate(id),
  });

  const productToDelete = data?.find((p) => p.id === deleteId);
  const lowStockCount = data?.filter(p => p.stock_quantity <= p.min_stock && p.min_stock > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona tu inventario de productos
          </p>
        </div>
        <Button asChild>
          <Link to="/inventory/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Link>
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && !showInactive && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{lowStockCount}</strong> producto(s) con stock bajo
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            {showLowStock ? "Ver todos" : "Ver solo stock bajo"}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU, código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
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

        {/* Active/Inactive Toggle */}
        <Tabs
          value={showInactive ? "inactive" : "active"}
          onValueChange={(v: string) => setShowInactive(v === "inactive")}
        >
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Package className="h-4 w-4" />
              Activos
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              <PackageX className="h-4 w-4" />
              Inactivos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          Error al cargar productos: {String(error)}
        </div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto{" "}
              <strong>{productToDelete?.name}</strong> será marcado como
              inactivo. Podrás reactivarlo en cualquier momento desde la
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
