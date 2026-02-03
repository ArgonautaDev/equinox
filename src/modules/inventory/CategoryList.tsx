/**
 * Category List Page - Manage product categories
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, RotateCcw, FolderTree, ChevronRight } from "lucide-react";
import { categories, Category, CreateCategoryDto } from "@/lib/tauri";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InventoryNav } from "./components/InventoryNav";

export function CategoryList() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCategoryDto>({
    name: "",
    description: "",
    parent_id: undefined,
    sort_order: 0,
  });
  const queryClient = useQueryClient();

  // Fetch categories
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", search, showInactive],
    queryFn: () =>
      categories.list({
        search: search || undefined,
        isActive: !showInactive,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryDto) => categories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeDialog();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryDto> }) =>
      categories.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeDialog();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteId(null);
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => categories.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const openCreateDialog = () => {
    setEditCategory(null);
    setFormData({ name: "", description: "", parent_id: undefined, sort_order: 0 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id,
      sort_order: category.sort_order,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditCategory(null);
    setFormData({ name: "", description: "", parent_id: undefined, sort_order: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editCategory) {
      updateMutation.mutate({ id: editCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const categoryToDelete = data?.find((c) => c.id === deleteId);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  // Get parent categories (exclude current if editing)
  const availableParents = data?.filter(c => 
    c.is_active && (!editCategory || c.id !== editCategory.id)
  ) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Organiza tus productos en categorías
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <InventoryNav />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={showInactive ? "inactive" : "active"}
          onValueChange={(v: string) => setShowInactive(v === "inactive")}
        >
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Activas
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              Inactivas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          Error al cargar categorías: {String(error)}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay categorías</p>
          <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
            Crear primera categoría
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((category) => {
            const parent = data.find(c => c.id === category.parent_id);
            return (
              <div
                key={category.id}
                className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-medium truncate">{category.name}</h3>
                      {!category.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                    {parent && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3" />
                        {parent.name}
                      </div>
                    )}
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {category.is_active ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => restoreMutation.mutate(category.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editCategory ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                {editCategory
                  ? "Modifica los datos de la categoría"
                  : "Crea una nueva categoría para organizar tus productos"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">Categoría Padre</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, parent_id: v === "none" ? undefined : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna (raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna (raíz)</SelectItem>
                    {availableParents.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Orden</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name}>
                {editCategory ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              La categoría <strong>{categoryToDelete?.name}</strong> será
              marcada como inactiva.
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
