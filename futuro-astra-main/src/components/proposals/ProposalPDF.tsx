import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { TEMPLATE_PAGES, TEMPLATE_SIZE } from "@/lib/proposal-template";
import { formatBRL, formatDateLong } from "@/lib/proposal-format";

// ── Types ──────────────────────────────────────────────
export interface ProposalServiceItem {
  id: string;
  name: string;
  selected: boolean;
  value: number;
}

export interface ProposalPDFProps {
  leadName: string;
  validityDate: Date;
  services: ProposalServiceItem[];
  paymentMode: "avista" | "parcelado" | "personalizado";
  paymentText: string;
  totalOriginal: number;
  totalFinal: number;
}

// ── Layout constants (easy to tweak) ───────────────────
const LAYOUT = {
  // Page 1 – welcome
  p1: {
    maskTop: 920,
    maskLeft: 0,
    maskWidth: 750,
    maskHeight: 160,
    textTop: 970,
    textLeft: 60,
    fontSize: 36,
  },
  // Page 10 – services list
  p10: {
    maskTop: 340,
    maskLeft: 60,
    maskWidth: 690,
    maskHeight: 700,
    listTop: 360,
    listLeft: 80,
    listRight: 80,
    lineHeight: 52,
    fontSize: 18,
    totalTop: 960,
    totalFontSize: 24,
    maxVisibleItems: 6,
  },
  // Page 11 – validity + payment
  p11: {
    validityMaskTop: 280,
    validityMaskLeft: 60,
    validityMaskWidth: 690,
    validityMaskHeight: 60,
    validityTextTop: 290,
    validityTextLeft: 60,
    validityFontSize: 22,
    paymentMaskTop: 400,
    paymentMaskLeft: 60,
    paymentMaskWidth: 690,
    paymentMaskHeight: 200,
    paymentTextTop: 420,
    paymentTextLeft: 80,
    paymentFontSize: 20,
    paymentLineHeight: 34,
  },
} as const;

const COLORS = {
  navy: "#112240",
  coral: "#E8522A",
  white: "#FFFFFF",
};

// ── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    width: TEMPLATE_SIZE.width,
    height: TEMPLATE_SIZE.height,
    position: "relative",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TEMPLATE_SIZE.width,
    height: TEMPLATE_SIZE.height,
  },

  // Page 1
  p1Mask: {
    position: "absolute",
    top: LAYOUT.p1.maskTop,
    left: LAYOUT.p1.maskLeft,
    width: LAYOUT.p1.maskWidth,
    height: LAYOUT.p1.maskHeight,
    backgroundColor: COLORS.navy,
  },
  p1Text: {
    position: "absolute",
    top: LAYOUT.p1.textTop,
    left: LAYOUT.p1.textLeft,
    fontSize: LAYOUT.p1.fontSize,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  p1Name: {
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
  },

  // Page 10
  p10Mask: {
    position: "absolute",
    top: LAYOUT.p10.maskTop,
    left: LAYOUT.p10.maskLeft,
    width: LAYOUT.p10.maskWidth,
    height: LAYOUT.p10.maskHeight,
    backgroundColor: COLORS.navy,
  },
  p10List: {
    position: "absolute",
    top: LAYOUT.p10.listTop,
    left: LAYOUT.p10.listLeft,
    right: LAYOUT.p10.listRight,
    width: TEMPLATE_SIZE.width - LAYOUT.p10.listLeft - LAYOUT.p10.listRight,
  },
  p10Row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: LAYOUT.p10.lineHeight,
  },
  p10ServiceName: {
    fontSize: LAYOUT.p10.fontSize,
    color: COLORS.white,
    fontFamily: "Helvetica",
    flex: 1,
  },
  p10ServiceValue: {
    fontSize: LAYOUT.p10.fontSize,
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  p10Overflow: {
    fontSize: LAYOUT.p10.fontSize - 2,
    color: COLORS.coral,
    fontFamily: "Helvetica-Oblique",
    marginTop: 8,
  },
  p10TotalRow: {
    position: "absolute",
    top: LAYOUT.p10.totalTop,
    left: LAYOUT.p10.listLeft,
    right: LAYOUT.p10.listRight,
    width: TEMPLATE_SIZE.width - LAYOUT.p10.listLeft - LAYOUT.p10.listRight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  p10TotalLabel: {
    fontSize: LAYOUT.p10.totalFontSize,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  p10TotalValue: {
    fontSize: LAYOUT.p10.totalFontSize,
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  p10TotalStrikethrough: {
    fontSize: LAYOUT.p10.fontSize,
    color: COLORS.white,
    fontFamily: "Helvetica",
    textDecoration: "line-through",
    textAlign: "right",
    marginBottom: 4,
  },

  // Page 11
  p11ValidityMask: {
    position: "absolute",
    top: LAYOUT.p11.validityMaskTop,
    left: LAYOUT.p11.validityMaskLeft,
    width: LAYOUT.p11.validityMaskWidth,
    height: LAYOUT.p11.validityMaskHeight,
    backgroundColor: COLORS.navy,
  },
  p11ValidityText: {
    position: "absolute",
    top: LAYOUT.p11.validityTextTop,
    left: LAYOUT.p11.validityTextLeft,
    fontSize: LAYOUT.p11.validityFontSize,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  p11ValidityDate: {
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
  },
  p11PaymentMask: {
    position: "absolute",
    top: LAYOUT.p11.paymentMaskTop,
    left: LAYOUT.p11.paymentMaskLeft,
    width: LAYOUT.p11.paymentMaskWidth,
    height: LAYOUT.p11.paymentMaskHeight,
    backgroundColor: COLORS.coral,
  },
  p11PaymentText: {
    position: "absolute",
    top: LAYOUT.p11.paymentTextTop,
    left: LAYOUT.p11.paymentTextLeft,
    fontSize: LAYOUT.p11.paymentFontSize,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  p11PaymentLine: {
    fontSize: LAYOUT.p11.paymentFontSize,
    color: COLORS.white,
    fontFamily: "Helvetica",
    lineHeight: LAYOUT.p11.paymentLineHeight / LAYOUT.p11.paymentFontSize,
  },
});

// ── Helpers ────────────────────────────────────────────
const paymentModeLabel: Record<ProposalPDFProps["paymentMode"], string> = {
  avista: "À vista",
  parcelado: "Parcelado",
  personalizado: "Personalizado",
};

// ── Component ──────────────────────────────────────────
function TemplatePage({ index }: { index: number }) {
  return (
    <Page size={TEMPLATE_SIZE} style={s.page}>
      <Image src={TEMPLATE_PAGES[index]} style={s.bg} />
    </Page>
  );
}

export function ProposalPDF(props: ProposalPDFProps) {
  const {
    leadName,
    validityDate,
    services,
    paymentMode,
    paymentText,
    totalOriginal,
    totalFinal,
  } = props;

  const selectedServices = services.filter((svc) => svc.selected);
  const visibleServices = selectedServices.slice(0, LAYOUT.p10.maxVisibleItems);
  const overflowCount = selectedServices.length - visibleServices.length;
  const hasDiscount = totalFinal < totalOriginal;

  return (
    <Document>
      {/* Page 1 – Welcome */}
      <Page size={TEMPLATE_SIZE} style={s.page}>
        <Image src={TEMPLATE_PAGES[0]} style={s.bg} />
        <View style={s.p1Mask} />
        <Text style={s.p1Text}>
          Olá, <Text style={s.p1Name}>{leadName}</Text>
        </Text>
      </Page>

      {/* Pages 2–9 (static) */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <TemplatePage key={i} index={i} />
      ))}

      {/* Page 10 – Services */}
      <Page size={TEMPLATE_SIZE} style={s.page}>
        <Image src={TEMPLATE_PAGES[9]} style={s.bg} />
        <View style={s.p10Mask} />

        {/* Service lines */}
        <View style={s.p10List}>
          {visibleServices.map((svc) => (
            <View key={svc.id} style={s.p10Row}>
              <Text style={s.p10ServiceName}>{svc.name}</Text>
              <Text style={s.p10ServiceValue}>{formatBRL(svc.value)}</Text>
            </View>
          ))}
          {overflowCount > 0 && (
            <Text style={s.p10Overflow}>
              + {overflowCount} {overflowCount === 1 ? "item" : "itens"}
            </Text>
          )}
        </View>

        {/* Total */}
        <View style={s.p10TotalRow}>
          <Text style={s.p10TotalLabel}>Total</Text>
          <View>
            {hasDiscount && (
              <Text style={s.p10TotalStrikethrough}>
                {formatBRL(totalOriginal)}
              </Text>
            )}
            <Text style={s.p10TotalValue}>{formatBRL(totalFinal)}</Text>
          </View>
        </View>
      </Page>

      {/* Page 11 – Validity & Payment */}
      <Page size={TEMPLATE_SIZE} style={s.page}>
        <Image src={TEMPLATE_PAGES[10]} style={s.bg} />

        {/* Validity */}
        <View style={s.p11ValidityMask} />
        <Text style={s.p11ValidityText}>
          Fechando até{" "}
          <Text style={s.p11ValidityDate}>
            {formatDateLong(validityDate)}
          </Text>
        </Text>

        {/* Payment block */}
        <View style={s.p11PaymentMask} />
        <View style={s.p11PaymentText}>
          <Text style={s.p11PaymentLine}>
            Valor final: {formatBRL(totalFinal)}
          </Text>
          <Text style={s.p11PaymentLine}>
            Condição: {paymentModeLabel[paymentMode]}
          </Text>
          {paymentText ? (
            <Text style={s.p11PaymentLine}>{paymentText}</Text>
          ) : null}
        </View>
      </Page>

      {/* Pages 12–14 (static) */}
      {[11, 12, 13].map((i) => (
        <TemplatePage key={i} index={i} />
      ))}
    </Document>
  );
}
