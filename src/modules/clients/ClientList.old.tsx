/**
 * Client List Page
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, UserX } from "lucide-react";
import { clients } from "@/lib/tauri";
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

export function ClientList() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const queryClient = useQueryClient();

  // Fetch clients based on active status
  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", search, showInactive],
    queryFn: () =>
      clients.list({
        search: search || undefined,
        isActive: !showInactive, // true = active, false = inactive
      }),
  });

  // Delete (deactivate) mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteId(null);
    },
  });

  // Restore (reactivate) mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => clients.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const columns = createColumns({
    onDelete: (id) => setDeleteId(id),
    onRestore: (id) => restoreMutation.mutate(id),
  });

  const clientToDelete = data?.find((c) => c.id === deleteId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código, RIF, correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Active/Inactive Toggle */}
        <Tabs
          value={showInactive ? "inactive" : "active"}
          onValueChange={(v: string) => setShowInactive(v === "inactive")}
        >
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Users className="h-4 w-4" />
              Activos
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              <UserX className="h-4 w-4" />
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
          Error al cargar clientes: {String(error)}
        </div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente{" "}
              <strong>{clientToDelete?.name}</strong> será marcado como
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
