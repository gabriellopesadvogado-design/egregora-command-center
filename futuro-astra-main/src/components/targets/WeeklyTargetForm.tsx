import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeeklyTargetByWeek, useCreateWeeklyTarget } from "@/hooks/useTargets";

const schema = z.object({
  meta_reunioes_realizadas: z.number().min(0, "Deve ser maior ou igual a 0"),
  meta_fechamentos_qtd: z.number().min(0, "Deve ser maior ou igual a 0"),
  meta_fechamentos_valor: z.number().min(0).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export function WeeklyTargetForm() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  });

  const semanaInicio = format(selectedWeek.start, "yyyy-MM-dd");
  const semanaFim = format(selectedWeek.end, "yyyy-MM-dd");

  const { data: existingTarget, isLoading } = useWeeklyTargetByWeek(semanaInicio, semanaFim);
  const createMutation = useCreateWeeklyTarget();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      meta_reunioes_realizadas: 0,
      meta_fechamentos_qtd: 0,
      meta_fechamentos_valor: null,
    },
  });

  useEffect(() => {
    if (existingTarget) {
      reset({
        meta_reunioes_realizadas: existingTarget.meta_reunioes_realizadas || 0,
        meta_fechamentos_qtd: existingTarget.meta_fechamentos_qtd || 0,
        meta_fechamentos_valor: existingTarget.meta_fechamentos_valor,
      });
    } else {
      reset({
        meta_reunioes_realizadas: 0,
        meta_fechamentos_qtd: 0,
        meta_fechamentos_valor: null,
      });
    }
  }, [existingTarget, reset]);

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedWeek((prev) => ({
      start: direction === "next" ? addWeeks(prev.start, 1) : subWeeks(prev.start, 1),
      end: direction === "next" ? addWeeks(prev.end, 1) : subWeeks(prev.end, 1),
    }));
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      semana_inicio: semanaInicio,
      semana_fim: semanaFim,
      meta_reunioes_realizadas: data.meta_reunioes_realizadas,
      meta_fechamentos_qtd: data.meta_fechamentos_qtd,
      meta_fechamentos_valor: data.meta_fechamentos_valor ?? null,
    });
  };

  const weekLabel = `${format(selectedWeek.start, "dd/MM", { locale: ptBR })} - ${format(selectedWeek.end, "dd/MM/yyyy", { locale: ptBR })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Metas Semanais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Week Navigator */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">{weekLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="meta_reunioes_realizadas">
                  Reuniões Realizadas
                </Label>
                <Input
                  id="meta_reunioes_realizadas"
                  type="number"
                  min={0}
                  {...register("meta_reunioes_realizadas", { valueAsNumber: true })}
                />
                {errors.meta_reunioes_realizadas && (
                  <p className="text-sm text-destructive">
                    {errors.meta_reunioes_realizadas.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_fechamentos_qtd">Contratos Fechados</Label>
                <Input
                  id="meta_fechamentos_qtd"
                  type="number"
                  min={0}
                  {...register("meta_fechamentos_qtd", { valueAsNumber: true })}
                />
                {errors.meta_fechamentos_qtd && (
                  <p className="text-sm text-destructive">
                    {errors.meta_fechamentos_qtd.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_fechamentos_valor">
                  Valor Fechado (R$) - Opcional
                </Label>
                <Input
                  id="meta_fechamentos_valor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  {...register("meta_fechamentos_valor", {
                    setValueAs: (v) => (v === "" || v === null ? null : parseFloat(v)),
                  })}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Salvando..." : "Salvar Meta Semanal"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
