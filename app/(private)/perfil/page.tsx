"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate } from "@/utils/formatDate";
import { Badge } from "@/components/ui/badge";
import { IdCard, Mail, Shield, UserCircle } from "lucide-react";

interface Profile {
  nome: string;
  email: string;
  tipo_usuario: string;
  ra_aluno: string | null;
  created_at?: string;
}

export default function Perfil() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const getTipoBadge = (tipo: string) => {
    const key = (tipo || "").toString().toLowerCase();
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; label: string }
    > = {
      aluno: { variant: "default", label: "Aluno" },
      professor: { variant: "secondary", label: "Professor" },
      administrador: { variant: "destructive", label: "Administrador" },
      funcionario: { variant: "secondary", label: "Funcionário" },
    };

    const { variant, label } = variants[key] || variants.aluno;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-8  ml-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">Suas informações pessoais</p>
        </div>
        <div className="w-full sm:max-w-xl md:max-w-2xl mx-auto">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                <div className="flex-1 text-center sm:text-left">
                  <CardTitle className="text-xl sm:text-2xl">
                    {profile?.nome}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {profile?.created_at
                      ? `Membro desde ${formatDate(profile.created_at)}`
                      : "Perfil do sistema"}
                  </CardDescription>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-4">
                  {profile && getTipoBadge(profile.tipo_usuario)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Tipo de Usuário</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {profile?.tipo_usuario}
                    </p>
                  </div>
                </div>

                {profile?.ra_aluno && (
                  <div className="flex items-start gap-3">
                    <IdCard className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">RA</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.ra_aluno}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
