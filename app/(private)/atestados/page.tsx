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
  Download,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import ProfilePill from "@/components/ProfilePill";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatDate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AtestadoData {
  id: string;
  data_inicio: string;
  data_fim: string;
  periodo_afastamento?: number | null;
  motivo: string;
  status:
    | "pendente"
    | "aprovado_pedagogia"
    | "aprovado_secretaria"
    | "aprovado"
    | "rejeitado";
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

const sanitizeFileName = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const trimmed = normalized.slice(0, 150);
  return trimmed || "download";
};

const getSafeExtension = (blobType: string | undefined | null) => {
  const candidate =
    blobType?.split("/")[1]?.replace("jpeg", "jpg").replace("svg+xml", "svg") || "bin";

  const normalized = candidate.toLowerCase();
  return /^[a-z0-9]+$/.test(normalized) ? normalized : "bin";
};

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

      if (
        data.user?.tipo_usuario === "administrador" ||
        data.user?.tipo_usuario === "funcionario"
      ) {
        router.push("/admin/atestados");
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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
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
      case "aprovado_pedagogia":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado - Pedagogia
          </Badge>
        );
      case "aprovado_secretaria":
        return (
          <Badge
            variant="outline"
            className="bg-teal-50 text-teal-700 border-teal-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado - Secretaria
          </Badge>
        );
      case "aprovado":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado - Completo
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
      const baseName = sanitizeFileName(
        `${inicio}_${fim}_${profile?.nome || "atestado"}`
      );
      const extension = getSafeExtension(blob.type);
      const fileName = `${baseName}.${extension}`;

      const link = document.createElement("a");
      let url: string | null = null;

      try {
        url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        link.click();
      } finally {
        if (link.parentNode) link.remove();
        if (url) URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao baixar atestado:", err);
      toast.error("Erro ao baixar atestado");
    }
  };

  if (
    !profile ||
    profile.tipo_usuario === "administrador" ||
    profile.tipo_usuario === "funcionario"
  ) {
    return null;
  }

  return (
    <div className="bg-white min-h-screen">
      <header className="bg-[hsl(210_20%_97%)] shadow-md sticky top-0 z-[9999]" style={{ borderBottom: '4px solid #005ca4' }}>
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <ProfilePill
              name={profile?.nome}
              role={
                profile?.tipo_usuario
                  ? profile.tipo_usuario === "funcionario"
                    ? "Funcionário"
                    : profile.tipo_usuario.charAt(0).toUpperCase() +
                      profile.tipo_usuario.slice(1)
                  : "Aluno"
              }
              size="md"
            />
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

      <main className="container mx-auto p-2 sm:p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 md:gap-4">
              <div style={{ width: '4px', height: '45px', backgroundColor: '#005ca4', borderRadius: '8px' }} />
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#005ca4' }}>
                  Meus Atestados
                </h1>
                <p className="text-xs md:text-base text-muted-foreground">
                  Gerencie seus atestados médicos
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/atestados/criar")}
              className="gap-2 w-full md:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-[#005ca4] hover:bg-[#004b90] text-white text-sm md:text-base"
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
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              <Card className="border-l-4 border-l-[#f57c00] bg-white hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#5b5b5f] mb-2">Pendentes</p>
                      <p className="text-3xl font-bold text-[#f57c00]">
                        {
                          atestados.filter(
                            (a) =>
                              a.status === "pendente" ||
                              a.status === "aprovado_pedagogia" ||
                              a.status === "aprovado_secretaria"
                          ).length
                        }
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-[#f57c00]" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#d8d9dd] flex gap-4 text-xs">
                    <div>
                      <p className="text-[#5b5b5f]">Pedagogia</p>
                      <p className="font-bold text-[#005ca4]">
                        {atestados.filter((a) => a.status === "aprovado_pedagogia").length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#5b5b5f]">Secretaria</p>
                      <p className="font-bold text-[#00897b]">
                        {atestados.filter((a) => a.status === "aprovado_secretaria").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#4caf50] bg-white hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#5b5b5f] mb-2">Aprovados</p>
                      <p className="text-3xl font-bold text-[#4caf50]">
                        {atestados.filter((a) => a.status === "aprovado").length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-[#4caf50]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#c56266] bg-white hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#5b5b5f] mb-2">Rejeitados</p>
                      <p className="text-3xl font-bold text-[#c56266]">
                        {atestados.filter((a) => a.status === "rejeitado").length}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-[#c56266]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo Principal */}
            {atestados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plus className="h-12 w-12 text-[#d8d9dd] mb-4" />
                <h3 className="text-lg font-semibold text-[#12385f] mb-2">Nenhum atestado enviado</h3>
                <p className="text-sm text-[#5b5b5f] mb-6">Comece enviando seu primeiro atestado médico.</p>
                <Button
                  onClick={() => router.push("/atestados/criar")}
                  className="bg-[#005ca4] hover:bg-[#004b90] text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Enviar Atestado
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {atestados.map((atestado) => (
                  <Card
                    key={atestado.id}
                    className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white/90 backdrop-blur-sm border-l-4 border-l-[#005ca4]"
                  >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg text-[#005ca4]">Atestado Médico</CardTitle>
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
                      <DialogContent className="max-w-4xl bg-white border-2 border-[#005ca4]">
                        <DialogHeader>
                          <DialogTitle className="text-[#005ca4]">Atestado Médico</DialogTitle>
                          <DialogDescription className="text-[#5b5b5f]">
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
          </>
        )}
      </main>
    </div>
  );
}
