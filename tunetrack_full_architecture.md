# 🎵 TuneTrack — Full Architecture & Design Document

## 1. Overview

TuneTrack is a mobile-first, multiplayer web-based party game where players place songs into a chronological timeline.

Players:
- Join via browser
- Listen to music
- Build their own timeline
- Compete using placement + token mechanics

Core characteristics:
- Real-time multiplayer (WebSocket)
- Server-authoritative state
- Mobile-first UX
- PWA-ready
- Designed for extensibility

---

## 2. Vision

Create a **frictionless, social, highly tactile music party experience** that:
- Feels better than physical card versions
- Requires zero install
- Scales from local party → online multiplayer

---

## 3. Core Principles

### Gameplay
- Fast turns
- Social interaction
- Hidden information until reveal
- Fair competitive mechanics

### UX
- Touch-first
- Focused interactions
- Smooth animations
- Readability > decoration

### Engineering
- Clean architecture
- SOLID principles
- Server-authoritative logic
- Modular + extensible

---

## 4. Technology Stack

### Frontend
- React + TypeScript
- Vite
- Framer Motion
- PWA (optional early)

### Backend
- Node.js + TypeScript
- Socket.IO

### Storage
- MVP: In-memory
- Future: Redis / PostgreSQL

---

## 5. Architecture Overview

Client → WebSocket → Game Server → Game Engine → Repositories → Playback

Server is source of truth.

---

## 6. Module Breakdown

### Game Engine
- Pure logic
- No framework dependencies
- Handles rules

### Room System
- Player sessions
- Room lifecycle
- Host logic

### Realtime Gateway
- Socket events
- Broadcasting

### Playback
- Abstract providers
- Host-controlled MVP

### Deck System
- Playlist ingestion
- Track normalization

### Repositories
- Abstract storage
- Replaceable

---

## 7. Frontend Structure

```
src/
  app/
  pages/
  features/
  components/
  hooks/
  services/
  types/
  utils/
```

Feature folders:
- lobby
- game
- timeline
- tokens
- challenge
- host-controls

---

## 8. Game Flow

Lobby → Start → Turn Loop → Reveal → End

Turn:
1. Playback starts
2. Player places card
3. Confirm
4. Challenge window
5. Reveal
6. Resolve
7. Next turn

---

## 9. Timeline UX

- Horizontal scroll
- Center focus
- Drag card
- Snap slots
- Auto-shift cards
- Confirm placement

Card sizing:
- Center: large
- Near: medium
- Far: small

---

## 10. Token System

Manual for MVP.

Actions:
- Skip (1 token)
- Buy card (3 tokens)
- Challenge opponent

Challenge:
- First click wins
- Challenger places card
- Reveal resolves

---

## 11. Playback Design

MVP:
- Host-controlled Spotify playback
- Shared audio output

Future:
- YouTube provider
- Per-client playback

---

## 12. WebSocket Events

Client → Server:
- join_room
- start_game
- place_card
- confirm
- challenge
- skip
- award_token

Server → Client:
- state_update
- turn_start
- reveal
- challenge_start
- game_end

---

## 13. State Model

RoomState:
- players
- hostId
- currentTurn
- deck
- currentCard
- timelines
- tokens
- status

---

## 14. SOLID

- SRP: each module single responsibility
- OCP: providers extendable
- DIP: use interfaces
- ISP: small contracts
- LSP: interchangeable modules

---

## 15. Code Quality Rules

- Meaningful names
- No short variables
- Small functions
- Separation of concerns
- Feature-based structure

---

## 16. Animation Guidelines

Use Framer Motion.

Focus:
- Snap feeling
- Smooth transitions
- Reveal excitement

Avoid:
- Over-animation
- Confusing motion

---

## 17. PWA

- Installable
- Fullscreen
- Fast load
- Mobile UX

---

## 18. Future Expansion

- Accounts
- Leaderboards
- Remote play
- DB persistence
- More playback providers

---

## 19. Non-Goals

- No accounts
- No matchmaking
- No DB
- No per-client playback

---

## 20. MVP Definition

- Multiplayer works
- Timeline smooth
- Gameplay complete
- Tokens work
- Host playback works

---

## 21. Development Strategy

Monthly cycles:
- Plan
- Build
- Refine
- Polish

Focus:
- Finishable scope
- Iterative improvement

---

# End of Document
