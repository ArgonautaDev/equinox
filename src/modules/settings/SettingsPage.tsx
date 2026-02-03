import { useState } from "react";

import { CompanySettings } from "./components/CompanySettings";
import { SecuritySettings } from "./components/SecuritySettings";
import { InvoiceSettings } from "./components/InvoiceSettings";
import { TaxSettings } from "./components/TaxSettings";
import { NotificationSettings } from "./components/NotificationSettings";
import { IntegrationSettings } from "./components/IntegrationSettings";
import { BankAccountsManager } from "./components/BankAccountsManager";

type SettingsTab = "company" | "security" | "invoicing" | "taxes" | "notifications" | "integrations" | "bank_accounts";

const settingsTabs = [
  {
    id: "company" as const,
    label: "Empresa",
    description: "Información de la empresa",
  },
  {
    id: "security" as const,
    label: "Seguridad",
    description: "Contraseña y accesos",
  },
  {
    id: "invoicing" as const,
    label: "Facturación",
    description: "Numeración y configuración",
  },
  {
    id: "taxes" as const,
    label: "Impuestos",
    description: "Tasas y retenciones",
  },
  {
    id: "notifications" as const,
    label: "Notificaciones",
    description: "Preferencias de alertas",
  },
  {
    id: "bank_accounts" as const,
    label: "Cuentas Bancarias",
    description: "Métodos de pago",
  },
  {
    id: "integrations" as const,
    label: "Integraciones",
    description: "Servicios externos conectados",
  },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona la configuración de tu sistema ERP
        </p>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: "100ms" }}
      >
        {/* Sidebar Navigation */}
        <div className="space-y-2">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left p-4 rounded-lg transition-all border ${
                activeTab === tab.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <h3 className="font-semibold text-foreground">{tab.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {tab.description}
              </p>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {activeTab === "company" && <CompanySettings />}
            {activeTab === "security" && <SecuritySettings />}
            {activeTab === "invoicing" && <InvoiceSettings />}
            {activeTab === "taxes" && <TaxSettings />}
            {activeTab === "notifications" && <NotificationSettings />}
            {activeTab === "bank_accounts" && <BankAccountsManager />}
            {activeTab === "integrations" && <IntegrationSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
