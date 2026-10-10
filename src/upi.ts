/**
 * UPI deep-link helpers (NPCI `upi://pay` spec).
 *
 * Builds a payment URL the OS hands to the user's UPI app
 * (GPay / PhonePe / Paytm / BHIM). The UPI app shows the payee
 * name + amount — the user just enters their UPI PIN to pay.
 *
 * Note: without a payment-gateway integration there is no callback,
 * so Hisab cannot auto-confirm. The payer taps "Mark paid" after
 * completing the payment in their UPI app.
 */

/** Basic VPA sanity check: localpart@bankhandle */
export function isValidUpi(vpa: string): boolean {
  return /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(vpa.trim());
}

export function buildUpiUrl({
  vpa,
  payeeName,
  amount,
  note = 'Hisab settle-up',
}: {
  vpa: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName.trim(),
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
    tr: `hisab${Date.now()}`,
  });
  return `upi://pay?${params.toString()}`;
}

export interface UpiApp {
  name: string;
  /** Android package name */
  pkg: string;
}

/** Well-known UPI apps — user picks one, we fire a package-targeted intent. */
export const UPI_APPS: UpiApp[] = [
  { name: 'Google Pay', pkg: 'com.google.android.apps.nbu.paisa.user' },
  { name: 'PhonePe', pkg: 'com.phonepe.app' },
  { name: 'Paytm', pkg: 'net.one97.paytm' },
  { name: 'BHIM UPI', pkg: 'in.org.npci.upiapp' },
  { name: 'Amazon Pay', pkg: 'in.amazon.mShop.android.shopping' },
  { name: 'WhatsApp Pay', pkg: 'com.whatsapp' },
];

/**
 * Android `intent://` URL that opens the payment in ONE specific app,
 * bypassing whatever the OS default is. React Native parses this into
 * a package-targeted Intent. Throws (via Linking) if the app isn't installed.
 */
export function buildAppIntentUrl(
  pkg: string,
  {
    vpa,
    payeeName,
    amount,
    note = 'Hisab settle-up',
  }: {
    vpa: string;
    payeeName: string;
    amount: number;
    note?: string;
  },
): string {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName.trim(),
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
    tr: `hisab${Date.now()}`,
  });
  return `intent://pay?${params.toString()}#Intent;scheme=upi;package=${pkg};end`;
}
