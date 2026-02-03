import {
  X,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Plus,
  Users,
  Package,
  ChevronLeft,
  Landmark,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },

  { icon: Users, label: "Clientes", href: "/clients" }, // Changed /customers to /clients to match module name
  { icon: Package, label: "Inventario", href: "/inventory" },
  { icon: FileText, label: "Facturación", href: "/invoices" },
  // { icon: FileText, label: "Nueva Factura", href: "/facturacion" },
  { icon: BarChart3, label: "Cuentas por Cobrar", href: "/receivables" },
  { icon: Landmark, label: "Tesorería", href: "/treasury" },
  { icon: Settings, label: "Configuración", href: "/settings" },
];

export function AppSidebar({ open, onOpenChange }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40 animate-fade-in"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 lg:z-auto border-r border-sidebar-border/50",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-20" : "w-64",
        )}
        style={{
          transition:
            "width 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border/50">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Equinox ERP</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-smooth"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expandir" : "Contraer"}
            >
              <ChevronLeft
                className={cn("w-4 h-4", collapsed && "rotate-180")}
                style={{
                  transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-smooth"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* New Invoice Button */}
        {!collapsed && (
          <div
            className="p-4 animate-fade-in"
            style={{ animationDelay: "50ms" }}
          >
            <Link to="/invoices/new">
              <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-sm transition-smooth">
                <Plus className="w-4 h-4" />
                Nueva Factura
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 py-4">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            // Exact match for root, startsWith for others
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth text-sm font-medium h-9",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                )}
                title={collapsed ? item.label : undefined}
                style={{
                  animation: !collapsed
                    ? `fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) ${100 + i * 30}ms backwards`
                    : "none",
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50">
          <Button
            variant="ghost"
            className={cn(
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-smooth h-9",
              collapsed
                ? "w-full justify-center p-0"
                : "w-full justify-start gap-3 text-sm font-medium",
            )}
            title={collapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
