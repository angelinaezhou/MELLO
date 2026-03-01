# 🎵 Mello

> **Rank your music taste. Discover what you actually love.**

Mello uses head-to-head song battles and real ML inference to build a mathematically precise map of your music taste — then uses it to recommend songs you'll love and blend your taste with friends.

---

## The Problem

Spotify has 100 million songs and recommends the same 20 to everyone. It tracks what you *play*, not what you *love*. There's no way to say "I'm obsessed with this" versus "it was just on in the background."

Mello fixes that.

---

## How It Works

### 1. Elo Ranking
We show you two songs. You pick one. Under the hood, we run an **Elo rating system** — the same algorithm used to rank chess grandmasters — to build a ranked preference map from your choices. Not listening history. Actual ranked preference data.

### 2. GPU Embedding via Modal
Every song you rank gets converted into an **embedding vector** — a mathematical fingerprint of its sonic identity — computed live on **Modal's GPU infrastructure** using `sentence-transformers`. Real ML inference, not API calls.

### 3. Persistent Taste Profiles via Supermemory
Your taste vector is stored in **Supermemory** and evolves with every ranking session. Mello doesn't just know who you are today — it knows who you're becoming.

### 4. Cosine Similarity Recommendations
When you hit the Recs tab, we pull your Spotify top 50, embed them all, and find the songs closest to your taste vector. Every recommendation shows a **real cosine similarity score** and explains exactly why: *"Matches the style of Cruel Summer by Taylor Swift."*

### 5. Taste Codes & Vector Blending
Every user gets an 8-character taste code. Share it with a friend, they enter it in the app, and we **blend your embedding vectors** — literally average your taste signatures in high-dimensional space — and surface music that lives in the intersection. Songs you'd both love that neither of you would've found alone.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Backend | Next.js (deployed on Vercel) |
| Auth | Spotify OAuth via custom auth server |
| ML Inference | Modal (GPU, `sentence-transformers/all-MiniLM-L6-v2`) |
| Memory | Supermemory (persistent taste profiles) |
| Music Data | Spotify Web API |
| Local Storage | Expo SecureStore |

---

## Project Structure

```
MELLO/
├── mobile/                  # React Native (Expo) app
│   ├── app/
│   │   ├── index.tsx        # Auth & onboarding
│   │   ├── add.tsx          # Head-to-head song ranking
│   │   ├── list.tsx         # Elo-ranked song list
│   │   ├── recs.tsx         # ML-powered recommendations
│   │   ├── friends.tsx      # Taste codes & blended recs
│   │   └── share.tsx        # Shareable taste card
│   ├── context/
│   │   └── userContext.tsx  # Global user state
│   ├── hooks/
│   │   └── useSpotifyAuth.ts # Token management & refresh
│   └── utils/
│       └── storage.ts       # Elo ranking logic & persistence
│
├── backend/                 # Next.js API (Vercel)
│   └── src/app/api/
│       ├── auth/spotify/    # OAuth + token refresh
│       ├── openai/recommend/ # Recommendation endpoint
│       └── memory/          # Supermemory read/write
│
└── modal/
    └── recommend.py         # GPU embedding inference
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Python 3.10+ (for Modal)
- A Spotify Developer account
- A Modal account
- A Supermemory account

### 1. Clone the repo

```bash
git clone https://github.com/your-username/mello.git
cd mello
```

### 2. Deploy the Modal inference function

```bash
cd modal
pip install modal sentence-transformers numpy
modal token new
modal deploy recommend.py
```

Copy the deployed endpoint URL — you'll need it for the backend.

### 3. Set up the backend

```bash
cd backend
npm install
```

Create a `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=your_redirect_uri
SUPERMEMORY_API_KEY=your_supermemory_key
MODAL_ENDPOINT=https://your-modal-endpoint.modal.run
```

```bash
npm run dev        # or deploy to Vercel
```

### 4. Run the mobile app

```bash
cd mobile
npm install
npx expo start --clear
```

Scan the QR code with Expo Go on your phone.

> ⚠️ If your Spotify app is in Development Mode, add your Spotify account email at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Your App → Settings → User Management.

---

## Key Features

- **Head-to-head ranking** — swipe-style battles that reveal true preference
- **Elo scoring** — mathematically rigorous ranking that converges fast
- **Match percentages** — real cosine similarity scores, not vibes
- **Song-level explanations** — "Similar energy to X by Y"
- **Taste codes** — 8-character codes for social sharing
- **Vector blending** — mathematical average of two taste profiles in embedding space
- **Historical memory** — taste profiles evolve across sessions
- **Shareable cards** — beautiful dark-mode taste card with your top 10

---

## How the Recommendation Engine Works

```
User ranks songs via Elo
        ↓
Top 10 ranked songs → Modal GPU
        ↓
sentence-transformers embeds song names/artists
        ↓
Compute mean embedding vector (user taste vector)
        ↓
Spotify top 50 tracks → Modal GPU (embed all candidates)
        ↓
Cosine similarity: taste vector vs each candidate
        ↓
Sort by score, return top 10 with explanations
```

For friend blending:
```
User taste vector (50%) + Friend taste vector (50%)
        ↓
Blended vector → cosine similarity against candidates
        ↓
Recommendations both users would love
```

---

## Team

Built at HackIllinois 2026.

