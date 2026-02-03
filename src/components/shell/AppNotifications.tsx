import { useState } from "react";
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Pago confirmado",
    description: "Factura INV-2024-001 ha sido pagada",
    time: "5 min",
    read: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Stock bajo",
    description: 'Producto "Widget Pro" requiere reposición',
    time: "2 horas",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Nuevo cliente registrado",
    description: "TechCorp Solutions se ha unido",
    time: "1 día",
    read: true,
  },
  {
    id: "4",
    type: "error",
    title: "Factura vencida",
    description: "INV-2024-003 requiere acción",
    time: "2 días",
    read: true,
  },
];

const getNotificationColor = (type: string) => {
  switch (type) {
    case "success":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "warning":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "info":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "error":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted/30 text-muted-foreground";
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "success":
      return CheckCircle;
    case "warning":
      return AlertCircle;
    case "info":
      return Clock;
    case "error":
      return AlertCircle;
    default:
      return MessageSquare;
  }
};

export function AppNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-smooth"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-float">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Panel */}
      {isOpen && (
        <>
          <div className="absolute right-0 top-12 w-96 bg-card border border-primary/15 rounded-xl shadow-xl shadow-primary/20 overflow-hidden animate-expand z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-card to-secondary/30">
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearAll}
                  >
                    Limpiar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            {notifications.length > 0 ? (
              <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-secondary/30 transition-colors flex gap-3 ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${getNotificationColor(
                          notification.type,
                        )} border`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {notification.time}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay notificaciones
                </p>
              </div>
            )}

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border/50 p-3 bg-secondary/20">
                <Link to="/notifications">
                  <Button
                    variant="ghost"
                    className="w-full h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Ver todas las notificaciones
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Overlay for closing when clicking outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
