"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User,
  FileText,
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
import { formatDate } from "@/utils/formatDate";
import { Logo } from "@/components/Logo";
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

interface AtestadoData {
  id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  status: "pendente" | "aprovado" | "rejeitado";
  imagem: string;
  createdAt: string;
  observacoes_admin?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    ra: string;
  };
}

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
}

export default function AdminAtestadosPage() {
  const router = useRouter();
  const [atestados, setAtestados] = useState<AtestadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [observacoes, setObservacoes] = useState("");

  const checkAdminAccess = useCallback(async () => {
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
        throw new Error("Failed to check user type");
      }

      const data = await response.json();

      if (data.user?.tipo_usuario !== "administrador") {
        toast.error("Acesso negado");
        router.push("/atestados");
        return;
      }

      setProfile(data.user);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/auth/login");
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
    checkAdminAccess();
    fetchAtestados();
  }, [checkAdminAccess, fetchAtestados]);

  const handleReviewAtestado = async (
    atestadoId: string,
    novoStatus: "aprovado" | "rejeitado"
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
        toast.success(`Atestado ${novoStatus} com sucesso!`);
        setObservacoes("");
        fetchAtestados();
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao atualizar atestado");
      }
    } catch (error) {
      console.error("Error reviewing atestado:", error);
      toast.error("Erro ao atualizar atestado");
    }
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
      const nomeOrig = (atestado.usuario?.nome || profile?.nome || "atestado")
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

  // using shared formatDate util to ensure consistent local-date parsing

  if (!profile || profile.tipo_usuario !== "administrador") {
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
          <div className="ml-auto">
            <p className="text-sm font-medium">Admin: {profile.nome}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Revisar Atestados
          </h1>
          <p className="text-muted-foreground">
            Analise e aprove ou rejeite atestados enviados pelos alunos
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : atestados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum atestado encontrado
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {atestados.map((atestado) => (
              <Card
                key={atestado.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {atestado.usuario?.nome}
                      </CardTitle>
                      <CardDescription>
                        RA: {atestado.usuario?.ra} • {atestado.usuario?.email}
                      </CardDescription>
                    </div>
                    {getStatusBadge(atestado.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                      <p>{formatDate(atestado.data_fim)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Enviado em
                      </p>
                      <p>{formatDate(atestado.createdAt)}</p>
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
                        Observações Administrativas
                      </p>
                      <p className="text-sm bg-blue-50 border border-blue-200 p-2 rounded">
                        {atestado.observacoes_admin}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Imagem
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Atestado Médico</DialogTitle>
                          <DialogDescription>
                            Atestado de {atestado.usuario?.nome}
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
                            <p className="text-sm text-gray-500 text-center mt-4">
                              Nenhuma imagem disponível
                            </p>
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

                    {atestado.status === "pendente" && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Aprovar Atestado</DialogTitle>
                              <DialogDescription>
                                Você está aprovando o atestado de{" "}
                                {atestado.usuario?.nome}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="observacoes">
                                  Observações (opcional)
                                </Label>
                                <Textarea
                                  id="observacoes"
                                  placeholder="Adicione observações sobre a aprovação..."
                                  value={observacoes}
                                  onChange={(e) =>
                                    setObservacoes(e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setObservacoes("");
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </DialogClose>
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() =>
                                    handleReviewAtestado(
                                      atestado.id,
                                      "aprovado"
                                    )
                                  }
                                >
                                  Confirmar Aprovação
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rejeitar Atestado</DialogTitle>
                              <DialogDescription>
                                Você está rejeitando o atestado de{" "}
                                {atestado.usuario?.nome}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="observacoes-rejeicao">
                                  Motivo da Rejeição *
                                </Label>
                                <Textarea
                                  id="observacoes-rejeicao"
                                  placeholder="Explique o motivo da rejeição..."
                                  value={observacoes}
                                  onChange={(e) =>
                                    setObservacoes(e.target.value)
                                  }
                                  required
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setObservacoes("");
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
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
                      </>
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
