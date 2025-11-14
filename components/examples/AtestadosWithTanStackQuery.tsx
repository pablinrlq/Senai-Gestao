import React from "react";
import { CreateAtestadoForm } from "@/components/CreateAtestadoForm";
import { useAtestadosWithFormData } from "@/hooks/use-api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatDate";

export default function AtestadosWithTanStackQuery() {
  const router = useRouter();
  const { atestados, loading, error, isAddingAtestado } =
    useAtestadosWithFormData();

  // use shared formatDate util

  const handleSuccess = () => {
    console.log("Atestado created successfully!");
    // The list will automatically update thanks to TanStack Query cache invalidation
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Error loading atestados: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Gestão de Atestados
        </h1>

        {/* Create Form */}
        <CreateAtestadoForm onSuccess={handleSuccess} />

        {/* Status indicator */}
        {isAddingAtestado && (
          <div className="mt-4 text-center text-blue-600">
            Creating atestado...
          </div>
        )}
      </div>

      {/* Atestados List */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Meus Atestados</h2>
          <Button
            variant="outline"
            onClick={() => router.refresh()}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando atestados...</p>
          </div>
        ) : atestados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Nenhum atestado encontrado. Crie seu primeiro atestado acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {atestados.map((atestado) => (
              <Card key={atestado.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{atestado.motivo}</CardTitle>
                    <Badge
                      variant={
                        atestado.status === "aprovado"
                          ? "default"
                          : atestado.status === "rejeitado"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {atestado.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Início:</strong>{" "}
                      {formatDate(atestado.data_inicio)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Fim:</strong> {formatDate(atestado.data_fim)}
                    </p>
                    {atestado.imagem_atestado && (
                      <div className="mt-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={atestado.imagem_atestado}
                          alt="Atestado"
                          className="max-w-full h-auto rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
