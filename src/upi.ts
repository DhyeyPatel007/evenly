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

export interface UpiAppOption {
  name: string;
  /** Private URL scheme only that app handles — bypasses the OS default entirely. */
  scheme: string;
  /** Path after `scheme://` */
  path: string;
}

/**
 * Per-app deep links. Each scheme is registered by exactly one app, so
 * tapping one can never land in a different app (e.g. WhatsApp Pay)
 * even when that app is the OS default for generic `upi://` links.
 * If the app isn't installed, Linking.openURL rejects and we show a notice.
 */
export const UPI_APP_OPTIONS: UpiAppOption[] = [
  { name: 'Google Pay', scheme: 'tez', path: 'upi/pay' },
  { name: 'PhonePe', scheme: 'phonepe', path: 'pay' },
  { name: 'Paytm', scheme: 'paytmmp', path: 'pay' },
  { name: 'Other UPI app', scheme: 'upi', path: 'pay' },
];

export function buildAppUpiUrl(
  opt: UpiAppOption,
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
  return `${opt.scheme}://${opt.path}?${params.toString()}`;
}
