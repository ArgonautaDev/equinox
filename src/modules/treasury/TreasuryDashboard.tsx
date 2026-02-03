import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { payments } from "@/lib/tauri";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { 
  Landmark, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  CreditCard,
  X,
  Search,
  ArrowRight
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function TreasuryDashboard() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate balances to ensure we have the latest structure (with IDs)
    queryClient.invalidateQueries({ queryKey: ["treasury-balances"] });
  }, [queryClient]);

  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["treasury-balances"],
    queryFn: payments.getAccountBalances,
  });

  const { data: movements = [], isLoading: loadingMovements, isRefetching } = useQuery({
    queryKey: ["treasury-movements", selectedAccount],
    queryFn: () => payments.getRecentMovements(50, selectedAccount || undefined),
  });

  // Calculate KPIs
  const totalLiquidity = balances.reduce((acc, curr) => acc + curr.balance, 0);
  
  const currentMonth = new Date().getMonth();
  const monthlyIncome = movements
    .filter(m => m.type_ === "IN" && new Date(m.date).getMonth() === currentMonth)
    .reduce((acc, m) => acc + m.amount, 0);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const selectedAccountData = balances.find(b => b.id === selectedAccount);

  return (
    <div className="h-full flex flex-col animate-fade-in bg-background">
      {/* Header Section with Glassmorphism feel */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center p-6 border-b bg-muted/10 backdrop-blur-sm sticky top-0 z-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                <Landmark className="h-7 w-7 text-primary" />
            </div>
            Finanzas
          </h1>
          <p className="text-muted-foreground mt-1 ml-1 text-sm font-medium">
            Control de liquidez y conciliación bancaria.
          </p>
        </div>
        
        {/* KPI Pills */}
        <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end px-5 py-2.5 bg-card/50 border rounded-xl shadow-sm hover:shadow-md transition-all">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Liquidez Total</span>
                <span className="text-2xl font-bold font-mono text-primary tracking-tight">
                    {formatCurrency(totalLiquidity, "USD")}
                    <span className="text-xs text-muted-foreground ml-1 font-sans font-normal align-top">*</span>
                </span>
            </div>
            <div className="flex flex-col items-end px-5 py-2.5 bg-card/50 border rounded-xl shadow-sm hover:shadow-md transition-all">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Ingresos (Mes)</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 flex items-center gap-2 tracking-tight">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    {formatCurrency(monthlyIncome, "USD")}
                </span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 min-h-0">
        
        {/* Left Column: Accounts List (Navigation-like) */}
        <div className="lg:col-span-4 flex flex-col border-r bg-muted/5">
            <div className="p-4 border-b flex items-center justify-between bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Wallet className="w-4 h-4" />
                    Cuentas Disponibles
                </h3>
                <Badge variant="secondary" className="text-[10px] font-mono">{balances.length}</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loadingBalances ? (
                    Array(3).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))
                ) : (
                    balances.map((account) => {
                        const isSelected = selectedAccount === account.id;
                        return (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccount(isSelected ? null : account.id)}
                                className={cn(
                                    "flex flex-col gap-3 p-4 w-full transition-all text-left border rounded-xl relative overflow-hidden group",
                                    isSelected 
                                        ? "bg-background border-primary shadow-md ring-1 ring-primary/20" 
                                        : "bg-card border-border/50 hover:bg-card/80 hover:border-primary/50 hover:shadow-sm"
                                )}
                            >
                                {isSelected && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                                
                                <div className="flex justify-between items-start w-full relative z-10">
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "font-semibold text-base flex items-center gap-2",
                                            isSelected ? "text-primary" : "text-foreground"
                                        )}>
                                            {account.bank_name}
                                            {isSelected && <ArrowRight className="w-4 h-4" />}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5 font-medium">{account.currency}</span>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider opacity-70">Saldo Disponible</span>
                                    <span className={cn(
                                        "font-bold text-xl font-mono tracking-tighter",
                                        account.balance < 0 ? "text-destructive" : "text-foreground"
                                    )}>
                                        {formatCurrency(account.balance, account.currency)}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        {/* Right Column: Activity Table */}
        <div className="lg:col-span-8 flex flex-col bg-background/50">
             {/* Dynamic Filter Header */}
             <div className={cn(
                 "p-4 border-b flex items-center justify-between transition-colors",
                 selectedAccountData ? "bg-primary/5 border-primary/20" : "bg-muted/10"
             )}>
                <div className="flex items-center gap-4">
                     <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Calendar className="w-4 h-4" />
                        Historial de Movimientos
                    </h3>
                    
                    {selectedAccountData && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                             <div className="h-5 w-px bg-border/60 mx-1" />
                             <Badge className="px-3 py-1.5 text-sm gap-2 pl-2 pr-1 shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
                                <span className="opacity-70 font-normal">Filtrando por:</span>
                                <span className="font-bold">{selectedAccountData.bank_name}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedAccount(null); }}
                                    className="ml-2 hover:bg-black/20 dark:hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                             </Badge>
                        </div>
                    )}
                </div>
                
                {isRefetching && (
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                        Actualizando...
                    </span>
                 )}
             </div>

             <div className="flex-1 overflow-auto bg-card relative">
                {(loadingMovements || isRefetching) && !movements.length ? (
                    <div className="p-8 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/5 sticky top-0 bg-background/95 backdrop-blur z-10 text-xs">
                            <TableRow className="hover:bg-transparent border-b-border/60">
                                <TableHead className="w-[180px] font-semibold">FECHA / HORA</TableHead>
                                <TableHead className="w-[100px] font-semibold">TIPO</TableHead>
                                <TableHead className="font-semibold">DESCRIPCIÓN</TableHead>
                                {!selectedAccount && <TableHead className="w-[140px] font-semibold">CUENTA</TableHead>}
                                <TableHead className="text-right w-[160px] font-semibold pr-6">MONTO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-[400px] text-center">
                                       <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/50">
                                            <div className="p-6 bg-muted/30 rounded-full">
                                                <Search className="w-12 h-12 opacity-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-lg text-foreground">Sin movimientos</p>
                                                <p className="text-sm">No se encontraron transacciones para este criterio.</p>
                                            </div>
                                       </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((move) => (
                                    <TableRow key={move.id} className="group hover:bg-muted/40 border-b-border/30 transition-colors">
                                        <TableCell className="py-4 align-middle">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-foreground">
                                                    {format(new Date(move.date), "dd MMM yyyy", { locale: es })}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {format(new Date(move.date), "HH:mm")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 align-middle">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center border",
                                                move.type_ === "IN" 
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                                            )}>
                                                {move.type_ === "IN" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 align-middle">
                                            <div className="flex flex-col gap-1 max-w-[300px]">
                                                <span className="font-medium text-sm truncate" title={move.description}>
                                                    {move.description}
                                                </span>
                                                {move.reference && (
                                                    <Badge variant="outline" className="w-fit text-[10px] h-5 px-1.5 font-mono text-muted-foreground border-border/60">
                                                        REF: {move.reference}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        {!selectedAccount && (
                                            <TableCell className="py-4 align-middle">
                                                <div className="text-xs font-semibold text-muted-foreground bg-muted/40 px-2 py-1 rounded-md w-fit">
                                                    {move.bank_name}
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right py-4 align-middle pr-6">
                                            <span className={cn(
                                                "font-bold font-mono text-base tracking-tight",
                                                move.type_ === "IN" ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {move.type_ === "IN" ? "+" : "-"}
                                                {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(move.amount)}
                                                <span className="text-xs ml-1.5 text-muted-foreground/70 font-sans font-normal">
                                                    {move.currency}
                                                </span>
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
             </div>
        </div>
      </div>
    </div>
  );
}
