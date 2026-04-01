export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getDisplayName(contact: { name?: string; call_name?: string; phone_number?: string }): string {
  return contact.call_name || contact.name || formatPhoneNumber(contact.phone_number || '') || 'Desconhecido';
}

export function isContactNameMissing(contact: { name?: string; call_name?: string }): boolean {
  return !contact.name && !contact.call_name;
}
