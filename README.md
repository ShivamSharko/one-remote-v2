# 🎮 OneRemote v2 — The Walkable 3D Video Room

**One remote for all your streaming services.**

🔗 **Live demo:** https://one-remote-v2.vercel.app
📼 **Draft 1 (2D version):** https://one-remote-v1.vercel.app

## ❓ The Problem

1. **Wasted money** — people pay for 4–5 subscriptions but use only half of them.
2. **Decision fatigue** — too many choices. We scroll for 20 minutes and still watch nothing.

## ✅ The Fix

Add the movies/shows you want to watch, pick your country, and OneRemote tells you **the ONE subscription that has most of your list** (or the most watch time).

In v2, this tool lives inside a **3D video room you can walk around**.

## 📼 What You Can Do

- 🚶 **Walk in the room** — scroll to move: TV → shelf → board
- 📺 **Use the app on the 3D TV** — the full 2D app works inside the TV screen
- 🎞 **Touch the cartridges** — hover to look, click to mark as CLEARED
- 📌 **Read results on the board** — platforms are papers pinned on a cork board; click one to pull it out and read
- 🐟 **Old TV feel** — fisheye lens, small noise, dark corners (custom shader)
- 🌅 **Real-time window** — the sky outside matches your real time (or switch morning/day/evening/night)
- 💡 **Light switches** — lamp, shelf, board and poster lights on/off
- 📱 **Mobile friendly** — phones get their own camera path
- 🛡 **Safe API key** — the TMDB key stays on the server, never in the browser

## 🛠 Built With

- **Next.js (App Router)** + **TypeScript**
- **React Three Fiber** + **Three.js** + **@react-three/postprocessing**
- Custom GLSL shader for the fisheye lens
- All textures drawn with code (canvas) — no image files
- **TMDB API** for movies, posters and streaming providers

## 🗂 Code Structure

```
app/
├── page.tsx                    # 2D mode (Draft 1)
├── watched/page.tsx            # Checklist page (all / pending / cleared)
├── room/
│   ├── page.tsx                # Main room page: state, scroll, HUD
│   ├── RoomScene.tsx           # The 3D world: camera, furniture, shelf, board
│   ├── CRTOverlay.tsx          # The 2D app shown on the 3D TV
│   ├── ErrorBoundary.tsx       # If 3D fails, show a nice fallback page
│   └── shared.ts               # Shared helpers: textures, shader, camera path
└── api/tmdb/[...path]/route.ts # Server proxy that keeps the API key safe
```

## 🚀 Run It Locally

```
git clone https://github.com/ShivamSharko/one-remote-v2.git
cd one-remote-v2
npm install
# make a .env.local file with: TMDB_API_KEY=your_key_here
npm run dev
```

Open http://localhost:3000 and click **📼 3D ROOM**.

## Credits

- Data and posters: [TMDB](https://www.themoviedb.org)
- This product uses the TMDB API but is not endorsed or certified by TMDB.

---

Made with ❤️ and lots of VHS static.