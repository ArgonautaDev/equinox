import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoices, Invoice } from "@/lib/tauri";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { PaymentModal } from "../components/PaymentModal";
import { ReceivableStats } from "../components/ReceivableStats";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import { format, isAfter } from "date-fns";
import { es } from "date-fns/locale";

export function ReceivablesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: allInvoices, isLoading, isError, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoices.list(),
  });

  // Filter for the list view based on active tab
  const filteredInvoices = allInvoices?.filter((inv) => {
    const matchesSearch =
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.includes(searchTerm);

    if (!matchesSearch) return false;

    if (activeTab === "pending") {
      return inv.status === "issued" || inv.status === "partial";
    } else {
      // History shows paid and cancelled
      return inv.status === "paid" || inv.status === "cancelled";
    }
  });

  const handleRegisterPayment = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation(); // Prevent opening detail modal
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleRowClick = (invoice: Invoice) => {
    setViewInvoiceId(invoice.id);
    setDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-lg m-6 border border-red-500/20">
        <h3 className="font-semibold">Error al cargar facturas</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuentas por Cobrar</h1>
          <p className="text-muted-foreground">
            Gestiona los cobros y facturas pendientes
          </p>
        </div>
      </div>

      {/* Pass all invoices to stats for global calculations */}
      <ReceivableStats invoices={allInvoices || []} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="history">Historial Pagado</TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente o nro..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="pending" className="mt-0">
          <InvoicesTable 
            invoices={filteredInvoices || []} 
            onRegisterPayment={handleRegisterPayment}
            onRowClick={handleRowClick}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <InvoicesTable 
            invoices={filteredInvoices || []} 
            onRegisterPayment={handleRegisterPayment}
            onRowClick={handleRowClick}
            showActions={false}
          />
        </TabsContent>
      </Tabs>

      <PaymentModal
        invoice={selectedInvoice}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <InvoiceDetailModal 
        invoiceId={viewInvoiceId}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}

function InvoicesTable({ 
  invoices, 
  onRegisterPayment,
  onRowClick,
  showActions 
}: { 
  invoices: Invoice[], 
  onRegisterPayment: (e: React.MouseEvent, inv: Invoice) => void,
  onRowClick: (inv: Invoice) => void,
  showActions: boolean
}) {
  if (invoices.length === 0) {
    return (
      <Card className="border-border border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-secondary rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No hay facturas</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            No se encontraron registros en esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              {showActions && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const pending = invoice.total - invoice.paid_amount;
              const progress = (invoice.paid_amount / invoice.total) * 100;
              const isOverdue = invoice.due_date && invoice.status !== 'paid' && invoice.status !== 'cancelled'
                ? isAfter(new Date(), new Date(invoice.due_date)) 
                : false;

              return (
                <TableRow 
                    key={invoice.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onRowClick(invoice)}
                >
                  <TableCell className="font-medium">
                    #{invoice.invoice_number}
                  </TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>
                    <div className={isOverdue ? "text-red-500 font-medium flex items-center gap-1" : ""}>
                      {invoice.due_date ? format(new Date(invoice.due_date), "dd MMM", { locale: es }) : "-"}
                      {isOverdue && <AlertCircle className="w-3 h-3" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="w-[15%]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {invoice.currency} {invoice.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {pending > 0 ? pending.toFixed(2) : <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={(e) => onRegisterPayment(e, invoice)}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Cobrar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    issued: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20",
    partial: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
    paid: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20",
    cancelled: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 border-gray-500/20",
    draft: "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-500/20"
  };

  const labels = {
    issued: "Pendiente",
    partial: "Parcial",
    paid: "Pagado",
    cancelled: "Anulada",
    draft: "Borrador"
  };

  const statusKey = status as keyof typeof styles;

  return (
    <Badge variant="secondary" className={styles[statusKey] || styles.draft}>
      {labels[statusKey] || status}
    </Badge>
  );
}
