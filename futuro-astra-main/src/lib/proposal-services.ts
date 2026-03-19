export interface ProposalService {
  id: string;
  name: string;
  defaultValue: number;
}

export const proposalServices: ProposalService[] = [
  { id: "naturalizacao", name: "Naturalização Brasileira", defaultValue: 4000 },
  { id: "aceleracao", name: "Aceleração Judicial", defaultValue: 2000 },
  { id: "curso_portugues", name: "Curso de Português", defaultValue: 500 },
  { id: "autorizacao_residencia", name: "Autorização de Residência", defaultValue: 3500 },
  { id: "traducao_antecedentes", name: "Tradução Antecedentes Criminais", defaultValue: 250 },
  { id: "traducao_certidao", name: "Tradução Certidão de Nascimento", defaultValue: 250 },
  { id: "recurso_naturalizacao", name: "Recurso em Processo de Naturalização", defaultValue: 2000 },
];
