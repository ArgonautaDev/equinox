import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

const notificationOptions = [
  {
    id: "invoice_created",
    title: "Nueva Factura Creada",
    description: "Notifica cuando se crea una nueva factura",
    icon: Mail,
  },
  {
    id: "low_stock",
    title: "Stock Bajo",
    description: "Alerta cuando el stock de un producto es bajo",
    icon: Bell,
  },
  {
    id: "payment_received",
    title: "Pago Recibido",
    description: "Notifica cuando se recibe un pago",
    icon: MessageSquare,
  },
  {
    id: "customer_created",
    title: "Nuevo Cliente",
    description: "Alerta cuando se registra un nuevo cliente",
    icon: Bell,
  },
  {
    id: "report_generated",
    title: "Reporte Generado",
    description: "Notifica cuando un reporte está listo",
    icon: Mail,
  },
  {
    id: "system_updates",
    title: "Actualizaciones del Sistema",
    description: "Información sobre actualizaciones del ERP",
    icon: MessageSquare,
  },
];

export function NotificationSettings() {
  const initialNotifications = notificationOptions.reduce(
    (acc, opt) => {
      acc[opt.id] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const [notifications, setNotifications] = useState(initialNotifications);

  const toggleNotification = (id: string) => {
    setNotifications((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className="p-6 border-border">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        Preferencias de Notificaciones
      </h2>

      <div className="space-y-4">
        {notificationOptions.map((option) => {
          const Icon = option.icon;
          const isEnabled = notifications[option.id];

          return (
            <div
              key={option.id}
              className="p-4 border border-border rounded-lg flex items-start gap-4 hover:border-primary/50 transition-all"
            >
              <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{option.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleNotification(option.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <Button className="gap-2">Guardar Preferencias</Button>
      </div>
    </Card>
  );
}
