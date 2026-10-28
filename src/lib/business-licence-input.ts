/** Accept the numeral scripts used by this form without treating an unknown value as zero. */
export function normalizeBusinessNumber(value: string): string {
  return value.trim().replace(/[०-९೦-೯]/g, digit => {
    const code = digit.codePointAt(0)!;
    return String(code >= 0x0ce6 ? code - 0x0ce6 : code - 0x0966);
  }).replace(/,/g, '');
}

export function validBusinessNumber(value: string, wholeNumber = false): boolean {
  if (!value.trim()) return true;
  const grouped = value.trim().replace(/[०-९೦-೯]/g, digit => {
    const code = digit.codePointAt(0)!;
    return String(code >= 0x0ce6 ? code - 0x0ce6 : code - 0x0966);
  });
  if (grouped.includes(',') && !/^\d{1,3}(?:,\d{2})*,\d{3}(?:\.\d{1,2})?$/.test(grouped) && !/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(grouped)) return false;
  const normalized = normalizeBusinessNumber(value);
  return (wholeNumber ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(normalized)
    && Number(normalized) <= (wholeNumber ? 1e7 : 1e13);
}
