"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { z } from "zod";
import { UserCog, ArrowLeft, Shield, User } from "lucide-react";
import Link from "next/link";
import { checkAuthStatus } from "@/lib/utils/auth";

const adminCreationSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email deve ter um formato válido"),
    ra: z.string().min(5, "RA deve ter pelo menos 5 caracteres"),
    telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
    senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmarSenha: z.string(),
    cargo: z.enum(["ADMINISTRADOR", "FUNCIONARIO", "USUARIO"], {
      errorMap: () => ({
        message: "Cargo inválido (ADMINISTRADOR, FUNCIONARIO ou USUARIO)",
      }),
    }),
    curso: z.string().optional(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "Senhas não coincidem",
    path: ["confirmarSenha"],
  })
  .refine(
    (data) =>
      !(data.cargo === "USUARIO") || (data.curso && data.curso.length > 0),
    {
      message: "Curso é obrigatório para alunos",
      path: ["curso"],
    }
  );

const CreateAdmin = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [cargo, setCargo] = useState("");
  const [curso, setCurso] = useState("");

  useEffect(() => {
    // Clear curso when role is not aluno
    if (cargo !== "USUARIO") setCurso("");
  }, [cargo]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await checkAuthStatus();
        if (
          !authStatus.isAuthenticated ||
          authStatus.user?.cargo !== "ADMINISTRADOR"
        ) {
          toast.error(
            "Acesso negado. Apenas administradores podem criar novos usuários."
          );
          router.push("/auth/login");
          return;
        }
        setIsAuthenticated(true);
      } catch {
        toast.error("Erro ao verificar autenticação");
        router.push("/auth/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome") as string,
      email: formData.get("email") as string,
      ra: formData.get("ra") as string,
      telefone: formData.get("telefone") as string,
      senha: formData.get("senha") as string,
      confirmarSenha: formData.get("confirmarSenha") as string,
      cargo: cargo,
      curso: curso,
    };

    try {
      const validationResult = adminCreationSchema.safeParse(data);

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      // Create user data for API
      const createUserData: any = { ...validationResult.data };
      // If curso is empty string or null, omit it so DB will keep NULL
      if (!createUserData.curso) delete createUserData.curso;
      // Ensure status is explicit
      createUserData.status = createUserData.status || "ativo";

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createUserData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuário");
      }

      toast.success("Usuário criado com sucesso!");

      // Reset form
      (e.target as HTMLFormElement).reset();
      // Redirect back to admin panel after a short delay so toast is visible
      setTimeout(() => {
        router.push("/admin");
      }, 600);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("já existe")) {
          toast.error("Email já está sendo usado por outro usuário");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Erro ao criar usuário. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-linear-to-br from-primary via-primary/90 to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Verificando permissões...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary via-primary/90 to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <UserCog className="h-10 w-10 text-primary" />
          </div>
          <Logo className="justify-center" />
          <div>
            <CardTitle className="text-2xl">Criar Novo Usuário</CardTitle>
            <CardDescription>Painel Administrativo - SENAI</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-nome">Nome Completo *</Label>
                <Input
                  id="admin-nome"
                  name="nome"
                  type="text"
                  placeholder="Maria Silva"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ra">RA/Matrícula *</Label>
                <Input
                  id="admin-ra"
                  name="ra"
                  type="text"
                  placeholder="ADM12345"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email *</Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="maria.silva@senai.br"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-telefone">Telefone *</Label>
                <Input
                  id="admin-telefone"
                  name="telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-cargo">Cargo *</Label>
                <Select
                  value={cargo}
                  onValueChange={setCargo}
                  name="cargo"
                  required
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRADOR">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value="FUNCIONARIO">
                      <div className="flex items-center">
                        <UserCog className="h-4 w-4 mr-2" />
                        Funcionário
                      </div>
                    </SelectItem>
                    <SelectItem value="USUARIO">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Aluno
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-curso">
                  Curso {cargo === "USUARIO" ? "*" : ""}
                </Label>
                <Select
                  value={curso}
                  onValueChange={setCurso}
                  name="curso"
                  required={cargo === "USUARIO"}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEC_INFORMATICA">
                      Técnico em Informática
                    </SelectItem>
                    <SelectItem value="TEC_MECATRONICA">
                      Técnico em Mecatrônica
                    </SelectItem>
                    <SelectItem value="TEC_LOGISTICA">
                      Técnico em Logística
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-senha">Senha *</Label>
                <Input
                  id="admin-senha"
                  name="senha"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-confirmar-senha">Confirmar Senha *</Label>
                <Input
                  id="admin-confirmar-senha"
                  name="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Criando usuário..." : "Criar Usuário"}
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAdmin;
