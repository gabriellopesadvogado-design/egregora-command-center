import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMonthlyTargetByMonth, useCreateMonthlyTarget } from "@/hooks/useTargets";

const schema = z.object({
  meta_faturamento: z.number().min(0, "Deve ser maior ou igual a 0"),
});

type FormData = z.infer<typeof schema>;

export function MonthlyTargetForm() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));

  const mesAno = format(selectedMonth, "yyyy-MM-dd");

  const { data: existingTarget, isLoading } = useMonthlyTargetByMonth(mesAno);
  const createMutation = useCreateMonthlyTarget();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      meta_faturamento: 0,
    },
  });

  useEffect(() => {
    if (existingTarget) {
      reset({
        meta_faturamento: existingTarget.meta_faturamento || 0,
      });
    } else {
      reset({
        meta_faturamento: 0,
      });
    }
  }, [existingTarget, reset]);

  const navigateMonth = (direction: "prev" | "next") => {
    setSelectedMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      mes_ano: mesAno,
      meta_faturamento: data.meta_faturamento,
    });
  };

  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Meta Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Month Navigator */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium capitalize">{monthLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("next")}
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
                <Label htmlFor="meta_faturamento">
                  Meta de Faturamento (R$)
                </Label>
                <Input
                  id="meta_faturamento"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  {...register("meta_faturamento", { valueAsNumber: true })}
                />
                {errors.meta_faturamento && (
                  <p className="text-sm text-destructive">
                    {errors.meta_faturamento.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Salvando..." : "Salvar Meta Mensal"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
