"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatDate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Search,
  User,
  CheckCircle,
  XCircle,
  Trash,
  UserPlus,
  Clock,
  Eye,
  Download,
} from "lucide-react";

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
  created_at: string;
  status?: string;
  curso?: string | null;
}

interface Atestado {
  id: string;
  data_inicio: string;
  data_fim: string;
  data_falta: string;
  motivo: string | null;
  status: string;
  arquivo_url: string | null;
  created_at: string;
}

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

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [, setUserAtestados] = useState<Atestado[]>([]);

  const [atestados, setAtestados] = useState<AtestadoData[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const fetchAtestados = useCallback(async () => {
    try {
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
    }
  }, []);

  const checkAdminAccess = useCallback(async () => {
    const token = localStorage.getItem("token");
    console.log("Token:", token);
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
        router.push("/dashboard");
        return;
      }

      setProfile(data.user);
      fetchUsuarios();
      fetchAtestados();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [router, fetchAtestados]);

  const fetchUsuarios = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("/api/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.usuarios || []);
        setFilteredUsuarios(data.usuarios || []);
      } else {
        toast.error("Erro ao carregar usuários");
      }
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast.error("Erro ao carregar usuários");
    }
  };

  const performToggleUserStatus = async (
    usuarioId: string,
    currentStatus?: string
  ) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Não autorizado");
      return;
    }

    const newStatus = currentStatus === "inativo" ? "ativo" : "inativo";

    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar status");
      toast.success(body.message || "Status atualizado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error toggling user status:", err);
      toast.error("Erro ao atualizar status do usuário");
    }
  };

  const fetchAtestadosUsuario = async (usuarioId: string) => {
    setSelectedUserId(usuarioId);
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/atestados?userId=${usuarioId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserAtestados(data.atestados || []);
      } else {
        toast.error("Erro ao carregar atestados");
      }
    } catch (error) {
      console.error("Error fetching user atestados:", error);
      toast.error("Erro ao carregar atestados");
    }
  };

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

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsuarios(usuarios);
    } else {
      const filtered = usuarios.filter(
        (usuario) =>
          usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (usuario.ra_aluno &&
            usuario.ra_aluno.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsuarios(filtered);
    }
  }, [searchTerm, usuarios]);

  const getTipoBadge = (tipo: string) => {
    const t = (tipo || "").toString().toLowerCase();

    let key = "aluno";
    if (t.includes("admin") || t === "administrador" || t === "administrator") {
      key = "administrador";
    } else if (
      t.includes("func") ||
      t === "funcionario" ||
      t === "funcionário" ||
      t.includes("staff")
    ) {
      key = "funcionario";
    } else if (t.includes("prof") || t === "professor") {
      key = "professor";
    } else if (t === "usuario" || t === "aluno") {
      key = "aluno";
    }

    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; label: string }
    > = {
      aluno: { variant: "default", label: "Aluno" },
      funcionario: { variant: "secondary", label: "Funcionário" },
      professor: { variant: "secondary", label: "Professor" },
      administrador: { variant: "destructive", label: "Administrador" },
    };

    const { variant, label } = variants[key] || variants.aluno;
    return <Badge variant={variant}>{label}</Badge>;
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

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
            <Button onClick={() => router.push("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários e aprove atestados
          </p>
        </div>

        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="atestados" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Atestados
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
          </TabsList>

          {/* Users Management Tab */}
          <TabsContent value="usuarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Lista de Usuários
                </CardTitle>
                <CardDescription>
                  Busque e selecione usuários para ver detalhes
                </CardDescription>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou RA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUsuarios.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm
                        ? "Nenhum usuário encontrado"
                        : "Nenhum usuário cadastrado"}
                    </p>
                  ) : (
                    filteredUsuarios.map((usuario) => (
                      <div
                        key={usuario.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedUserId === usuario.id
                            ? "bg-muted border-primary"
                            : ""
                        }`}
                        onClick={() => fetchAtestadosUsuario(usuario.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{usuario.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {usuario.email}
                            </p>
                            {usuario.ra_aluno && (
                              <p className="text-xs text-muted-foreground">
                                RA: {usuario.ra_aluno}
                              </p>
                            )}
                            {usuario.curso && (
                              <p className="text-xs text-muted-foreground">
                                Curso:{" "}
                                <span className="font-medium">
                                  {usuario.curso}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getTipoBadge(usuario.tipo_usuario)}
                            <div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  {usuario.status === "inativo" ? (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="text-green-600 hover:cursor-pointer"
                                    >
                                      <UserPlus className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="text-red-600 hover:cursor-pointer"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  )}
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      {usuario.status === "inativo"
                                        ? "Ativar usuário"
                                        : "Inativar usuário"}
                                    </DialogTitle>
                                    <DialogDescription>{`Confirma ${
                                      usuario.status === "inativo"
                                        ? "ativar"
                                        : "inativar"
                                    } o usuário ${
                                      usuario.nome
                                    }?`}</DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose asChild>
                                      <Button variant="outline">
                                        Cancelar
                                      </Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                      <Button
                                        onClick={() =>
                                          performToggleUserStatus(
                                            usuario.id,
                                            usuario.status
                                          )
                                        }
                                      >
                                        {usuario.status === "inativo"
                                          ? "Confirmar Ativação"
                                          : "Confirmar Inativação"}
                                      </Button>
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atestados" className="space-y-6">
            {atestados.length === 0 ? (
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
                            RA: {atestado.usuario?.ra} •{" "}
                            {atestado.usuario?.email}
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
                              <Image
                                src={atestado.imagem}
                                alt="Atestado médico"
                                fill
                                className="object-contain"
                              />
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
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-50">
                <CardHeader>
                  <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
                  <CardTitle>Relatórios</CardTitle>
                  <CardDescription>
                    Visualize estatísticas e relatórios do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" disabled>
                    Em Breve
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-50">
                <CardHeader>
                  <Settings className="h-10 w-10 text-gray-600 mb-2" />
                  <CardTitle>Configurações</CardTitle>
                  <CardDescription>
                    Configure parâmetros do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" disabled>
                    Em Breve
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acesso Rápido</CardTitle>
                  <CardDescription>
                    Ações administrativas frequentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Dashboard Principal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Atualizar Dados
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
