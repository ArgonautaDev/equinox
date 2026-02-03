import { FileText, Download, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ReportsListProps {
  onSelectReport: (id: string) => void;
}

const recentReports = [
  {
    id: "1",
    name: "Ventas Diciembre 2024",
    type: "Ventas",
    date: "2024-12-31",
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "Stock Diciembre",
    type: "Inventario",
    date: "2024-12-25",
    size: "1.8 MB",
  },
  {
    id: "3",
    name: "Análisis Clientes Q4",
    type: "Clientes",
    date: "2024-12-20",
    size: "3.1 MB",
  },
  {
    id: "4",
    name: "Ventas Noviembre",
    type: "Ventas",
    date: "2024-11-30",
    size: "2.2 MB",
  },
];

export function ReportsList({ onSelectReport }: ReportsListProps) {
  return (
    <Card className="p-6 border-border h-fit">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Reportes Recientes
      </h2>
      <div className="space-y-3">
        {recentReports.map((report) => (
          <div
            key={report.id}
            className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
            onClick={() => onSelectReport(report.id)}
          >
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-sm truncate">
                  {report.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {report.type}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {report.date}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Download className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
