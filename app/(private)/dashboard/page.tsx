"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import ProfilePill from "@/components/ProfilePill";
import { FileText, LogOut, UserCircle, User, UserPlus } from "lucide-react";

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
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
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();

      // Redirect students to atestados page
      if (data.user?.tipo_usuario !== "administrador") {
        router.push("/atestados");
        return;
      }

      setProfile(data.user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout realizado");
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Only admins should see this dashboard
  if (!profile || profile.tipo_usuario !== "administrador") {
    return null; // The redirect happens in fetchProfile
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-white relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-12 left-4 w-56 h-56 rounded-full bg-blue-200/20 blur-3xl transform -rotate-6"></div>
      <div className="pointer-events-none absolute -bottom-16 right-8 w-72 h-72 rounded-full bg-indigo-200/20 blur-3xl transform rotate-6"></div>

      <header className="border-b bg-white/75 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Logo />
          </div>

          <div className="flex items-center gap-3">
            <ProfilePill name={profile?.nome} role="Administrador" size="md" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-linear-to-r from-blue-50 to-indigo-50" />
      </header>

      <main className="container mx-auto p-4 md:p-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Gerencie atestados médicos e usuários do sistema
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="transform-gpu hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border border-slate-200"
            onClick={() => router.push("/admin/atestados")}
          >
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Revisar Atestados</CardTitle>
              <CardDescription>
                Analise e aprove atestados enviados pelos alunos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full cursor-pointer bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md">
                Revisar
              </Button>
            </CardContent>
          </Card>

          <Card
            className="transform-gpu hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border border-slate-200"
            onClick={() => router.push("/admin/usuarios")}
          >
            <CardHeader>
              <User className="h-10 w-10 text-secondary mb-2" />
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>
                Visualize e gerencie usuários existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full cursor-pointer bg-linear-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 shadow-md">
                Gerenciar
              </Button>
            </CardContent>
          </Card>

          <Card
            className="transform-gpu hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border border-slate-200"
            onClick={() => router.push("/admin/create-user")}
          >
            <CardHeader>
              <UserPlus className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Criar Usuário</CardTitle>
              <CardDescription>
                Adicione novos administradores e funcionários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-white/60 border cursor-pointer border-slate-200 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm">
                Criar
              </Button>
            </CardContent>
          </Card>

          <Card
            className="transform-gpu hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border border-slate-200"
            onClick={() => router.push("/perfil")}
          >
            <CardHeader>
              <UserCircle className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Visualize suas informações</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full border cursor-pointer border-slate-200 bg-blue-500 shadow-sm">
                Ver Perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
