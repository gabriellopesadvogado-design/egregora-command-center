import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Star, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useYearlyTargetByYear, useCreateYearlyTarget } from "@/hooks/useTargets";

const schema = z.object({
  meta_faturamento: z.number().min(0, "Deve ser maior ou igual a 0"),
});

type FormData = z.infer<typeof schema>;

export function YearlyTargetForm() {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const { data: existingTarget, isLoading } = useYearlyTargetByYear(selectedYear);
  const createMutation = useCreateYearlyTarget();

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

  const navigateYear = (direction: "prev" | "next") => {
    setSelectedYear((prev) =>
      direction === "next" ? prev + 1 : prev - 1
    );
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ano: selectedYear,
      meta_faturamento: data.meta_faturamento,
    });
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const canGoForward = selectedYear < currentYear + 1;

  return (
    <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning fill-warning" />
          Meta Anual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Year Navigator */}
          <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateYear("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg">{selectedYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigateYear("next")}
              disabled={!canGoForward}
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
                <Label htmlFor="meta_faturamento_anual">
                  Meta de Faturamento Anual (R$)
                </Label>
                <Input
                  id="meta_faturamento_anual"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  className="border-warning/30 focus-visible:ring-warning"
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
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Salvando..." : "Salvar Meta Anual"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
