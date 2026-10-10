/** Indian-rupee formatting: ₹1,24,500 */
export function inr(n: number): string {
  const v = Math.round(n * 100) / 100;
  const s = v.toLocaleString('en-IN', { maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
  return `₹${s}`;
}

export function inrSigned(n: number): string {
  return n < 0 ? `-${inr(-n)}` : `+${inr(n)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function todayISO(): string {
  const t = new Date();
  const m = `${t.getMonth() + 1}`.padStart(2, '0');
  const d = `${t.getDate()}`.padStart(2, '0');
  return `${t.getFullYear()}-${m}-${d}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
