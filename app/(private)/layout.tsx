"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
          let body: unknown = null;
          try {
            body = await response.json();
          } catch {
            /* ignore JSON parse errors */
          }

          const getMessageFromBody = (b: unknown): string | undefined => {
            if (!b || typeof b !== "object") return undefined;
            const rec = b as Record<string, unknown>;
            if (typeof rec.error === "string") return rec.error;
            if (typeof rec.message === "string") return rec.message;
            return undefined;
          };

          const apiMessage = getMessageFromBody(body) ?? "Token inválido";

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

  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Home", href: "/dashboard" }];

    const labels: Record<string, string> = {
      admin: "Admin",
      atestados: "Atestados",
      usuarios: "Usuários",
      "create-user": "Criar Usuário",
      perfil: "Perfil",
      dashboard: "Dashboard",
    };

    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;
      breadcrumbs.push({
        label: labels[path] || path,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

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
    return null;
  }

  const isAdminRoute =
    user.tipo_usuario === "administrador" &&
    (pathname.startsWith("/admin") || pathname === "/dashboard");

  if (!isAdminRoute) {
    return <>{children}</>;
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider>
      <AdminSidebar userName={user.nome} userEmail={user.email} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
