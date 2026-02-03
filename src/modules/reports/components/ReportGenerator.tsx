import { useState, useEffect } from "react";
import { Calendar, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const reportTypes = [
  {
    id: "sales",
    label: "Ventas",
    icon: TrendingUp,
    description: "Ingresos y tendencias de ventas",
  },
  {
    id: "inventory",
    label: "Inventario",
    icon: BarChart3,
    description: "Estado del stock y movimientos",
  },
  {
    id: "clients",
    label: "Clientes",
    icon: PieChart,
    description: "Análisis de clientes y facturación",
  },
];

interface ReportGeneratorProps {
  selectedReport: string | null;
}

export function ReportGenerator({ selectedReport }: ReportGeneratorProps) {
  const [selectedType, setSelectedType] = useState("sales");
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2024-12-31");

  useEffect(() => {
    if (selectedReport) {
      // Logic to auto-select report type if passed from parent
      // For now we assume IDs match or we map them
    }
  }, [selectedReport]);

  const handleGenerateReport = () => {
    console.log("[Equinox] Generando reporte:", {
      selectedType,
      dateFrom,
      dateTo,
    });
    // Here we would trigger the actual generation logic (PDF or view)
    alert("Funcionalidad de generación de reportes en desarrollo");
  };

  return (
    <Card className="p-6 border-border">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        Generar Reporte
      </h2>

      <div className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Tipo de Reporte
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <p className="font-medium text-sm text-foreground">
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Sample Filters */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Filtros Adicionales
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-foreground">Incluir canceladas</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-foreground">Agrupar por mes</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span className="text-foreground">Mostrar comparativa</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={handleGenerateReport} className="w-full">
          Generar Reporte
        </Button>
      </div>
    </Card>
  );
}
