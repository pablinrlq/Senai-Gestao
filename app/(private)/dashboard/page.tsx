"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

interface Stats {
  totalUsuarios: number;
  totalAtestados: number;
  atestadosPendentes: number;
  atestadosAprovados: number;
  atestadosRejeitados: number;
  atestadosAprovPedagogia: number;
  atestadosAprovSecretaria: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsuarios: 0,
    totalAtestados: 0,
    atestadosPendentes: 0,
    atestadosAprovados: 0,
    atestadosRejeitados: 0,
    atestadosAprovPedagogia: 0,
    atestadosAprovSecretaria: 0,
  });

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

      if (
        !(
          data.user?.tipo_usuario === "administrador" ||
          data.user?.tipo_usuario === "funcionario"
        )
      ) {
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

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const usersResponse = await fetch("/api/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const atestadosResponse = await fetch("/api/admin/atestados", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setStats((prev) => ({
          ...prev,
          totalUsuarios: usersData.usuarios?.length || 0,
        }));
      }

      if (atestadosResponse.ok) {
        const atestadosData = await atestadosResponse.json();
        const atestados = atestadosData.data || [];

        setStats((prev) => ({
          ...prev,
          totalAtestados: atestados.length,
          atestadosPendentes: atestados.filter(
            (a: { status: string }) =>
              a.status === "pendente" ||
              a.status === "aprovado_pedagogia" ||
              a.status === "aprovado_secretaria"
          ).length,
          atestadosAprovados: atestados.filter(
            (a: { status: string }) => a.status === "aprovado"
          ).length,
          atestadosRejeitados: atestados.filter(
            (a: { status: string }) => a.status === "rejeitado"
          ).length,
          atestadosAprovPedagogia: atestados.filter(
            (a: { status: string }) => a.status === "aprovado_pedagogia"
          ).length,
          atestadosAprovSecretaria: atestados.filter(
            (a: { status: string }) => a.status === "aprovado_secretaria"
          ).length,
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile, fetchStats]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (
    !profile ||
    !(
      profile.tipo_usuario === "administrador" ||
      profile.tipo_usuario === "funcionario"
    )
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-white">
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Bem-vindo, {profile.nome.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gerenciamento de atestados
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
              <p className="text-xs text-muted-foreground">
                Usuários cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Atestados
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAtestados}</div>
              <p className="text-xs text-muted-foreground">
                Atestados enviados ao sistema
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atestados Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {stats.atestadosPendentes}
              </div>
              <p className="text-xs text-yellow-600">Aguardando sua revisão</p>
              <div className="mt-3 flex gap-4">
                <div className="text-xs">
                  <p className="text-muted-foreground">Aprov. Pedagogia</p>
                  <p className="font-semibold text-sm text-blue-700">
                    {stats.atestadosAprovPedagogia}
                  </p>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">Aprov. Secretaria</p>
                  <p className="font-semibold text-sm text-teal-700">
                    {stats.atestadosAprovSecretaria}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atestados Aprovados
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {stats.atestadosAprovados}
              </div>
              <p className="text-xs text-green-600">Revisados e aprovados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-red-200 bg-red-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atestados Rejeitados
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {stats.atestadosRejeitados}
              </div>
              <p className="text-xs text-red-600">Não atenderam critérios</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Aprovação
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats.totalAtestados > 0
                  ? Math.round(
                      (stats.atestadosAprovados / stats.totalAtestados) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-blue-600">
                Atestados aprovados do total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Ações Pendentes
              </CardTitle>
              <CardDescription>
                Tarefas que requerem sua atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.atestadosPendentes > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-sm">Revisar Atestados</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.atestadosPendentes}{" "}
                          {stats.atestadosPendentes === 1
                            ? "atestado pendente"
                            : "atestados pendentes"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Não há atestados pendentes no momento! 🎉
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
              <CardDescription>Links úteis para administração</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/admin/atestados")}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                >
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Revisar Atestados</p>
                    <p className="text-xs text-muted-foreground">
                      Ver todos os atestados
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/admin/usuarios")}
                  className="w-full flex items-center gap-3 p-3 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors"
                >
                  <Users className="h-5 w-5 text-orange-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Gerenciar Usuários</p>
                    <p className="text-xs text-muted-foreground">
                      Ver todos os usuários
                    </p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
