"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface User {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Você precisa estar logado para acessar esta página");
        router.push("/auth/login");
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          // Try to read the error message from the API to give better feedback
          let body: any = null;
          try {
            body = await response.json();
          } catch (e) {
            /* ignore JSON parse errors */
          }

          const apiMessage = body?.error || body?.message || "Token inválido";

          // Handle common auth-related statuses explicitly
          if (response.status === 401) {
            console.warn("Unauthorized:", apiMessage);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            toast.error(apiMessage || "Sessão expirada. Faça login novamente.");
            router.push("/auth/login");
            setLoading(false);
            return;
          }

          if (response.status === 404) {
            console.warn("User not found:", apiMessage);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            toast.error(
              apiMessage || "Usuário não encontrado. Faça login novamente."
            );
            router.push("/auth/login");
            setLoading(false);
            return;
          }

          throw new Error(apiMessage);
        }

        const data = await response.json();
        setUser(data.user);

        // Check admin access for admin routes
        if (
          pathname.startsWith("/admin") &&
          data.user?.tipo_usuario !== "administrador"
        ) {
          toast.error("Acesso negado. Esta área é restrita a administradores.");
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
}
