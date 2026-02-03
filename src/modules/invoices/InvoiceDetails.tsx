import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoices as invoicesApi, settings } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { ArrowLeft, Printer, Ban, CreditCard, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "./InvoicePDF";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
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
import { useState } from "react";
import { PaymentModal } from "../receivables/components/PaymentModal";


export function InvoiceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["invoice", id],
        queryFn: () => invoicesApi.get(id!),
        enabled: !!id,
    });

    const { data: companySettings } = useQuery({
        queryKey: ["companySettings"],
        queryFn: settings.getCompanySettings
    });

    const [invoice, items] = data || [null, []];

    const issueInvoice = useMutation({
        mutationFn: (id: string) => invoicesApi.issue(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Stock changes
            toast.success("Factura emitida correctamente. Stock descontado.");
        },
        onError: (error: Error) => {
            toast.error("Error al emitir factura: " + error.message);
        },
    });

    const cancelInvoice = useMutation({
        mutationFn: (id: string) => invoicesApi.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Stock restores
            toast.success("Factura anulada correctamente.");
        },
        onError: (error: Error) => {
            toast.error("Error al anular factura: " + error.message);
        },
    });

    const deleteInvoice = useMutation({
        mutationFn: (id: string) => invoicesApi.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast.success("Borrador eliminado.");
            navigate("/invoices");
        },
        onError: (error: Error) => {
            toast.error("Error al eliminar borrador: " + error.message);
        },
    });


    const [confirmAction, setConfirmAction] = useState<{
        type: 'issue' | 'delete_draft' | 'cancel' | 'delete_issued';
        title: string;
        description: string;
        id: string; // Store ID instead of action closure
    } | null>(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const handleConfirm = (action: typeof confirmAction) => {
        setConfirmAction(action);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando detalles...</div>;
    }

    if (isError) {
        return <div className="p-8 text-center text-red-500">Error al cargar factura: {error.message}</div>;
    }

    if (!invoice) {
        return <div className="p-8 text-center text-red-500">Factura no encontrada</div>;
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "draft": return "secondary";
            case "issued": return "default";
            case "paid": return "success"; // assuming success valid
            case "cancelled": return "destructive";
            default: return "outline";
        }
    };

    return (
        <div className="space-y-6 p-4 max-w-5xl mx-auto">
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
                        <AlertDialogDescription className="whitespace-pre-line">
                            {confirmAction?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!confirmAction) return;

                                switch (confirmAction.type) {
                                    case 'issue':
                                        issueInvoice.mutate(confirmAction.id);
                                        break;
                                    case 'delete_draft':
                                    case 'delete_issued':
                                        deleteInvoice.mutate(confirmAction.id);
                                        break;
                                    case 'cancel':
                                        cancelInvoice.mutate(confirmAction.id);
                                        break;
                                }
                                setConfirmAction(null);
                            }}
                            className={confirmAction?.type.includes('delete') || confirmAction?.type === 'cancel' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PaymentModal 
                invoice={invoice} 
                open={isPaymentModalOpen} 
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["invoice", id] });
                }} 
            />

            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h2>
                            <Badge variant={getStatusVariant(invoice.status) as any}>
                                {invoice.status.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Emitida el {format(new Date(invoice.issue_date), "PPP", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* PDF Download */}
                    <PDFDownloadLink
                        document={
                            <InvoicePDF 
                                invoice={invoice} 
                                items={items} 
                                settings={companySettings || undefined} 
                            />
                        }
                        fileName={`FACT-${invoice.invoice_number}.pdf`}
                    >
                        {({ loading }) => (
                            <Button variant="outline" disabled={loading}>
                                <Printer className="mr-2 h-4 w-4" />
                                {loading ? "Generando..." : "Imprimir / PDF"}
                            </Button>
                        )}
                    </PDFDownloadLink>

                    {invoice.status.toLowerCase() === 'draft' && (
                        <>
                        <Button 
                            onClick={() => handleConfirm({
                                type: 'issue',
                                title: "¿Emitir Factura?",
                                description: "La factura pasará a estado EMITIDA y se descontará el stock del inventario.",
                                id: invoice.id
                            })}
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Emitir Factura
                        </Button>
                         <Button 
                            variant="destructive"
                            size="icon"
                            onClick={() => handleConfirm({
                                type: 'delete_draft',
                                title: "¿Eliminar Borrador?",
                                description: "Esta acción no se puede deshacer.",
                                id: invoice.id
                            })}
                            title="Eliminar Borrador"
                        >
                             <Trash2 className="h-4 w-4" />
                        </Button>
                        </>
                    )}

                    {['issued', 'partial', 'paid', 'cancelled'].includes(invoice.status.toLowerCase()) && (
                        <>
                            {invoice.status.toLowerCase() !== 'cancelled' && (
                                <>
                                    <Button variant="default" onClick={() => setIsPaymentModalOpen(true)}>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Registrar Pago
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="icon"
                                        onClick={() => handleConfirm({
                                            type: 'cancel',
                                            title: "¿Anular Factura?",
                                            description: "La factura pasará a estado ANULADA y el stock será restaurado.",
                                            id: invoice.id
                                        })}
                                        title="Anular Factura"
                                    >
                                        <Ban className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            
                            {/* Allow deleting any invoice with warning */}
                            <Button 
                                variant="outline" 
                                size="icon"
                                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={() => handleConfirm({
                                    type: 'delete_issued',
                                    title: "ADVERTENCIA: ¿Eliminar Factura?",
                                    description: "Está a punto de ELIMINAR permanentemente un registro fiscal.\nEsto puede causar inconsistencias en la numeración.\n\n¿Está absolutamente seguro?",
                                    id: invoice.id
                                })}
                                title="Eliminar Permanentemente"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Client Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold">{invoice.client_name}</div>
                        <div className="text-sm text-muted-foreground">{invoice.client_tax_id}</div>
                        <div className="text-sm mt-2">{invoice.client_address}</div>
                    </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Detalles de Pago</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-muted-foreground">Moneda</div>
                            <div className="font-medium">{invoice.currency === 'VES' ? 'Bolívares (VES)' : invoice.currency}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Tasa de Cambio</div>
                            <div className="font-medium">{invoice.exchange_rate}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Vencimiento</div>
                            <div className="font-medium">
                                {invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "N/A"}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Términos</div>
                            <div className="font-medium capitalize">{invoice.payment_terms || "Contado"}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">Precio Unit.</TableHead>
                                <TableHead className="text-right">Desc.</TableHead>
                                <TableHead className="text-right">Impuesto</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <span className="font-medium">{item.description}</span>
                                        {item.code && <span className="ml-2 text-xs text-muted-foreground">({item.code})</span>}
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-red-600">
                                        {item.discount_amount > 0 && `-${item.discount_amount.toFixed(2)}`}
                                    </TableCell>
                                    <TableCell className="text-right">{item.tax_amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{item.line_total.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Totals */}
            <div className="flex justify-end">
                <Card className="w-full md:w-1/3">
                    <CardContent className="p-6 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>{invoice.currency === 'VES' ? `Bs. ${invoice.subtotal.toFixed(2)}` : `${invoice.subtotal.toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                            <span>Descuentos:</span>
                            <span>-{invoice.currency === 'VES' ? `Bs. ${invoice.discount_total.toFixed(2)}` : `${invoice.discount_total.toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Impuestos:</span>
                            <span>{invoice.currency === 'VES' ? `Bs. ${invoice.tax_total.toFixed(2)}` : `${invoice.tax_total.toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total:</span>
                            <span>{invoice.currency === 'VES' ? `Bs. ${invoice.total.toFixed(2)}` : `${invoice.total.toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 pt-2">
                            <span>Pagado:</span>
                            <span>{invoice.currency === 'VES' ? `Bs. ${invoice.paid_amount.toFixed(2)}` : `${invoice.paid_amount.toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-600 font-medium">
                            <span>Pendiente:</span>
                            <span>{invoice.currency === 'VES' ? `Bs. ${(invoice.total - invoice.paid_amount).toFixed(2)}` : `${(invoice.total - invoice.paid_amount).toFixed(2)} ${invoice.currency}`}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
