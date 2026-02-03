import {
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Activity,
} from "lucide-react";

const activities = [
  {
    id: 1,
    type: "paid",
    title: "Factura pagada",
    description: "INV-2024-001 de Acme Corp",
    time: "Hace 2 horas",
    icon: CheckCircle,
  },
  {
    id: 2,
    type: "pending",
    title: "Nuevo pago pendiente",
    description: "INV-2024-005 de Digital Ventures",
    time: "Hace 5 horas",
    icon: Clock,
  },
  {
    id: 3,
    type: "comment",
    title: "Comentario recibido",
    description: "En factura INV-2024-004",
    time: "Hace 1 día",
    icon: MessageSquare,
  },
  {
    id: 4,
    type: "overdue",
    title: "Factura vencida",
    description: "INV-2024-003 requiere acción",
    time: "Hace 2 días",
    icon: XCircle,
  },
  {
    id: 5,
    type: "activity",
    title: "Reporte generado",
    description: "Resumen mensual completado",
    time: "Hace 3 días",
    icon: Activity,
  },
];

const getActivityColor = (type: string) => {
  switch (type) {
    case "paid":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "pending":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "comment":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "overdue":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "activity":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30";
    default:
      return "bg-muted/30 text-muted-foreground";
  }
};

export function RecentActivity() {
  return (
    <div className="bg-gradient-to-br from-card to-secondary/20 rounded-xl border border-primary/15 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 p-6 bg-gradient-to-r from-card to-secondary/30">
        <h2 className="text-lg font-semibold text-foreground">
          Actividad Reciente
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Últimas actualizaciones de tu cuenta
        </p>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-border/50 flex-1 overflow-y-auto">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="p-4 hover:bg-secondary/30 transition-all duration-300 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div
                  className={`p-2 rounded-lg flex-shrink-0 border ${getActivityColor(activity.type)}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    {activity.time}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 p-3 bg-secondary/20 mt-auto">
        <button className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-all duration-300">
          Ver toda la actividad
        </button>
      </div>
    </div>
  );
}
