import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAtestadoData } from "@/lib/validations/schemas";

const createAtestadoWithFormData = async (
  data: CreateAtestadoData
): Promise<{ id: string }> => {
  const formData = new FormData();
  formData.append("data_inicio", data.data_inicio);
  formData.append("periodo_afastamento", data.periodo_afastamento.toString());
  formData.append("motivo", data.motivo);
  formData.append("status", data.status);

  if (data.imagem_atestado instanceof File) {
    formData.append("imagem_atestado", data.imagem_atestado);
  }

  const response = await fetch("/api/atestados", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${
        typeof window !== "undefined" ? localStorage.getItem("token") : ""
      }`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao criar atestado");
  }

  return result.data;
};

interface UseCreateAtestadoResult {
  createAtestado: (data: CreateAtestadoData) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useCreateAtestado(): UseCreateAtestadoResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAtestadoWithFormData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const createAtestado = async (data: CreateAtestadoData) => {
    await mutation.mutateAsync(data);
  };

  return {
    createAtestado,
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    success: mutation.isSuccess,
    reset: mutation.reset,
  };
}
