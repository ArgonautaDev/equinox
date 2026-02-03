import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/tauri";
import { useAppStore } from "@/lib/store";

const setupSchema = z.object({
  orgName: z.string().min(2, "Mínimo 2 caracteres"),
  adminName: z.string().min(2, "Mínimo 2 caracteres"),
  adminEmail: z.string().email("Email inválido"),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type SetupForm = z.infer<typeof setupSchema>;

export function SetupPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      orgName: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: (data: SetupForm) =>
      auth.setupInitialAdmin(
        data.orgName,
        data.adminName,
        data.adminEmail,
        data.adminPassword
      ),
    onSuccess: (user) => {
      setUser(user);
      navigate("/");
    },
    onError: (error: unknown) => {
      console.error("Setup error:", error);
      // Tauri errors come as strings or objects with message
      let errorMessage = "Error en la configuración";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      setError("root", { message: errorMessage });
    },
  });

  const onSubmit = (data: SetupForm) => {
    setupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg bg-card/95 backdrop-blur border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Bienvenido a Equinox</CardTitle>
            <CardDescription className="text-muted-foreground">
              Configura tu organización y cuenta de administrador
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {errors.root.message}
              </div>
            )}

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre de la Organización</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgName"
                  placeholder="Mi Empresa C.A."
                  className="pl-10"
                  {...register("orgName")}
                />
              </div>
              {errors.orgName && (
                <p className="text-sm text-destructive">{errors.orgName.message}</p>
              )}
            </div>

            <hr className="border-border/50" />

            {/* Admin Name */}
            <div className="space-y-2">
              <Label htmlFor="adminName">Tu Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminName"
                  placeholder="Juan Pérez"
                  className="pl-10"
                  {...register("adminName")}
                />
              </div>
              {errors.adminName && (
                <p className="text-sm text-destructive">{errors.adminName.message}</p>
              )}
            </div>

            {/* Admin Email */}
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@miempresa.com"
                  className="pl-10"
                  {...register("adminEmail")}
                />
              </div>
              {errors.adminEmail && (
                <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...register("adminPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.adminPassword && (
                <p className="text-sm text-destructive">{errors.adminPassword.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10"
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Comenzar a usar Equinox"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Version info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
        Equinox ERP v0.1.0 • © 2026
      </div>
    </div>
  );
}

export default SetupPage;
