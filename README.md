# MELLO
beli for spotify

36-hour schedule (realistic + not over-scoped)
Hours 0–3: Setup + scaffolding
* A: Expo app + routing + 3 blank screens DONE
* B: Next.js backend + environment variables + “health” endpoint


Hours 3–8: Get data flowing
* B: Spotify OAuth working → returns access token to app (or sets session cookie)
* B: /api/top-tracks returns tracks to app
* A: Display top tracks list (no ranking yet)
Checkpoint: you can log in and see tracks.


Hours 8–14: Ranking system
* A: Head-to-head UI (two cards + “Left/Right” buttons)
* A+B: Elo update function + store results locally
* A: My List screen shows Top 10 + 1–100 score
Checkpoint: core “Beli mechanic” works.


Hours 14–22: Recommendations (your differentiator)
* B: fetch audio features for candidate pool
* B: implement similarity + personalization blend
* A: Song Detail screen calls /api/recommend?songId=... and shows 3 songs + “why”
Checkpoint: click a ranked song → see 3 personalized suggestions.


Hours 22–28: Friends (keep it simple)
Choose one:
* Demo friends: ship with 2–3 seeded “friend profiles” (static JSON)
* Or Supabase if you’re confident (but riskier)
For hackathon safety: demo friends is fine if the UX looks real.


Hours 28–34: Polish + shareability
* A: “share card” view (screenshot-friendly Top 10)
* A: micro animations (score pop, confetti on Top 10 completion)
* B: caching + rate-limit guards


Hours 34–36: Demo script + bug fixes
* Practice the 60–90s demo:
    1. login → 2) rank 5 pairs → 3) show Top 10 → 4) click song → 5) recs + why → 6) friend list comparison
