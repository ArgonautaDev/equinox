import { useState } from "react";
import { LogOut, Settings, FileText, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { auth } from "@/lib/tauri";
import { toast } from "sonner";

export function AppUserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout: logoutAction } = useAppStore();

  // Fallback initials if no user
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const userInitials = user ? getInitials(user.name) : "U";
  const userName = user?.name || "Usuario";
  const userEmail = user?.email || "";
  const userRole = user?.role || "Usuario";

  const menuItems = [
    {
      label: "Configuración",
      icon: Settings,
      href: "/settings",
    },
    {
      label: "Reportes",
      icon: BarChart3,
      href: "/reports",
    },
    {
      label: "Documentación",
      icon: FileText,
      href: "/docs",
    },
  ];

  const handleLogout = async () => {
    try {
      await auth.logout();
      logoutAction();
      toast.success("Sesión cerrada correctamente");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-smooth ml-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold">{userInitials}</span>
      </Button>

      {/* Panel */}
      {isOpen && (
        <>
          <div className="absolute right-0 top-12 w-80 bg-card border border-primary/15 rounded-xl shadow-xl shadow-primary/20 overflow-hidden animate-expand z-50">
            {/* Header con Perfil */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold shadow-lg shadow-primary/30">
                    {userInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">
                {userEmail}
              </p>
            </div>

            {/* Menu Items */}
            <div className="divide-y divide-border/50">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-none hover:bg-secondary/40 text-foreground"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 bg-secondary/20 border-t border-border/50">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-2 h-auto text-destructive hover:bg-destructive/10 text-sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>

          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
