"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User,
  FileText,
  Download,
  Search,
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
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/formatDate";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  aprovado_pedagogia_por?: string | null;
  aprovado_pedagogia_em?: string | null;
  aprovado_secretaria_por?: string | null;
  aprovado_secretaria_em?: string | null;
  usuario: {
    id: string;
    nome: string;
    email: string;
    ra: string;
    turma?: string;
  };
}

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
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

export default function AdminAtestadosPage() {
  const router = useRouter();
  const [atestados, setAtestados] = useState<AtestadoData[]>([]);
  const [filteredAtestados, setFilteredAtestados] = useState<AtestadoData[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [turmaFilter, setTurmaFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<string[]>([]);

  const [observacoes, setObservacoes] = useState("");

  const checkAdminAccess = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      setAccessChecked(true);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check user type");
      }

      const data = await response.json();

      if (
        !(
          data.user?.tipo_usuario === "administrador" ||
          data.user?.tipo_usuario === "funcionario"
        )
      ) {
        toast.error("Acesso negado");
        router.push("/atestados");
        setAccessChecked(true);
        return;
      }

      setProfile(data.user);
      setAccessChecked(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/auth/login");
      setAccessChecked(true);
    }
  }, [router]);

  const fetchAtestados = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/atestados", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const atestadosData = result.data || [];
        setAtestados(atestadosData);
        setFilteredAtestados(atestadosData);

        const turmas = Array.from(
          new Set(
            atestadosData
              .map((a: AtestadoData) => a.usuario?.turma)
              .filter((t: string | undefined): t is string => !!t)
          )
        ).sort() as string[];
        setTurmasDisponiveis(turmas);
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
    checkAdminAccess();
    fetchAtestados();
  }, [checkAdminAccess, fetchAtestados]);

  useEffect(() => {
    let filtered = atestados;

    if (turmaFilter && turmaFilter !== "__all__") {
      filtered = filtered.filter((a) => a.usuario?.turma === turmaFilter);
    }

    if (statusFilter && statusFilter !== "__all__") {
      filtered = filtered.filter((a) => {
        if (statusFilter === "pendente") {
          return (
            a.status === "pendente" ||
            a.status === "aprovado_pedagogia" ||
            a.status === "aprovado_secretaria"
          );
        }
        return a.status === statusFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.usuario?.nome?.toLowerCase().includes(query) ||
          a.usuario?.email?.toLowerCase().includes(query) ||
          a.usuario?.ra?.toLowerCase().includes(query) ||
          a.usuario?.turma?.toLowerCase().includes(query) ||
          a.motivo?.toLowerCase().includes(query)
      );
    }

    setFilteredAtestados(filtered);
  }, [turmaFilter, statusFilter, searchQuery, atestados]);

  const handleReviewAtestado = async (
    atestadoId: string,
    novoStatus:
      | "aprovado_pedagogia"
      | "aprovado_secretaria"
      | "aprovado"
      | "rejeitado"
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/admin/atestados/${atestadoId}/review`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: novoStatus,
            observacoes_admin: observacoes || undefined,
          }),
        }
      );

      if (response.ok) {
        const statusLabels: Record<string, string> = {
          aprovado_pedagogia: "aprovado pela pedagogia",
          aprovado_secretaria: "aprovado pela secretaria",
          aprovado: "aprovado (completo)",
          rejeitado: "rejeitado",
        };
        toast.success(`Atestado ${statusLabels[novoStatus]} com sucesso!`);
        setObservacoes("");
        fetchAtestados();
      } else {
        const error = await response.json();
        toast.error(
          error.error || error.message || "Erro ao atualizar atestado"
        );
      }
    } catch (error) {
      console.error("Error reviewing atestado:", error);
      toast.error("Erro ao atualizar atestado");
    }
  };

  const getStatusBadges = (atestado: AtestadoData) => {
    const badges = [];

    if (atestado.status === "aprovado") {
      badges.push(
        <Badge
          key="aprovado"
          variant="outline"
          className="bg-[#e8f5e9] text-[#2e7d32] border-[#4caf50]"
        >
          <CheckCircle className="w-3 h-3 mr-1 text-[#4caf50]" />
          Aprovado - Completo
        </Badge>
      );
    } else if (atestado.status === "rejeitado") {
      badges.push(
        <Badge
          key="rejeitado"
          variant="outline"
          className="bg-[#ffebee] text-[#c62828] border-[#c56266]"
        >
          <XCircle className="w-3 h-3 mr-1 text-[#c56266]" />
          Rejeitado
        </Badge>
      );
    } else {
      badges.push(
        <Badge
          key="pendente"
          variant="outline"
          className="bg-[#fff3e0] text-[#e65100] border-[#ffb74d]"
        >
          <Clock className="w-3 h-3 mr-1 text-[#f57c00]" />
          Pendente
        </Badge>
      );

      if (atestado.aprovado_pedagogia_por) {
        badges.push(
          <Badge
            key="pedagogia"
            variant="outline"
            className="bg-[#e3f2fd] text-[#1565c0] border-[#005ca4]"
          >
            <CheckCircle className="w-3 h-3 mr-1 text-[#005ca4]" />
            Aprovado - Pedagogia
          </Badge>
        );
      }

      if (atestado.aprovado_secretaria_por) {
        badges.push(
          <Badge
            key="secretaria"
            variant="outline"
            className="bg-[#e0f2f1] text-[#00695c] border-[#4db8ac]"
          >
            <CheckCircle className="w-3 h-3 mr-1 text-[#00897b]" />
            Aprovado - Secretaria
          </Badge>
        );
      }
    }

    return <div className="flex flex-wrap gap-2">{badges}</div>;
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
        `${inicio}_${fim}_${atestado.usuario?.nome || profile?.nome || "atestado"}`
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

  if (!accessChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/atestados")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <main className="container mx-auto p-2 sm:p-4 md:p-8 overflow-x-hidden">
        <div className="mb-6 md:mb-8">
          <div className="flex items-start gap-2 md:gap-4">
            <div style={{ width: '4px', height: '45px', backgroundColor: '#005ca4', borderRadius: '8px' }} />
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 break-words" style={{ color: '#005ca4' }}>
                Revisar Atestados
              </h1>
              <p className="text-xs md:text-base text-muted-foreground">
                Analise e aprove ou rejeite atestados enviados pelos alunos
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-4 md:mb-6">
          <CardContent className="pt-4 md:pt-6">
            <div className="space-y-3 md:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar atestados"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 md:h-11 text-sm"
                />
              </div>

              <div className="flex flex-col gap-2 md:gap-4 md:flex-row">
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor="status-filter"
                    className="text-xs md:text-sm font-medium mb-1 md:mb-2 block"
                  >
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-full h-9 md:h-11 text-xs md:text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-[#005ca4]">
                      <SelectItem value="__all__">Todos os status</SelectItem>
                      <SelectItem value="pendente">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-yellow-600" />
                          Pendente
                        </div>
                      </SelectItem>
                      <SelectItem value="aprovado_pedagogia">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" style={{ color: '#005ca4' }} />
                          Aprovado - Pedagogia
                        </div>
                      </SelectItem>
                      <SelectItem value="aprovado_secretaria">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-teal-600" />
                          Aprovado - Secretaria
                        </div>
                      </SelectItem>
                      <SelectItem value="aprovado">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Aprovado - Completo
                        </div>
                      </SelectItem>
                      <SelectItem value="rejeitado">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Rejeitado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {turmasDisponiveis.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor="turma-filter"
                      className="text-xs md:text-sm font-medium mb-1 md:mb-2 block"
                    >
                      Turma
                    </Label>
                    <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                      <SelectTrigger id="turma-filter" className="w-full h-9 md:h-11 text-xs md:text-sm">
                        <SelectValue placeholder="Todas as turmas" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-[#005ca4]">
                        <SelectItem value="__all__">Todas as turmas</SelectItem>
                        {turmasDisponiveis.map((turma) => (
                          <SelectItem key={turma} value={turma}>
                            {turma}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(searchQuery ||
                  (turmaFilter && turmaFilter !== "__all__") ||
                  (statusFilter && statusFilter !== "__all__")) && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setTurmaFilter("__all__");
                        setStatusFilter("__all__");
                      }}
                      className="text-xs md:text-sm h-9 md:h-11"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : filteredAtestados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery ||
                turmaFilter !== "__all__" ||
                statusFilter !== "__all__"
                  ? "Nenhum atestado encontrado com os filtros aplicados"
                  : "Nenhum atestado encontrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:gap-6">
            {filteredAtestados.map((atestado) => (
              <Card
                key={atestado.id}
                className="hover:shadow-lg transition-shadow overflow-hidden"
              >
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-2 md:gap-4">
                    <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2 break-words">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-[#005ca4] flex-shrink-0" />
                        <span style={{ color: '#005ca4' }} className="truncate md:truncate-none">{atestado.usuario?.nome}</span>
                      </CardTitle>
                      <CardDescription className="space-y-0.5 md:space-y-1 text-xs md:text-sm">
                        <span className="block break-words">
                          RA: {atestado.usuario?.ra} • <span className="break-all">{atestado.usuario?.email}</span>
                        </span>
                        {atestado.usuario?.turma && (
                          <span className="inline-flex items-center gap-1 md:gap-2">
                            <span className="text-xs md:text-sm">Turma:</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {atestado.usuario.turma}
                            </Badge>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadges(atestado)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Data de Início
                      </p>
                      <p className="text-xs md:text-base">{formatDate(atestado.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Data de Fim
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-0.5">
                        <p className="text-xs md:text-base">{formatDate(atestado.data_fim)}</p>
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
                              <p className="text-xs md:text-sm text-muted-foreground">
                                • Período: {period} dia{period > 1 ? "s" : ""}
                              </p>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Enviado em
                      </p>
                      <p className="text-xs md:text-base">{formatDate(atestado.createdAt)}</p>
                    </div>
                  </div>

                  {atestado.motivo && (
                    <div className="min-w-0">
                      <p className="font-medium text-muted-foreground mb-1 text-xs md:text-sm">
                        Motivo
                      </p>
                      <p className="text-xs md:text-sm bg-muted p-2 rounded break-words">
                        {atestado.motivo}
                      </p>
                    </div>
                  )}

                  {atestado.observacoes_admin && (
                    <div className="min-w-0">
                      <p className="font-medium text-muted-foreground mb-1 text-xs md:text-sm">
                        Observações Administrativas
                      </p>
                      <p className="text-xs md:text-sm p-2 rounded break-words" style={{ backgroundColor: '#f7f8fa', borderColor: '#d8d9dd', borderWidth: '1px', color: '#5b5b5f' }}>
                        {atestado.observacoes_admin}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 md:gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" style={{ backgroundColor: "white !important", borderColor: "#005ca4 !important", borderWidth: "2px !important", color: "#005ca4 !important" }} className="text-xs md:text-sm h-8 md:h-10 w-full sm:w-auto">
                          <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Ver Imagem
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl bg-white border-2 border-[#005ca4] max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle className="text-base md:text-lg">Atestado Médico</DialogTitle>
                          <DialogDescription className="text-xs md:text-sm">
                            Atestado de {atestado.usuario?.nome}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="relative w-full h-64 md:h-96">
                          {atestado.imagem ? (
                            <Image
                              src={atestado.imagem}
                              alt="Atestado médico"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <p className="text-sm text-gray-500 text-center mt-4">
                              Nenhuma imagem disponível
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {atestado.imagem && (
                      <Button
                        size="sm"
                        onClick={() => downloadAtestado(atestado)}
                        style={{ backgroundColor: "white !important", borderColor: "#005ca4 !important", borderWidth: "2px !important", color: "#005ca4 !important" }}
                        className="text-xs md:text-sm h-8 md:h-10 w-full sm:w-auto"
                      >
                        <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Baixar
                      </Button>
                    )}

                    {atestado.status !== "rejeitado" &&
                      atestado.status !== "aprovado" && (
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-2 w-full">
                          {!atestado.aprovado_pedagogia_por && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-[#4caf50] hover:bg-[#45a049] text-white text-xs md:text-sm h-8 md:h-10 w-full sm:flex-1"
                                >
                                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                  Aprovar (Pedagogia)
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white border-2 border-[#005ca4]">
                                <DialogHeader>
                                  <DialogTitle className="text-[#005ca4]">
                                    Aprovar Atestado - Pedagogia
                                  </DialogTitle>
                                  <DialogDescription className="text-[#5b5b5f]">
                                    Você está aprovando o atestado de{" "}
                                    {atestado.usuario?.nome} pela pedagogia
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-3">
                                    <Label htmlFor="observacoes-pedagogia" className="text-[#12385f] font-semibold block">
                                      Observações (opcional)
                                    </Label>
                                    <Textarea
                                      id="observacoes-pedagogia"
                                      placeholder="Adicione observações sobre a aprovação pela pedagogia..."
                                      value={observacoes}
                                      onChange={(e) =>
                                        setObservacoes(e.target.value)
                                      }
                                      className="border-2 border-[#005ca4] focus:border-[#005ca4] focus:ring-[#005ca4]"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                      <Button
                                        variant="outline"
                                        className="border-[#d8d9dd] text-[#005ca4] hover:bg-[#f4f7fb]"
                                        onClick={() => {
                                          setObservacoes("");
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      className="bg-[#005ca4] hover:bg-[#004b90] text-white"
                                      onClick={() =>
                                        handleReviewAtestado(
                                          atestado.id,
                                          "aprovado_pedagogia"
                                        )
                                      }
                                    >
                                      Confirmar Aprovação
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {!atestado.aprovado_secretaria_por && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-[#4caf50] hover:bg-[#45a049] text-white text-xs md:text-sm h-8 md:h-10 w-full sm:flex-1"
                                >
                                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                  Aprovar (Secretaria)
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white border-2 border-[#005ca4]">
                                <DialogHeader>
                                  <DialogTitle className="text-[#005ca4]">
                                    Aprovar Atestado - Secretaria
                                  </DialogTitle>
                                  <DialogDescription className="text-[#5b5b5f]">
                                    Você está dando aprovação final pela
                                    secretaria ao atestado de{" "}
                                    {atestado.usuario?.nome}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-3">
                                    <Label htmlFor="observacoes-secretaria" className="text-[#12385f] font-semibold block">
                                      Observações (opcional)
                                    </Label>
                                    <Textarea
                                      id="observacoes-secretaria"
                                      placeholder="Adicione observações sobre a aprovação pela secretaria..."
                                      value={observacoes}
                                      onChange={(e) =>
                                        setObservacoes(e.target.value)
                                      }
                                      className="border-2 border-[#005ca4] focus:border-[#005ca4] focus:ring-[#005ca4]"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                      <Button
                                        variant="outline"
                                        className="border-[#d8d9dd] text-[#005ca4] hover:bg-[#f4f7fb]"
                                        onClick={() => {
                                          setObservacoes("");
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      className="bg-[#005ca4] hover:bg-[#004b90] text-white"
                                      onClick={() =>
                                        handleReviewAtestado(
                                          atestado.id,
                                          "aprovado_secretaria"
                                        )
                                      }
                                    >
                                      Confirmar Aprovação
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Rejeitar */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-[#c56266] hover:bg-[#b54f54] text-white text-xs md:text-sm h-8 md:h-10 w-full sm:flex-1">
                                <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                Rejeitar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white border-2 border-[#005ca4]">
                              <DialogHeader>
                                <DialogTitle className="text-[#005ca4]">Rejeitar Atestado</DialogTitle>
                                <DialogDescription className="text-[#5b5b5f]">
                                  Você está rejeitando o atestado de{" "}
                                  {atestado.usuario?.nome}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  <Label htmlFor="observacoes-rejeicao" className="text-[#12385f] font-semibold block">
                                    Motivo da Rejeição *
                                  </Label>
                                  <Textarea
                                    id="observacoes-rejeicao"
                                    placeholder="Explique o motivo da rejeição..."
                                    value={observacoes}
                                    onChange={(e) =>
                                      setObservacoes(e.target.value)
                                    }
                                    className="border-2 border-[#005ca4] focus:border-[#005ca4] focus:ring-[#005ca4]"
                                    required
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <DialogClose asChild>
                                    <Button
                                      variant="outline"
                                      className="border-[#d8d9dd] text-[#005ca4] hover:bg-[#f4f7fb]"
                                      onClick={() => {
                                        setObservacoes("");
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </DialogClose>
                                  <Button
                                    className="bg-[#c56266] hover:bg-[#b54f54] text-white"
                                    disabled={!observacoes.trim()}
                                    onClick={() =>
                                      handleReviewAtestado(
                                        atestado.id,
                                        "rejeitado"
                                      )
                                    }
                                  >
                                    Confirmar Rejeição
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
