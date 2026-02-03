import { Menu, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppNotifications } from "./AppNotifications";
import { AppUserProfile } from "./AppUserProfile";

interface HeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: HeaderProps) {
  return (
    <header
      className="border-b border-primary/10 bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm sticky top-0 z-40"
      style={{ transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        {/* Left Section */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden transition-smooth h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-10 pr-4 h-9 bg-secondary/50 border border-primary/10 rounded-full text-sm transition-smooth focus:bg-secondary/70 focus:border-primary/30"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 ml-auto">
          {/* New Invoice Button */}
          <Link to="/invoices/new">
            <Button className="gap-2 transition-smooth h-9 text-sm font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Factura</span>
            </Button>
          </Link>

          {/* Notifications Panel */}
          <AppNotifications />

          {/* User Profile Panel */}
          <AppUserProfile />
        </div>
      </div>
    </header>
  );
}
