import { useMemo } from "react";
import {
  TrendingUp,
  Users,
  Package,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { SkeletonStats, SkeletonChart } from "./components/Skeletons";
import { RecentActivity } from "./components/RecentActivity";
import { useQuery } from "@tanstack/react-query";
import { invoices, clients, products } from "@/lib/tauri";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export function DashboardPage() {
  // Queries
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices", "dashboard"],
    queryFn: () => invoices.list(),
  });

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients", "dashboard"],
    queryFn: () => clients.list({ isActive: true }),
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "dashboard"],
    queryFn: () => products.list(),
  });

  const isLoading = isLoadingInvoices || isLoadingClients || isLoadingProducts;

  // Derived Stats
  const stats = useMemo(() => {
    if (!invoicesData || !clientsData || !productsData) return null;

    // 1. Revenue (Sum of paid invoices or issued invoices)
    // Assuming VES as default for now, multicurrency logic would be complex without backend support
    const totalRevenue = invoicesData
      .filter((inv) => inv.status === "paid" || inv.status === "partial")
      .reduce((sum, inv) => sum + inv.paid_amount, 0);

    // 2. Invoice Count
    const invoiceCount = invoicesData.length;

    // 3. Active Clients
    const activeClients = clientsData.length;

    // 4. Products & Low Stock
    const productCount = productsData.length;
    const lowStockCount = productsData.filter(
      (p) => p.stock_quantity <= p.min_stock && p.min_stock > 0,
    ).length;

    return {
      revenue: totalRevenue,
      invoices: invoiceCount,
      clients: activeClients,
      products: productCount,
      lowStock: lowStockCount,
    };
  }, [invoicesData, clientsData, productsData]);

  // Chart Data Preparation (Last 6 months)
  const chartData = useMemo(() => {
    if (!invoicesData) return [];

    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      // const monthStart = startOfMonth(date);
      const monthLabel = format(date, "MMM", { locale: es });

      // Filter invoices for this month
      const monthInvoices = invoicesData.filter((inv) => {
        const invDate = new Date(inv.issue_date);
        return (
          invDate.getMonth() === date.getMonth() &&
          invDate.getFullYear() === date.getFullYear()
        );
      });

      data.push({
        month: monthLabel,
        facturas: monthInvoices.length,
        total: monthInvoices.reduce((sum, inv) => sum + inv.total, 0),
      });
    }
    return data;
  }, [invoicesData]);

  const kpiData = [
    {
      title: "Ingresos Totales",
      value: new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency: "VES",
      }).format(stats?.revenue || 0),
      change: "+0%", // Placeholder calculation
      isPositive: true,
      icon: TrendingUp,
      bgColor: "bg-cyan-500/15",
      textColor: "text-cyan-400",
    },
    {
      title: "Facturas",
      value: stats?.invoices.toString() || "0",
      change: "+0%",
      isPositive: true,
      icon: FileText,
      bgColor: "bg-teal-500/15",
      textColor: "text-teal-400",
    },
    {
      title: "Clientes Activos",
      value: stats?.clients.toString() || "0",
      change: "+0%",
      isPositive: true,
      icon: Users,
      bgColor: "bg-cyan-500/15",
      textColor: "text-cyan-400",
    },
    {
      title: "Productos",
      value: stats?.products.toString() || "0",
      change: "+0%",
      isPositive: true,
      icon: Package,
      bgColor: "bg-amber-500/15",
      textColor: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-8 p-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground mt-2">
          Resumen general de tu negocio
        </p>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-card to-secondary/30 border border-primary/15 rounded-xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-3 leading-tight">
                      {kpi.value}
                    </p>
                    {/* <div className="flex items-center gap-2 mt-4">
                      {kpi.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="text-xs font-semibold text-muted-foreground">{kpi.change}</span>
                    </div> */}
                  </div>
                  <div
                    className={`${kpi.bgColor} p-3 rounded-lg transition-all duration-300 group-hover:scale-110`}
                  >
                    <Icon className={`w-6 h-6 ${kpi.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Row 1 */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart - Wider */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-card to-secondary/20 border border-primary/15 rounded-xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Ventas Mensuales (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: `1px solid var(--border)`,
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Monto Total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Bar Chart */}
          <Card className="bg-gradient-to-br from-card to-secondary/20 border border-primary/15 rounded-xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Facturas Emitidas
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: `1px solid var(--border)`,
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar
                  dataKey="facturas"
                  name="Cantidad"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Summary Section with Recent Activity */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Resumen Rápido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-amber-500/10 to-secondary/20 border border-amber-500/20 rounded-xl p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
                <div>
                  <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Stock Bajo
                  </h4>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats?.lowStock || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Productos a reponer
                  </p>
                </div>
              </Card>
              {/* Add more summary cards here if needed */}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <RecentActivity />
          </div>
        </div>
      )}
    </div>
  );
}
