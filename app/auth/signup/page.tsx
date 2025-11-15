"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const studentSignupSchema = z
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
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "Senhas não coincidem",
    path: ["confirmarSenha"],
  });

const StudentSignup = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [curso, setCurso] = useState("");
  const [periodo, setPeriodo] = useState("");

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

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
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
    };

    try {
      const validationResult = studentSignupSchema.safeParse(data);

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      const createUserData = {
        ...validationResult.data,
        cargo: "USUARIO" as const,
      };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createUserData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar conta");
      }

      toast.success("Conta criada com sucesso! Faça login para continuar.");
      router.push("/auth/login");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("já existe")) {
          toast.error("Email já está sendo usado por outro usuário");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-y-auto">
        <div className="w-full max-w-md">
          <button
            onClick={() => router.back()}
            className="absolute top-8 left-8 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="absolute top-8 right-8">
            <Logo />
          </div>

          <div className="mb-8 mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Pronto para <span className="text-gray-700">começar?</span>
            </h2>
            <p className="text-gray-600">
              Cadastre-se agora para explorar, aprender e crescer com a gente.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-nome" className="text-gray-700">
                  Nome completo *
                </Label>
                <Input
                  id="signup-nome"
                  name="nome"
                  type="text"
                  placeholder="Digite seu nome"
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-ra" className="text-gray-700">
                  RA *
                </Label>
                <Input
                  id="signup-ra"
                  name="ra"
                  type="text"
                  placeholder="Digite seu RA"
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-gray-700">
                E-mail *
              </Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                placeholder="Digite seu e-mail"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-telefone" className="text-gray-700">
                Telefone *
              </Label>
              <Input
                id="signup-telefone"
                name="telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-curso" className="text-gray-700">
                  Curso *
                </Label>
                <Select
                  value={curso}
                  onValueChange={setCurso}
                  required
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o curso" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-periodo" className="text-gray-700">
                  Período *
                </Label>
                <Select
                  value={periodo}
                  onValueChange={setPeriodo}
                  required
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matutino">Matutino</SelectItem>
                    <SelectItem value="vespertino">Vespertino</SelectItem>
                    <SelectItem value="noturno">Noturno</SelectItem>
                    <SelectItem value="integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-senha" className="text-gray-700">
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="signup-senha"
                    name="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    required
                    disabled={loading}
                    className="h-11 pr-10"
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
                <Label
                  htmlFor="signup-confirmar-senha"
                  className="text-gray-700"
                >
                  Confirmar senha *
                </Label>
                <div className="relative">
                  <Input
                    id="signup-confirmar-senha"
                    name="confirmarSenha"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    required
                    disabled={loading}
                    className="h-11 pr-10"
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

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-gray-700">
                A <span className="font-bold">senha</span> deve conter
              </p>
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      checked={req.met}
                      disabled
                      className="pointer-events-none"
                    />
                    <span
                      className={`text-sm ${
                        req.met ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#E63946] hover:bg-[#d32f2f] text-white text-base font-medium"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-[#E63946] hover:underline font-medium"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 p-12 flex-col justify-center relative overflow-hidden">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Já tem conta?
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            Descubra no seu tempo, construa seu aprendizado e explore novas
            oportunidades de conhecimento.
          </p>
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-[#E63946] border-2 border-[#E63946] px-8 h-12 text-base font-medium"
            >
              Acessar conta
            </Button>
          </Link>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-br from-blue-200/40 to-purple-200/40 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>
      </div>
    </div>
  );
};

export default StudentSignup;
