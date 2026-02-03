import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Search,
  Plus,
  Users,
  UserX,
  AlertCircle,
  Undo2,
} from "lucide-react";
import { clients } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  // Fetch clients
  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", search, showInactive],
    queryFn: () =>
      clients.list({
        search: search || undefined,
        isActive: !showInactive,
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

  const clientToDelete = data?.find((c) => c.id === deleteId);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona la información de tus clientes
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
        >
          <Link to="/clients/new">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      <div className="bg-gradient-to-br from-card to-secondary/30 rounded-xl border border-primary/15 transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              placeholder="Buscar por nombre, código, RIF, correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-background/50 border-border focus:bg-background focus:border-primary/50 transition-all duration-300"
            />
          </div>

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
                <Users className="h-3.5 w-3.5" />
                Activos
              </TabsTrigger>
              <TabsTrigger
                value="inactive"
                className="gap-2 text-xs data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive"
              >
                <UserX className="h-3.5 w-3.5" />
                Inactivos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table View (Desktop) */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive bg-destructive/5 m-4 rounded-xl border border-destructive/20">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            Error al cargar clientes: {String(error)}
          </div>
        ) : data?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No se encontraron clientes</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data?.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-secondary/30 transition-colors duration-300 animate-fade-in"
                      style={{
                        animationDelay: `${Math.min(index * 30, 500)}ms`,
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {customer.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {customer.code}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.city || customer.state ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {[customer.city, customer.state]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            !showInactive
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                              : "bg-muted/50 text-muted-foreground border-border"
                          }`}
                        >
                          {!showInactive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {showInactive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10"
                              onClick={() =>
                                restoreMutation.mutate(customer.id)
                              }
                              title="Restaurar"
                            >
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Link to={`/clients/${customer.id}`}>
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
                                onClick={() => setDeleteId(customer.id)}
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
              {data?.map((customer, index) => (
                <Card
                  key={customer.id}
                  className="p-4 bg-card border-border/50 animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {customer.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${
                            !showInactive
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-muted/50 text-muted-foreground border-border"
                          }`}
                        >
                          {!showInactive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {showInactive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10"
                            onClick={() => restoreMutation.mutate(customer.id)}
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Link to={`/clients/${customer.id}`}>
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
                              onClick={() => setDeleteId(customer.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm pt-2 border-t border-border/50">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {(customer.city || customer.state) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {[customer.city, customer.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente <strong>{clientToDelete?.name}</strong> será marcado
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
