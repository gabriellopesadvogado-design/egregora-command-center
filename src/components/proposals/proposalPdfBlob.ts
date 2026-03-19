import { pdf } from "@react-pdf/renderer";
import { ProposalPDF, type ProposalPDFProps } from "./ProposalPDF";
import React from "react";

export async function generateProposalPdfBlob(
  props: ProposalPDFProps
): Promise<Blob> {
  const element = React.createElement(ProposalPDF, props) as any;
  return await pdf(element).toBlob();
}
