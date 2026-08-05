// --- Start: Redeem live wire (Sachin) ---
export function maskRedeemCode(secret: string): string {
  const clean = secret.trim();
  if (clean.length <= 8) return '••••••••';
  const parts = clean.split('-');
  if (parts.length >= 4) {
    return `${parts[0]}-••••-••••-${parts[parts.length - 1]}`;
  }
  return `${clean.slice(0, 4)}-••••-••••-${clean.slice(-4)}`;
}
// --- End: Redeem live wire (Sachin) ---
