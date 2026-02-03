import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, FolderTree, ArrowLeftRight, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InventoryNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const items = [
    {
      href: "/inventory",
      label: "Productos",
      icon: Package,
      active: pathname === "/inventory" || pathname === "/inventory/products",
    },
    {
      href: "/inventory/categories",
      label: "Categorías",
      icon: FolderTree,
      active: pathname.startsWith("/inventory/categories"),
    },
    {
      href: "/inventory/stock",
      label: "Movimientos de Stock",
      icon: ArrowLeftRight,
      active: pathname.startsWith("/inventory/stock"),
    },
     {
      href: "/inventory/lots",
      label: "Lotes",
      icon: Boxes,
      active: pathname.startsWith("/inventory/lots"),
    },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-border/50 pb-4 mb-6 overflow-x-auto">
      {items.map((item) => (
        <Button
          key={item.href}
          variant={item.active ? "default" : "ghost"}
            size="sm"
          asChild
          className={cn(
            "gap-2 transition-all",
            item.active 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Link to={item.href}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
