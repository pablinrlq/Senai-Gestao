import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CreateAtestadoSchema,
  type CreateAtestadoData,
} from "@/lib/validations/schemas";
import { useCreateAtestado } from "@/hooks/use-create-atestado";

interface CreateAtestadoFormProps {
  onSuccess?: () => void;
}

export function CreateAtestadoForm({ onSuccess }: CreateAtestadoFormProps) {
  const { createAtestado, loading, error, success, reset } =
    useCreateAtestado();

  const form = useForm<CreateAtestadoData>({
    resolver: zodResolver(CreateAtestadoSchema),
    defaultValues: {
      data_inicio: "",
      periodo_afastamento: 1,
      motivo: "",
      status: "pendente",
    },
  });

  const onSubmit = async (data: CreateAtestadoData) => {
    try {
      await createAtestado(data);
      form.reset();
      setTimeout(() => reset(), 3000);
      onSuccess?.();
    } catch {
      // Error is handled by TanStack Query
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Criar Novo Atestado</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Máximo 5 dias de tolerância para envio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodo_afastamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de Afastamento (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="Ex: 3"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo do atestado..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imagem_atestado"
              render={({ field: { onChange, name, onBlur } }) => (
                <FormItem>
                  <FormLabel>Imagem do Atestado</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      name={name}
                      onBlur={onBlur}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file);
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium"
                    />
                  </FormControl>
                  <FormDescription>
                    Formatos aceitos: JPG, PNG, GIF (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  Atestado criado com sucesso!
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar Atestado"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default CreateAtestadoForm;
