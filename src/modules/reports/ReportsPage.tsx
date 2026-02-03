import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportGenerator } from "./components/ReportGenerator";
import { ReportsList } from "./components/ReportsList";

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground mt-2">
            Genera y analiza reportes de tu negocio
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportGenerator selectedReport={selectedReport} />
        </div>
        <div>
          <ReportsList onSelectReport={setSelectedReport} />
        </div>
      </div>
    </div>
  );
}
