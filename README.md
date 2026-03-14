# Lyra - Frontend

Proximity-based dating app. No swiping — an AI interviews users to build personality profiles, then notifies them when a compatible match is physically nearby. One approves, the other opens a live GPS radar, and they walk toward each other.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/(auth)/login` | Apple Sign-In (mocked for demo) |
| Onboarding | `/(app)/onboarding` | Name, age, gender, orientation |
| AI Interview | `/(app)/interview` | Chat UI with simulated personality questions |
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
├── index.tsx                # Entry → redirects to home
├── (auth)/
│   ├── _layout.tsx
│   └── login.tsx            # Apple Sign-In
├── (app)/
│   ├── _layout.tsx
│   ├── home.tsx             # Pulse waiting screen + demo trigger
│   ├── onboarding.tsx       # Profile setup
│   ├── interview.tsx        # AI chat interview
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
- **Audio proximity beep** — `expo-av` (removed temporarily due to SDK 55 build issue)

### Supabase Tables Needed
- `profiles` — id, name, age, gender, orientation, photos, personality_summary, embedding, push_token
- `matches` — id, user_a, user_b, status, created_at (Realtime enabled)
- `locations` — user_id, latitude, longitude, updated_at (Realtime enabled)
- `avatars` storage bucket
