"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useCreateAtestado } from "@/hooks/use-create-atestado";

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
}

const atestadoSchema = z
  .object({
    dataInicio: z.string().min(1, "Data de início é obrigatória"),
    periodoAfastamento: z
      .number()
      .min(1, "Período de afastamento deve ser de pelo menos 1 dia")
      .max(365, "Período de afastamento não pode exceder 365 dias"),
    motivo: z
      .string()
      .max(500, "Motivo deve ter no máximo 500 caracteres")
      .optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.dataInicio);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 5;
    },
    {
      message:
        "O atestado deve ser enviado no máximo 5 dias após a data de início",
      path: ["dataInicio"],
    }
  );

export default function CriarAtestadoPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { createAtestado, loading: createLoading } = useCreateAtestado();

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

      // Redirect admins to dashboard
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
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error("Arquivo muito grande. Máximo 10MB permitido.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens são permitidas.");
        return;
      }

      setUploadedFile(file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!profile) return;

    if (!uploadedFile) {
      toast.error("Por favor, adicione uma imagem do atestado");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const periodoAfastamentoStr = formData.get("periodoAfastamento") as string;
    const data = {
      dataInicio: formData.get("dataInicio") as string,
      periodoAfastamento: parseInt(periodoAfastamentoStr, 10),
      motivo: (formData.get("motivo") as string) || "",
    };

    try {
      const validated = atestadoSchema.parse(data);

      const startDate = new Date(validated.dataInicio);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + validated.periodoAfastamento - 1);

      const createData = {
        data_inicio: validated.dataInicio,
        periodo_afastamento: validated.periodoAfastamento,
        motivo: validated.motivo || "",
        status: "pendente" as const,
        imagem_atestado: uploadedFile,
      };

      await createAtestado(createData);

      toast.success("Atestado enviado com sucesso!");
      router.push("/atestados");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao enviar atestado");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!profile || profile.tipo_usuario === "administrador") {
    return null; // The redirect happens in fetchProfile
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/atestados")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
          <div className="ml-auto">
            <p className="text-sm font-medium">{profile.nome}</p>
            <p className="text-xs text-muted-foreground">
              RA: {profile.ra_aluno}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Novo Atestado
            </h1>
            <p className="text-muted-foreground">
              Envie um novo atestado médico para análise
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Atestado</CardTitle>
              <CardDescription>
                Preencha as informações do seu atestado médico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio">Data de Início *</Label>
                    <Input
                      id="dataInicio"
                      name="dataInicio"
                      type="date"
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo 5 dias de tolerância para envio
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodoAfastamento">
                      Período de Afastamento (dias) *
                    </Label>
                    <Input
                      id="periodoAfastamento"
                      name="periodoAfastamento"
                      type="number"
                      min="1"
                      max="365"
                      required
                      placeholder="Ex: 3"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo (opcional)</Label>
                  <Textarea
                    id="motivo"
                    name="motivo"
                    placeholder="Descreva brevemente o motivo do atestado..."
                    maxLength={500}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 500 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imagem">Imagem do Atestado *</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    {!uploadedFile ? (
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Clique para fazer upload ou arraste uma imagem
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG até 10MB
                          </p>
                        </div>
                        <Input
                          id="imagem"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="mt-4"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(uploadedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {previewUrl && (
                          <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={previewUrl}
                              alt="Preview do atestado"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/atestados")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoading || !uploadedFile}
                    className="flex-1"
                  >
                    {createLoading ? "Enviando..." : "Enviar Atestado"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
