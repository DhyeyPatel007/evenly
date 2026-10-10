# Evenly — the smart Splitwise

A production-quality expense-splitting app built with React Native + Expo (SDK 57).
One codebase, runs on iOS and Android. 100% free tooling, no backend, no account —
your data stays on your device.

## Run it on your phone

1. Install **Node.js LTS** from https://nodejs.org on your computer
2. Install **Expo Go** (free) on your phone from the Play Store / App Store
3. Clone and start:
   ```bash
   git clone https://github.com/DhyeyPatel007/evenly.git
   cd evenly
   npm install
   npx expo start
   ```
4. Open the **Expo Go app** → **Scan QR code** → point at the terminal QR
   (phone and computer on the same Wi-Fi; or use `npx expo start --tunnel`)

First launch asks for your name — then it's a blank slate. Use
**Explore with demo data** from the empty state to see it alive, or
build your own groups from scratch.

## What's inside

- **Onboarding** — no account, just your name; everything stored locally
- **Dashboard** — net balance, you-owe / owed-to-you, recent activity, groups
- **Groups** — create with your own members, rename, archive, safe delete
- **Members** — add (name + optional email/UPI), edit, remove; members with
  expense history are *archived* instead of deleted so records stay intact
- **Expenses** — description, amount, category, date picker, paid-by, notes;
  equal / shares / percentage / exact splits with live per-person preview;
  paise-perfect rounding; edit and delete anytime
- **⚡ Smart settle-up** — min-cash-flow algorithm collapses every debt into the
  fewest possible payments; pay via UPI deep link or record as paid
- **Insights** — hand-drawn SVG donut by category, who-paid-most bars, stats
- **Persistence** — AsyncStorage, works fully offline

## Design

Light-first interface: neutral background, white surfaces, Inter type scale with
tabular numerals for money, one green accent for primary/positive actions, red
for debts. Ionicons throughout — no emoji icons.

## Tech

Expo SDK 57 · Expo Router (file-based) · TypeScript · Inter via expo-font ·
react-native-svg · AsyncStorage · @react-native-community/datetimepicker ·
zero paid services
