import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, CalendarDays } from "lucide-react";
import { isAfter, addDays, isBefore } from "date-fns";

import { Invoice } from "@/lib/tauri";

interface ReceivableStatsProps {
  invoices: Invoice[];
  currency?: string;
}

export function ReceivableStats({ invoices, currency = "USD" }: ReceivableStatsProps) {
  // KPI Calculations
  const pendingInvoices = invoices.filter(i => i.status === "issued" || i.status === "partial");
  
  const totalReceivable = pendingInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.paid_amount),
    0
  );

  const totalOverdue = pendingInvoices.reduce((sum, inv) => {
    if (inv.due_date && isAfter(new Date(), new Date(inv.due_date))) {
      return sum + (inv.total - inv.paid_amount);
    }
    return sum;
  }, 0);

  const weeklyProjection = pendingInvoices.reduce((sum, inv) => {
    const nextWeek = addDays(new Date(), 7);
    if (inv.due_date && 
        isAfter(new Date(inv.due_date), new Date()) && 
        isBefore(new Date(inv.due_date), nextWeek)) {
      return sum + (inv.total - inv.paid_amount);
    }
    return sum;
  }, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total por Cobrar</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currency} {totalReceivable.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Monto global pendiente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencido</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {currency} {totalOverdue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Require atención inmediata
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proyección (7d)</CardTitle>
          <CalendarDays className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">
            {currency} {weeklyProjection.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Cobros estimados esta semana
          </p>
        </CardContent>
      </Card>


    </div>
  );
}
