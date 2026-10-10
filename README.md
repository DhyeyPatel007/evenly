# Hisab — the smart Splitwise

A demo expense-splitting app built with React Native + Expo (SDK 57). One codebase,
runs on iOS and Android. 100% free tooling, no backend, data stays on-device.

## Run it on your phone

1. Install **Node.js LTS** from https://nodejs.org on your computer
2. Install **Expo Go** (free) on your phone from the Play Store / App Store
3. Clone and start:
   ```bash
   git clone https://github.com/DhyeyPatel007/hisab.git
   cd hisab
   npm install
   npx expo start
   ```
4. Scan the QR code with Expo Go (phone and computer on the same Wi-Fi)

The app opens with demo data (Room 204 + Goa Trip) so it looks alive immediately.
Tap ↺ on the home screen to reset the demo.

## What's inside

- **Home** — live balance hero, group cards with per-group nets
- **Group detail** — Activity / Balances / Insights tabs
- **Add expense** — equal, shares, percentage and exact splits, categories,
  paid-by picker, recurring monthly flag, paise-perfect rounding
- **⚡ Smart settle-up** — min-cash-flow algorithm collapses every debt into the
  fewest possible payments; pay via UPI deep link or mark paid
- **Insights** — hand-drawn SVG donut by category, who-paid-most bars, stats
- **Persistence** — AsyncStorage, works fully offline

## Tech

Expo SDK 57 · Expo Router (file-based routing) · TypeScript · react-native-svg ·
AsyncStorage · zero paid services
