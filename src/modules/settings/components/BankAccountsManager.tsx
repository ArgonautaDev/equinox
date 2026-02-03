import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings, CreateBankAccountDto } from "@/lib/tauri";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Landmark, Star, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function BankAccountsManager() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<CreateBankAccountDto>({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    currency: "USD",
    is_default: false,
  });

  // Query
  const { data: accounts, isLoading, isError, error } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: settings.listBankAccounts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: settings.createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setIsCreateOpen(false);
      setFormData({
        bank_name: "",
        account_number: "",
        account_type: "checking",
        currency: "USD",
        is_default: false,
      });
      toast.success("Cuenta bancaria creada");
    },
    onError: (err: string) => toast.error(err),
  });

  const deleteMutation = useMutation({
    mutationFn: settings.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta eliminada");
    },
    onError: (err: string) => toast.error(err),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (data: { id: string; is_default: boolean }) =>
      settings.updateBankAccount(data.id, { is_default: data.is_default }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta actualizada");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_name || !formData.account_number) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
        <h3 className="font-semibold">Error al cargar cuentas</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Cuentas Bancarias
          </CardTitle>
          <CardDescription>
            Gestiona las cuentas para recibir pagos
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Cuenta Bancaria</DialogTitle>
              <DialogDescription>
                Ingresa los detalles de la cuenta bancaria.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input
                    placeholder="Ej: Banesco"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) =>
                      setFormData({ ...formData, currency: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="VES">Bolívares (Bs)</SelectItem>
                      <SelectItem value="EUR">Euros (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Número de Cuenta / Teléfono (Pago Móvil)</Label>
                <Input
                  placeholder="0000-0000-00-0000000000"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cuenta</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, account_type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Corriente</SelectItem>
                      <SelectItem value="savings">Ahorro</SelectItem>
                      <SelectItem value="mobile">Pago Móvil</SelectItem>
                      <SelectItem value="cash">Efectivo / Caja</SelectItem>
                      <SelectItem value="wallet">Billetera Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-center pt-8">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="default-mode"
                      checked={formData.is_default}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_default: checked })
                      }
                    />
                    <Label htmlFor="default-mode">Marcar como Principal</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {accounts?.map((account) => (
            <div
              key={account.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors group"
            >
              <div className="flex gap-3">
                <div className="mt-1 p-2 bg-secondary rounded-full">
                  {account.account_type === "mobile" ? (
                    <CreditCard className="w-4 h-4 text-primary" />
                  ) : (
                    <Landmark className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{account.bank_name}</h3>
                    {account.is_default && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        Principal
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    {account.account_number}
                  </p>
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {account.currency}
                    </Badge>
                    <span className="capitalize">
                      {account.account_type === "checking"
                        ? "Corriente"
                        : account.account_type === "savings"
                        ? "Ahorro"
                        : account.account_type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!account.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Hacer Principal"
                    onClick={() =>
                      setDefaultMutation.mutate({
                        id: account.id,
                        is_default: true,
                      })
                    }
                  >
                    <Star className="w-4 h-4 text-muted-foreground hover:text-yellow-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (
                      confirm(
                        "¿Estás seguro de eliminar esta cuenta? Esto no borrará el historial de pagos.",
                      )
                    ) {
                      deleteMutation.mutate(account.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {accounts?.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              No hay cuentas registradas. Agrega una para comenzar.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
