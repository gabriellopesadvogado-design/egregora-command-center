/**
 * Remove todos os caracteres que não são dígitos do telefone.
 * Exemplos:
 *   +55 (11) 99999-9999 → 5511999999999
 *   +27 82 213 2193     → 27822132193
 *   +1 (305) 555-1234   → 13055551234
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Valida o telefone após normalização.
 * Padrão E.164: mínimo 8 dígitos, máximo 15 dígitos.
 */
export function validatePhone(phone: string): { valid: boolean; normalized: string } {
  const normalized = normalizePhone(phone);
  const valid = normalized.length >= 8 && normalized.length <= 15;
  return { valid, normalized };
}

export const PHONE_ERROR_MESSAGE =
  "Telefone inválido. Inclua o DDI do país (ex: 55 para Brasil, 1 para EUA, 27 para África do Sul)";
