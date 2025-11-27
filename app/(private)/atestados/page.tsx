"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  LogOut,
  Download,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { formatDate } from "@/utils/formatDate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProfilePill from "@/components/ProfilePill";

interface AtestadoData {
  id: string;
  data_inicio: string;
  data_fim: string;
  periodo_afastamento?: number | null;
  motivo: string;
  status: "pendente" | "aprovado" | "rejeitado";
  imagem: string;
  createdAt: string;
  observacoes_admin?: string;
}

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

export default function AtestadosPage() {
  const router = useRouter();
  const [atestados, setAtestados] = useState<AtestadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

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

      if (data.user?.tipo_usuario === "administrador") {
        router.push("/dashboard");
        return;
      }

      setProfile(data.user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/auth/login");
    }
  }, [router]);

  const fetchAtestados = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/atestados", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAtestados(result.data || []);
      } else {
        toast.error("Erro ao carregar atestados");
      }
    } catch (error) {
      console.error("Error fetching atestados:", error);
      toast.error("Erro ao carregar atestados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchAtestados();
  }, [fetchProfile, fetchAtestados]);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout realizado");
    router.push("/auth/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "aprovado":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toYMD = (v?: string | null) => {
    if (!v) return "unknown";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v as string;
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return "unknown";
    return d.toISOString().slice(0, 10);
  };

  const downloadAtestado = async (atestado: AtestadoData) => {
    if (!atestado.imagem) {
      toast.error("Imagem do atestado não disponível para download");
      return;
    }

    try {
      const res = await fetch(atestado.imagem);
      if (!res.ok) throw new Error("Falha ao baixar imagem");
      const blob = await res.blob();

      const inicio = toYMD(atestado.data_inicio);
      const fim = toYMD(atestado.data_fim);
      const nomeOrig = (profile?.nome || "atestado")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\-]/g, "");

      let ext = "jpg";
      if (blob.type) {
        const parts = blob.type.split("/");
        if (parts[1])
          ext = parts[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
      }

      const fileName = `${inicio}_${fim}_${nomeOrig}.${ext}`;

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar atestado:", err);
      toast.error("Erro ao baixar atestado");
    }
  };

  if (!profile || profile.tipo_usuario === "administrador") {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <ProfilePill name={profile?.nome} role="Aluno" size="md" />
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
      </header>

      <main className="container mx-auto p-4 md:p-8 relative z-10">
        <div className="mb-8">
          <div className="flex flex-col items-center text-center gap-3 md:flex-row md:items-center md:justify-between md:text-left">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Meus Atestados
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Gerencie seus atestados médicos
              </p>
            </div>
            <Button
              onClick={() => router.push("/atestados/criar")}
              className="gap-2 w-full md:w-auto bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Novo Atestado
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : atestados.length === 0 ? (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-sm border-2 shadow-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 p-3 bg-primary/10 rounded-full">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mb-2">
                  Nenhum atestado encontrado
                </CardTitle>
                <CardDescription className="mb-4">
                  Você ainda não enviou nenhum atestado médico.
                </CardDescription>
                <Button
                  onClick={() => router.push("/atestados/criar")}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Enviar Primeiro Atestado
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6">
            {atestados.map((atestado) => (
              <Card
                key={atestado.id}
                className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white/80 backdrop-blur-sm border-l-4 border-l-blue-500"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">Atestado Médico</CardTitle>
                      <CardDescription>
                        Enviado em {formatDate(atestado.createdAt)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(atestado.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Data de Início
                      </p>
                      <p>{formatDate(atestado.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Data de Fim
                      </p>
                      <div className="flex items-center gap-3">
                        <p>{formatDate(atestado.data_fim)}</p>
                        {(() => {
                          const raw =
                            (
                              atestado as unknown as {
                                periodo_afastamento?: unknown;
                              }
                            ).periodo_afastamento ?? null;
                          let period: number | null = null;

                          if (raw !== null && typeof raw !== "undefined") {
                            const n = Number(raw);
                            if (
                              !Number.isNaN(n) &&
                              Number.isFinite(n) &&
                              n > 0
                            ) {
                              period = Math.trunc(n);
                            }
                          }

                          if (period === null) {
                            try {
                              const s = new Date(atestado.data_inicio);
                              const e = new Date(atestado.data_fim);
                              if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                                const diffDays = Math.round(
                                  (e.setHours(0, 0, 0, 0) -
                                    s.setHours(0, 0, 0, 0)) /
                                    (1000 * 60 * 60 * 24)
                                );
                                period = diffDays + 1;
                              }
                            } catch {
                              period = null;
                            }
                          }

                          if (period !== null) {
                            return (
                              <p className="text-sm text-muted-foreground">
                                • Período: {period} dia{period > 1 ? "s" : ""}
                              </p>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {atestado.motivo && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">
                        Motivo
                      </p>
                      <p className="text-sm bg-muted p-2 rounded">
                        {atestado.motivo}
                      </p>
                    </div>
                  )}

                  {atestado.observacoes_admin && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">
                        {atestado.status === "rejeitado"
                          ? "Motivo da Rejeição"
                          : "Observações"}
                      </p>
                      <p
                        className={`text-sm p-2 rounded ${
                          atestado.status === "rejeitado"
                            ? "bg-red-50 border border-red-200 text-red-700"
                            : "bg-blue-50 border border-blue-200 text-blue-700"
                        }`}
                      >
                        {atestado.observacoes_admin}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Atestado
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Atestado Médico</DialogTitle>
                          <DialogDescription>
                            Atestado enviado em {formatDate(atestado.createdAt)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="relative w-full h-96">
                          {atestado.imagem ? (
                            <Image
                              src={atestado.imagem}
                              alt="Atestado médico"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Sem imagem disponível
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {atestado.imagem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAtestado(atestado)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-linear-to-br from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Pendentes</p>
                  <p className="text-2xl font-bold">
                    {atestados.filter((a) => a.status === "pendente").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Aprovados</p>
                  <p className="text-2xl font-bold">
                    {atestados.filter((a) => a.status === "aprovado").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Rejeitados</p>
                  <p className="text-2xl font-bold">
                    {atestados.filter((a) => a.status === "rejeitado").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
