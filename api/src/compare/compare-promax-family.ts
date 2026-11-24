/**
 * Normalize device labels into a chipset/model family key.
 * e.g. "Google Pixel 6 Pro" / "Google Pixel 6a" → "google pixel 6"
 *     "Samsung Galaxy S23 Ultra" → "samsung galaxy s23"
 */
export function deviceFamilyKey(label: string): string {
  let s = String(label ?? '')
    .toLowerCase()
    .trim();
  if (!s) return '';
  s = s.replace(/[^a-z0-9+\s.-]/g, ' ');
  s = s.replace(/\b(5g|4g|dual\s*sim|global|india|usa|eu|unlocked)\b/g, ' ');
  s = s.replace(/\b(pro\s*max|promax|ultra|plus|\+|max|lite|fe|mini)\b/g, ' ');
  s = s.replace(/\bpro\b/g, ' ');
  // "6a" / "6e" → keep leading digits as family ("6")
  s = s.replace(/\b(\d+)[a-z]\b/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  const parts = s.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const out: string[] = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    out.push(parts[i]);
    if (/\d/.test(parts[i])) break;
  }
  return out.join(' ').trim();
}
