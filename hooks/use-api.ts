"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Atestado,
  CreateUserData,
  CreateAtestadoData,
  FirebaseResult,
} from "@/types/firebase";

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch("/api/users");

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to fetch users");
  }
};

const createUser = async (
  userData: CreateUserData
): Promise<{ id: string }> => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to create user");
  }
};

export function useUsers() {
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const addUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const addUser = async (userData: CreateUserData): Promise<FirebaseResult> => {
    try {
      const result = await addUserMutation.mutateAsync(userData);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error adding user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add user",
      };
    }
  };

  return {
    users,
    loading,
    error: error instanceof Error ? error.message : null,
    addUser,
    isAddingUser: addUserMutation.isPending,
  };
}

const fetchAtestados = async (userId?: string): Promise<Atestado[]> => {
  const params = new URLSearchParams();
  if (userId) {
    params.append("userId", userId);
  }

  const url = `/api/atestados${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to fetch atestados");
  }
};

const createAtestado = async (
  atestadoData: CreateAtestadoData
): Promise<{ id: string }> => {
  const response = await fetch("/api/atestados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(atestadoData),
  });

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to create atestado");
  }
};

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
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to create atestado");
  }
};

export function useAtestados(userId?: string) {
  const queryClient = useQueryClient();

  const {
    data: atestados = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["atestados", userId],
    queryFn: () => fetchAtestados(userId),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const addAtestadoMutation = useMutation({
    mutationFn: createAtestado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const addAtestado = async (
    atestadoData: CreateAtestadoData
  ): Promise<FirebaseResult> => {
    try {
      const result = await addAtestadoMutation.mutateAsync(atestadoData);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error adding atestado:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add atestado",
      };
    }
  };

  return {
    atestados,
    loading,
    error: error instanceof Error ? error.message : null,
    addAtestado,
    isAddingAtestado: addAtestadoMutation.isPending,
  };
}

export function useAtestadosWithFormData(userId?: string) {
  const queryClient = useQueryClient();

  const {
    data: atestados = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["atestados", userId],
    queryFn: () => fetchAtestados(userId),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const addAtestadoMutation = useMutation({
    mutationFn: createAtestadoWithFormData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const addAtestado = async (
    atestadoData: CreateAtestadoData
  ): Promise<FirebaseResult> => {
    try {
      const result = await addAtestadoMutation.mutateAsync(atestadoData);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error adding atestado:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add atestado",
      };
    }
  };

  return {
    atestados,
    loading,
    error: error instanceof Error ? error.message : null,
    addAtestado,
    isAddingAtestado: addAtestadoMutation.isPending,
    mutationError:
      addAtestadoMutation.error instanceof Error
        ? addAtestadoMutation.error.message
        : null,
    isSuccess: addAtestadoMutation.isSuccess,
    reset: addAtestadoMutation.reset,
  };
}
