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
import { z } from "zod";
import { UserCog, ArrowLeft, Shield, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { checkAuthStatus } from "@/lib/utils/auth";

const adminCreationSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email deve ter um formato válido"),
    ra: z.string().min(5, "RA deve ter pelo menos 5 caracteres"),
    telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
    senha: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/\d/, "Senha deve conter pelo menos um número")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Senha deve conter pelo menos um caractere especial"
      ),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const passwordRequirements = [
    { text: "No mínimo 8 caracteres", met: passwordValue.length >= 8 },
    {
      text: "Pelo menos uma letra maiúscula e minúscula",
      met: /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue),
    },
    { text: "Pelo menos um número", met: /\d/.test(passwordValue) },
    {
      text: "Pelo menos um caractere especial",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
    },
  ];

  useEffect(() => {
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

      const createUserData: Record<string, unknown> = {
        ...validationResult.data,
      };
      if (!createUserData.curso) delete createUserData.curso;
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

      (e.target as HTMLFormElement).reset();
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-linear-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-linear-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/95 border-0 relative z-10">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">
                  Verificando permissões
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aguarde um momento...
                </p>
              </div>
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-linear-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-linear-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-linear-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>

      <Card className="w-full max-w-3xl shadow-2xl backdrop-blur-sm bg-white/95 border-0 relative z-10">
        <CardHeader className="space-y-6 text-center pb-8 pt-8">
          <div className="flex justify-between items-start">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="-ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <Image
              src="/logo-senai.png"
              alt="SENAI Gestão"
              width={140}
              height={36}
              className="object-contain"
            />
          </div>

          <div className="mx-auto w-20 h-20 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform">
            <UserCog className="h-11 w-11 text-white" />
          </div>

          <div>
            <CardTitle className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Criar Novo Usuário
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Preencha os dados abaixo para adicionar um novo membro
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="admin-nome"
                  className="text-sm font-semibold text-gray-700"
                >
                  Nome Completo *
                </Label>
                <Input
                  id="admin-nome"
                  name="nome"
                  type="text"
                  placeholder="Maria Silva"
                  required
                  disabled={loading}
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="admin-ra"
                  className="text-sm font-semibold text-gray-700"
                >
                  RA/Matrícula *
                </Label>
                <Input
                  id="admin-ra"
                  name="ra"
                  type="text"
                  placeholder="ADM12345"
                  required
                  disabled={loading}
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="admin-email"
                  className="text-sm font-semibold text-gray-700"
                >
                  Email *
                </Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="maria.silva@senai.br"
                  required
                  disabled={loading}
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="admin-telefone"
                  className="text-sm font-semibold text-gray-700"
                >
                  Telefone *
                </Label>
                <Input
                  id="admin-telefone"
                  name="telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  required
                  disabled={loading}
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="admin-cargo"
                  className="text-sm font-semibold text-gray-700"
                >
                  Cargo *
                </Label>
                <Select
                  value={cargo}
                  onValueChange={setCargo}
                  name="cargo"
                  required
                  disabled={loading}
                >
                  <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRADOR">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <Shield className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Administrador</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="FUNCIONARIO">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <UserCog className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Funcionário</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="USUARIO">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Aluno</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="admin-curso"
                  className="text-sm font-semibold text-gray-700"
                >
                  Curso{" "}
                  {cargo === "USUARIO" ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-gray-400 text-xs">(opcional)</span>
                  )}
                </Label>
                <Select
                  value={curso}
                  onValueChange={setCurso}
                  name="curso"
                  required={cargo === "USUARIO"}
                  disabled={loading || cargo !== "USUARIO"}
                >
                  <SelectTrigger
                    className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                      cargo !== "USUARIO" ? "opacity-50 bg-gray-50" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        cargo === "USUARIO"
                          ? "Selecione o curso"
                          : "Apenas para alunos"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnico-automacao">
                      Técnico em Automação
                    </SelectItem>
                    <SelectItem value="tecnico-mecatronica">
                      Técnico em Mecatrônica
                    </SelectItem>
                    <SelectItem value="tecnico-eletromecanica">
                      Técnico em Eletromecânica
                    </SelectItem>
                    <SelectItem value="tecnico-mecanica">
                      Técnico em Mecânica
                    </SelectItem>
                    <SelectItem value="tecnico-manutencao-maquinas">
                      Técnico em Manutenção de Máquinas Industriais
                    </SelectItem>
                    <SelectItem value="tecnico-administracao">
                      Técnico em Administração
                    </SelectItem>
                    <SelectItem value="tecnico-controle-qualidade">
                      Técnico em Controle de Qualidade
                    </SelectItem>
                    <SelectItem value="tecnico-seguranca-trabalho">
                      Técnico em Segurança do Trabalho
                    </SelectItem>
                    <SelectItem value="tecnico-cibersistemas-automacao">
                      Técnico em Cibersistemas para Automação
                    </SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {cargo === "USUARIO" && (
                  <p className="text-xs text-muted-foreground">
                    Campo obrigatório para alunos
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-senha">Senha *</Label>
                <div className="relative">
                  <Input
                    id="admin-senha"
                    name="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-confirmar-senha">Confirmar Senha *</Label>
                <div className="relative">
                  <Input
                    id="admin-confirmar-senha"
                    name="confirmarSenha"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-blue-50 to-indigo-50 p-5 rounded-xl space-y-3 border-2 border-blue-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-linear-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                <p className="text-sm font-bold text-gray-800">
                  Requisitos da senha
                </p>
              </div>
              <div className="space-y-2 pl-3">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 transition-all"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        req.met
                          ? "bg-green-500 shadow-sm shadow-green-200"
                          : "bg-gray-200"
                      }`}
                    >
                      {req.met && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        req.met
                          ? "text-green-700 font-semibold"
                          : "text-gray-600"
                      }`}
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 h-12 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                    Criando usuário...
                  </>
                ) : (
                  <>
                    <UserCog className="h-5 w-5 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAdmin;
