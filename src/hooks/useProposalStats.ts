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

    const propostas = meetings.filter(
      (m) =>
        m.status === "proposta_enviada" ||
        m.status === "fechado" ||
        m.status === "perdido"
    );

    const porStatus = {
      proposta_enviada: propostas.filter((m) => m.status === "proposta_enviada").length,
      ganha: propostas.filter((m) => m.status === "fechado").length,
      perdida: propostas.filter((m) => m.status === "perdido").length,
    };

    const abertas = propostas.filter((m) => m.status === "proposta_enviada");

    const aging = {
      verde: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.created_at || m.criado_em || ""));
        return dias <= 5;
      }),
      amarelo: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.created_at || m.criado_em || ""));
        return dias > 5 && dias <= 14;
      }),
      vermelho: abertas.filter((m) => {
        const dias = differenceInCalendarDays(agora, new Date(m.created_at || m.criado_em || ""));
        return dias > 14;
      }),
    };

    const ganhas = propostas.filter(
      (m) => m.status === "fechado" && (m.data_fechamento || m.fechado_em)
    );

    let tempoMedioFechamento: number | null = null;

    if (ganhas.length > 0) {
      const totalDias = ganhas.reduce((sum, m) => {
        const closeDate = m.data_fechamento || m.fechado_em || "";
        const createDate = m.created_at || m.criado_em || "";
        const dias = differenceInDays(new Date(closeDate), new Date(createDate));
        return sum + Math.max(0, dias);
      }, 0);
      tempoMedioFechamento = totalDias / ganhas.length;
    }

    return { porStatus, aging, tempoMedioFechamento };
  }, [meetings]);
}
