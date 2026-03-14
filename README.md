# Lyra - Frontend

Proximity-based dating app. No swiping — an AI interviews users to build personality profiles, then notifies them when a compatible match is physically nearby. One approves, the other opens a live GPS radar, and they walk toward each other.

## User Flow

```
Onboarding (AI Interview) → Login → Profile Setup → Home → Match Profile → Proximity Radar
```

1. **Onboarding** — Animated glowing orb (Lyra) asks 8 personality questions via voice-style UI. Text fades in/out like a teleprompter. Mic button to advance.
2. **Login** — "Personality Saved." → Continue with Apple
3. **Profile Setup** — Photo slots (4 vertical rectangles), name, age, gender, "Want to meet" preferences
4. **Home** — Blue breathing orb, "Looking for someone compatible near you". Tap 5x anywhere for demo mode.
5. **Match Profile** — Circular photo, bio, Lyra's match reasoning. Pink/gray edge gradients that glow on button hold. "Let's not" / "Let's meet!"
6. **Proximity Radar** — Compass arrow pointing to match, color shifts (green → amber → pink), pulsing distance text, confetti + haptics on arrival

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Onboarding | `/(app)/onboarding` | 8-question AI interview with animated orb (entry point) |
| Login | `/(auth)/login` | "Personality Saved." + Apple Sign-In |
| Profile Setup | `/(app)/signup` | Photos, name, age, gender, orientation |
| Home | `/(app)/home` | Blue orb waiting screen + 5-tap demo trigger |
| Match Profile | `/(app)/match/[id]` | Profile reveal with interactive edge gradients |
| Proximity Radar | `/(app)/radar/[id]` | Compass radar, distance countdown, confetti celebration |

## Demo Mode

From the home screen, **tap anywhere 5 times** to trigger demo mode:
1. After 3 seconds, Sam's profile appears
2. Hold "Let's meet!" (pink glow) or "Let's not" (gray glow)
3. Radar screen: compass arrow + distance counts down 88m → 0m over 25 seconds
4. At < 3m: confetti burst from bottom + haptic vibration

## Tech Stack

- Expo SDK 55 + TypeScript
- expo-router v5 (file-based routing)
- React Native SVG (radar, orb gradients, compass arrow, edge gradients)
- React Native Animated API (orb breathing, confetti particles, text transitions)
- expo-haptics (celebration vibration)

## Getting Started

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

## Project Structure

```
app/
├── _layout.tsx              # Root layout
├── index.tsx                # Entry → redirects to onboarding
├── (auth)/
│   ├── _layout.tsx
│   └── login.tsx            # "Personality Saved." + Apple Sign-In
├── (app)/
│   ├── _layout.tsx
│   ├── onboarding.tsx       # Orb + teleprompter interview
│   ├── signup.tsx           # Profile setup (photos, name, age, gender)
│   ├── home.tsx             # Blue orb waiting screen
│   ├── match/[id].tsx       # Match profile with edge gradients
│   └── radar/[id].tsx       # Compass radar + confetti celebration
```

## Backend Integration (TODO)

This frontend is designed to connect to a Supabase backend. The following will be added once the backend team delivers:

- **Supabase Auth** — Apple Sign-In via `signInWithIdToken`
- **Supabase Realtime** — match notifications + live location sharing
- **Edge Functions** — `/interview` (Claude Haiku streaming), `/embed` (personality embedding)
- **Background Location** — `expo-location` + `expo-task-manager`
- **Push Notifications** — `expo-notifications`

### Supabase Tables Needed
- `profiles` — id, name, age, gender, orientation, photos, personality_summary, embedding, push_token
- `matches` — id, user_a, user_b, status, created_at (Realtime enabled)
- `locations` — user_id, latitude, longitude, updated_at (Realtime enabled)
- `avatars` storage bucket
