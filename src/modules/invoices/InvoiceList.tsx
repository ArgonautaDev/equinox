import { useState } from "react";
import {
  Eye,
  Ban,
  Trash2,
  Search,
  Plus,
  MoreVertical,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoices as invoicesApi, InvoiceFilters } from "@/lib/tauri";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InvoiceList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: 'delete' | 'cancel';
    title: string;
    description: string;
  } | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoicesApi.list(filters),
  });

  const cancelInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura anulada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al anular factura: " + error.message);
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar factura: " + error.message);
    },
  });

  const filteredInvoices = invoices?.filter(
    (inv) =>
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25">
            Pagada
          </Badge>
        );
      case "issued":
        return (
          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25">
            Emitida
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-secondary text-muted-foreground border border-border hover:bg-secondary/80">
            Borrador
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25">
            Parcial
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25">
            Anulada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!confirmAction) return;
                
                if (confirmAction.type === 'delete') {
                    deleteInvoice.mutate(confirmAction.id);
                } else if (confirmAction.type === 'cancel') {
                    cancelInvoice.mutate(confirmAction.id);
                }
                setConfirmAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Facturas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona tus facturas, cobros y notas de crédito
          </p>
        </div>
        <Button
          onClick={() => navigate("/invoices/new")}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> Nueva Factura
        </Button>
      </div>

      <div className="bg-gradient-to-br from-card to-secondary/30 rounded-xl border border-primary/15 transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              type="search"
              placeholder="Buscar por cliente o número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-background/50 border-border focus:bg-background focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <Select
            value={filters.status || "all"}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                status: val === "all" ? undefined : (val as any),
              }))
            }
          >
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background/50 border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="issued">Emitida</SelectItem>
              <SelectItem value="paid">Pagada</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="cancelled">Anulada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent bg-secondary/5">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4">
                  Número
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4">
                  Cliente
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4">
                  Fecha
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4">
                  Estado
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 text-right">
                  Total
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 text-right">
                  Pagado
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground animate-pulse"
                  >
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p>No se encontraron facturas</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice, index) => (
                  <TableRow
                    key={invoice.id}
                    className="border-border/50 hover:bg-secondary/40 transition-colors duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-medium text-foreground py-4">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {invoice.client_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.client_tax_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-4">
                      {format(new Date(invoice.issue_date), "dd MMM yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="py-4">
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground py-4">
                      {invoice.currency === 'VES' 
                        ? `Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(invoice.total)}`
                        : new Intl.NumberFormat("es-VE", { style: "currency", currency: invoice.currency }).format(invoice.total)
                      }
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <span
                        className={`font-medium ${invoice.paid_amount >= invoice.total ? "text-green-500" : "text-amber-500"}`}
                      >
                         {invoice.currency === 'VES' 
                            ? `Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(invoice.paid_amount)}`
                            : new Intl.NumberFormat("es-VE", { style: "currency", currency: invoice.currency }).format(invoice.paid_amount)
                          }
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <span className="sr-only">Abrir menú</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4 text-blue-500" />
                            Ver detalles
                          </DropdownMenuItem>

                          {invoice.status.toLowerCase() === "draft" && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setConfirmAction({
                                  id: invoice.id,
                                  type: 'delete',
                                  title: "¿Eliminar Borrador?",
                                  description: "Esta acción no se puede deshacer."
                                });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          )}

                          {['issued', 'partial'].includes(invoice.status.toLowerCase()) && (
                            <DropdownMenuItem
                              className="text-amber-600 focus:text-amber-600 cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setConfirmAction({
                                  id: invoice.id,
                                  type: 'cancel',
                                  title: "¿Anular Factura?",
                                  description: "La factura pasará a estado ANULADA y se restaurará el stock."
                                });
                              }}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Anular
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer (Pagination placeholder) */}
        <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between bg-secondary/5">
          <span className="text-xs text-muted-foreground">
            Mostrando {filteredInvoices?.length || 0} facturas
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-8 text-xs bg-transparent border-border/60"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-8 text-xs bg-transparent border-border/60"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
