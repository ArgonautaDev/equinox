import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ExternalLink } from "lucide-react";

const integrations = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Procesar pagos en línea",
    connected: true,
    icon: "💳",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Enviar notificaciones por email",
    connected: false,
    icon: "📧",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Recibir alertas en Slack",
    connected: true,
    icon: "💬",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automatizar flujos de trabajo",
    connected: false,
    icon: "⚙️",
  },
  {
    id: "cloud_storage",
    name: "Google Drive",
    description: "Almacenar documentos en la nube",
    connected: true,
    icon: "☁️",
  },
  {
    id: "accounting",
    name: "Contabilidad",
    description: "Sincronizar con software contable",
    connected: false,
    icon: "📊",
  },
];

export function IntegrationSettings() {
  return (
    <Card className="p-6 border-border">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        Integraciones Disponibles
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="p-4 border border-border rounded-lg hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              {integration.connected && (
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <Check className="w-4 h-4" />
                  <span>Conectado</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant={integration.connected ? "outline" : "default"}
                size="sm"
                className="flex-1"
              >
                {integration.connected ? "Desconectar" : "Conectar"}
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-border">
        <h3 className="font-semibold text-foreground mb-4">API Key</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Usa tu API key para conectar aplicaciones personalizadas
        </p>
        <div className="space-y-3">
          <Input
            type="password"
            value="sk_live_abc123def456..."
            readOnly
            className="font-mono text-xs"
          />
          <Button variant="outline" size="sm">
            Regenerar API Key
          </Button>
        </div>
      </div>
    </Card>
  );
}
