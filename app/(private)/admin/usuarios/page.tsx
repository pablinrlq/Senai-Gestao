"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
interface SimpleProfile {
  nome: string;
  tipo_usuario?: string;
}
import { Search, User, FileText, Trash, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/utils/formatDate";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
  created_at: string;
  status?: string;
  curso?: string | null;
  turma?: string | null;
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

export default function Usuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<SimpleProfile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [atestados, setAtestados] = useState<Atestado[]>([]);

  const checkUserType = useCallback(async () => {
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

      if (
        !(
          data.user?.tipo_usuario === "administrador" ||
          data.user?.tipo_usuario === "funcionario"
        )
      ) {
        toast.error("Acesso negado");
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      setProfile(data.user);
      fetchUsuarios();
    } catch (error) {
      console.error("Error checking user type:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/dashboard");
    }
  }, [router]);

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
    } finally {
      setLoading(false);
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
        // API may return atestados under `data` (server uses { success: true, data: [...] })
        // or under `atestados` in some older responses. Support both.
        const atestadosArray = data.data || data.atestados || [];
        setAtestados(atestadosArray);
      } else {
        toast.error("Erro ao carregar atestados");
      }
    } catch (error) {
      console.error("Error fetching user atestados:", error);
      toast.error("Erro ao carregar atestados");
    }
  };

  useEffect(() => {
    checkUserType();
  }, [checkUserType]);

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

    if (t === "administrador" || t === "admin") {
      return <Badge variant="destructive">Administrador</Badge>;
    }

    if (t === "funcionario" || t === "funcionário" || t === "func") {
      return <Badge variant="secondary">Funcionário</Badge>;
    }

    // default mapping: 'usuario' or missing -> Aluno
    return <Badge variant="default">Aluno</Badge>;
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
      // refresh list
      fetchUsuarios();
    } catch (err) {
      console.error("Error toggling user status:", err);
      toast.error("Erro ao atualizar status do usuário");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return (
          <Badge variant="default" className="bg-green-500">
            Aprovado
          </Badge>
        );
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  // use shared date formatter from utils to ensure consistent local-date handling

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
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
            Gerenciar Usuários
          </h1>
          <p className="text-muted-foreground">
            Busque usuários e visualize seus atestados
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Users list */}
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
                  filteredUsuarios.map((usuario) => {
                    return (
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
                            {usuario.turma && (
                              <p className="text-xs text-muted-foreground">
                                Turma:{" "}
                                <span className="font-medium">
                                  {usuario.turma}
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
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* User atestados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Atestados do Usuário
              </CardTitle>
              <CardDescription>
                {selectedUserId
                  ? `Atestados do usuário selecionado`
                  : "Selecione um usuário para ver seus atestados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {!selectedUserId ? (
                  <p className="text-center text-muted-foreground py-8">
                    Selecione um usuário na lista ao lado
                  </p>
                ) : atestados.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Este usuário não possui atestados
                  </p>
                ) : (
                  atestados.map((atestado) => (
                    <div
                      key={atestado.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        {getStatusBadge(atestado.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Período: {formatDateForDisplay(atestado.data_inicio)}{" "}
                        até {formatDateForDisplay(atestado.data_fim)}
                      </p>
                      {atestado.motivo && (
                        <p className="text-sm">{atestado.motivo}</p>
                      )}
                      {atestado.arquivo_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={atestado.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver Anexo
                          </a>
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
