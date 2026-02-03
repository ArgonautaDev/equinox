import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    invoices as invoicesApi, 
    InvoiceFilters 
} from "@/lib/tauri";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    Plus, 
    MoreHorizontal, 
    Search, 
    Filter, 
    FileText, 
    Ban, 
    Trash2 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function InvoiceList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<InvoiceFilters>({});
    const [searchTerm, setSearchTerm] = useState("");

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "draft": return "secondary";
            case "issued": return "default";
            case "paid": return "success"; // Assuming custom variant or valid one
            case "partial": return "warning"; // Assuming custom variant or valid one
            case "cancelled": return "destructive";
            default: return "outline";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "draft": return "Borrador";
            case "issued": return "Emitida";
            case "paid": return "Pagada";
            case "partial": return "Parcial";
            case "cancelled": return "Anulada";
            default: return status;
        }
    };

    const filteredInvoices = invoices?.filter(inv => 
        inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Facturas</h2>
                    <p className="text-muted-foreground">
                        Gestiona tus facturas, cobros y notas de crédito
                    </p>
                </div>
                <Button onClick={() => navigate("/invoices/new")}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Factura
                </Button>
            </div>

            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                
                <Select 
                    value={filters.status || "all"} 
                    onValueChange={(val) => setFilters(prev => ({ ...prev, status: val === "all" ? undefined : val }))}
                >
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
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

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Cargando facturas...
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No se encontraron facturas
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices?.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">
                                        {invoice.invoice_number}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{invoice.client_name}</span>
                                            <span className="text-xs text-muted-foreground">{invoice.client_tax_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(invoice.status) as any}>
                                            {getStatusLabel(invoice.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('es-VE', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={invoice.paid_amount >= invoice.total ? "text-green-600" : "text-amber-600"}>
                                            {new Intl.NumberFormat('es-VE', { style: 'currency', currency: invoice.currency }).format(invoice.paid_amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Ver detalles
                                                </DropdownMenuItem>
                                                {invoice.status === 'draft' && (
                                                    <DropdownMenuItem 
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => {
                                                            if (confirm("¿Estás seguro de eliminar este borrador?")) {
                                                                deleteInvoice.mutate(invoice.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                )}
                                                {(invoice.status === 'issued' || invoice.status === 'partial') && (
                                                    <DropdownMenuItem 
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => {
                                                            if (confirm("¿Estás seguro de anular esta factura? Se restaurará el stock.")) {
                                                                cancelInvoice.mutate(invoice.id);
                                                            }
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
        </div>
    );
}
