import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email deve ter um formato válido"),
  cargo: z.enum(["ADMINISTRADOR", "USUARIO", "FUNCIONARIO"], {
    errorMap: () => ({
      message: "Cargo deve ser ADMINISTRADOR, USUARIO ou FUNCIONARIO",
    }),
  }),
  telefone: z.string().optional(),
  ra: z.string().min(5, "RA deve ter pelo menos 5 caracteres"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  curso: z.string().optional(),
  periodo: z.string().optional(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  cargo: true,
}).extend({
  cargo: z
    .enum(["ADMINISTRADOR", "USUARIO", "FUNCIONARIO"])
    .optional()
    .default("USUARIO"),
  telefone: z.string().optional().default(""),
  metadata: z.record(z.any()).optional(),
  curso: z.string().optional().nullable(),
  periodo: z.string().optional().nullable(),
  turma: z.string().optional().nullable(),
  status: z
    .enum(["ativo", "inativo"], {
      errorMap: () => ({ message: "Status deve ser 'ativo' ou 'inativo'" }),
    })
    .optional()
    .default("ativo"),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.string(),
});

export const AtestadoSchema = z.object({
  id: z.string(),
  id_usuario: z.string().min(1, "ID do usuário é obrigatório"),
  data_inicio: z.string().date().min(1, "Data de início é obrigatória"),
  data_fim: z.string().date().min(1, "Data de fim é obrigatória"),
  motivo: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres"),
  imagem_atestado: z.string().optional().default(""),
  status: z
    .enum(["pendente", "aprovado", "rejeitado"], {
      errorMap: () => ({
        message: "Status deve ser pendente, aprovado ou rejeitado",
      }),
    })
    .default("pendente"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const CreateAtestadoSchema = z.object({
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().min(1, "Data de fim é obrigatória"),
  motivo: z.string().optional().default(""),
  status: z
    .enum(["pendente", "aprovado", "rejeitado"], {
      errorMap: () => ({
        message: "Status deve ser pendente, aprovado ou rejeitado",
      }),
    })
    .default("pendente"),
  imagem_atestado: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `O arquivo deve ter no máximo ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB`,
    })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: "Tipos de arquivo aceitos: JPEG, JPG, PNG, WEBP",
    })
    .optional(),
});

export const CreateAtestadoWithUserSchema = CreateAtestadoSchema.extend({
  id_usuario: z.string().min(1, "ID do usuário é obrigatório"),
});

export const UpdateAtestadoStatusSchema = z.object({
  status: z.enum(["pendente", "aprovado", "rejeitado"], {
    errorMap: () => ({
      message: "Status deve ser pendente, aprovado ou rejeitado",
    }),
  }),
});

export const LoginSchema = z.object({
  email: z.string().email("Email deve ter um formato válido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

export const BrazilianDateSchema = z.string().refine(
  (date) => {
    const regex = /^\d{1,2} de \w+ de \d{4} às \d{2}:\d{2}:\d{2} UTC[+-]\d$/;
    return regex.test(date);
  },
  {
    message:
      'Data deve estar no formato "3 de novembro de 2025 às 00:00:00 UTC-3"',
  }
);

// Validation for date range
export const AtestadoDateRangeSchema = z
  .object({
    data_inicio: BrazilianDateSchema,
    data_fim: BrazilianDateSchema,
  })
  .refine(
    (data) => {
      try {
        const startDate = new Date(data.data_inicio);
        const endDate = new Date(data.data_fim);
        return endDate > startDate;
      } catch {
        return false;
      }
    },
    {
      message: "Data de fim deve ser posterior à data de início",
      path: ["data_fim"],
    }
  );

export type User = z.infer<typeof UserSchema>;
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type Atestado = z.infer<typeof AtestadoSchema>;
export type CreateAtestadoData = z.infer<typeof CreateAtestadoSchema>;
export type CreateAtestadoWithUserData = z.infer<
  typeof CreateAtestadoWithUserSchema
>;
export type UpdateAtestadoStatus = z.infer<typeof UpdateAtestadoStatusSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
