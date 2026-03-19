import { useMemo } from "react";
import { differenceInCalendarDays, differenceInDays } from "date-fns";
import type { Meeting } from "./useMeetings";

export interface ProposalStats {
  porStatus: {
    proposta_enviada: number;
    ganha: number;
    perdida: number;
  };
  aging: {
    verde: Meeting[];
    amarelo: Meeting[];
    vermelho: Meeting[];
  };
  tempoMedioFechamento: number | null;
}

export function useProposalStats(meetings: Meeting[]): ProposalStats {
  return useMemo(() => {
    const agora = new Date();

    // Filtra apenas meetings com status relevantes para propostas
    const propostas = meetings.filter(
      (m) =>
        m.status === "proposta_enviada" ||
        m.status === "ganha" ||
        m.status === "perdida"
    );

    // Contagem por status (sem follow_up)
    const porStatus = {
      proposta_enviada: propostas.filter((m) => m.status === "proposta_enviada").length,
      ganha: propostas.filter((m) => m.status === "ganha").length,
      perdida: propostas.filter((m) => m.status === "perdida").length,
    };

    // Aging - apenas meetings com status proposta_enviada (em aberto)
    const abertas = propostas.filter((m) => m.status === "proposta_enviada");

    const aging = {
      verde: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.criado_em));
        return dias <= 5;
      }),
      amarelo: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.criado_em));
        return dias > 5 && dias <= 14;
      }),
      vermelho: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.criado_em));
        return dias > 14;
      }),
    };

    // Tempo médio para fechar (meetings ganhas com fechado_em)
    const ganhas = propostas.filter(
      (m) => m.status === "ganha" && m.fechado_em
    );

    let tempoMedioFechamento: number | null = null;

    if (ganhas.length > 0) {
      const totalDias = ganhas.reduce((sum, m) => {
        const dias = differenceInDays(
          new Date(m.fechado_em!),
          new Date(m.criado_em)
        );
        return sum + Math.max(0, dias);
      }, 0);

      tempoMedioFechamento = totalDias / ganhas.length;
    }

    return {
      porStatus,
      aging,
      tempoMedioFechamento,
    };
  }, [meetings]);
}
