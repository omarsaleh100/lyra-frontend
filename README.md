# Lyra - Frontend

Proximity-based dating app. No swiping — an AI interviews users to build personality profiles, then notifies them when a compatible match is physically nearby. One approves, the other opens a live GPS radar, and they walk toward each other.

## User Flow

```
Onboarding (AI Interview) → Login → Home → Match Profile → Proximity Radar
```

1. **Onboarding** — App opens straight to a chat-style AI interview. 8 questions total:
   - Q1: Name, age, gender, orientation (profile basics)
   - Q2–Q8: Personality questions (values, interests, lifestyle, humor, love language, etc.)
2. **Login** — Apple Sign-In to create account after completing the interview
3. **Home** — Pulse animation, waiting for a nearby compatible match
4. **Match Profile** — When a match is found nearby, their profile card is revealed (approve or pass)
5. **Proximity Radar** — Live GPS radar with distance countdown, walk toward each other, celebration at arrival

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Onboarding | `/(app)/onboarding` | 8-question AI interview chat UI (entry point) |
| Login | `/(auth)/login` | Apple Sign-In |
| Home | `/(app)/home` | Pulse animation, waiting for nearby matches |
| Match Profile | `/(app)/match/[id]` | Profile card reveal, approve/pass |
| Proximity Radar | `/(app)/radar/[id]` | Live distance countdown with SVG radar |

## Demo Mode

From the home screen, **tap the "Lyra" logo 5 times** to trigger demo mode:
1. After 3 seconds, a mock match appears (Alex's profile)
2. Tap "Let's meet" to open the radar
3. Distance counts down from 100m to 0m over 20 seconds
4. Celebration overlay at < 5m

## Tech Stack

- Expo SDK 55 + TypeScript
- expo-router v5 (file-based routing)
- React Native SVG for radar visualization
- React Native built-in Animated API

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
│   └── login.tsx            # Apple Sign-In
├── (app)/
│   ├── _layout.tsx
│   ├── onboarding.tsx       # 8-question AI interview (app entry point)
│   ├── home.tsx             # Pulse waiting screen + demo trigger
│   ├── match/[id].tsx       # Match profile card
│   └── radar/[id].tsx       # Proximity radar
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
