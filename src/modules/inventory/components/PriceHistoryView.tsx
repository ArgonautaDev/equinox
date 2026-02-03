import { useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PriceHistory {
  id: string;
  price_type: "COST" | "SALE";
  old_price: number | null;
  new_price: number;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

interface PriceHistoryViewProps {
  productId: string;
}

export function PriceHistoryView({ productId }: PriceHistoryViewProps) {
  // Fetch history
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["price_history", productId],
    queryFn: async () => {
      // Must map the command result to our interface
      // The rust command is "list_price_history" with filters
      return invoke<PriceHistory[]>("list_price_history", {
        filters: { product_id: productId },
      });
    },
  });

  // Calculate stats & formatted data
  const { stats, chartData } = useMemo(() => {
    if (!history.length)
      return {
        stats: { avg: 0, min: 0, max: 0, count: 0 },
        chartData: [],
      };

    // Filter mainly for SALE price for the chart/stats to be consistent, or mix both?
    // Let's separate COST and SALE if needed, but for now lets focus on SALE prices for the main chart
    // or just show all changes.
    // Better: Show SALE prices trend.
    const saleHistory = history
      .filter((h) => h.price_type === "SALE")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (!saleHistory.length) {
       return {
            stats: { avg: 0, min: 0, max: 0, count: 0 },
            chartData: [],
       };
    }

    const prices = saleHistory.map((h) => h.new_price);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const data = saleHistory.map((h) => ({
      date: format(new Date(h.created_at), "dd/MM/yyyy HH:mm"),
      price: h.new_price,
      reason: h.reason || "Sin razón",
    }));

    return {
      stats: { avg, min, max, count: prices.length },
      chartData: data,
    };
  }, [history]);

  if (isLoading) return <div>Cargando historial...</div>;
  if (!history.length)
    return (
      <div className="text-center p-8 text-muted-foreground">
        No hay historial de precios registrado para este producto.
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Precio Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${chartData.length > 0 ? chartData[chartData.length - 1].price.toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avg.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mínimo Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.min.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Máximo Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${stats.max.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
            <CardTitle>Evolución de Precio (Venta)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro Detallado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Anterior</TableHead>
                <TableHead>Nuevo</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Razón</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => {
                  const diff = h.old_price ? h.new_price - h.old_price : 0;
                  const isPositive = diff > 0;
                  return (
                <TableRow key={h.id}>
                  <TableCell>
                    {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{h.price_type === "COST" ? "Costo" : "Venta"}</Badge>
                  </TableCell>
                  <TableCell>${h.old_price?.toFixed(2) || "-"}</TableCell>
                  <TableCell className="font-medium">${h.new_price.toFixed(2)}</TableCell>
                  <TableCell className={diff !== 0 ? (isPositive ? "text-red-600" : "text-green-600") : ""}>
                    {diff !== 0 ? `${isPositive ? "+" : ""}${diff.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.reason || "-"}</TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
