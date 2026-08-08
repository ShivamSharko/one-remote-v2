"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Link from "next/link";
import { RoomScene } from "./RoomScene";
import { CRTOverlay } from "./CRTOverlay";
import ErrorBoundary from "./ErrorBoundary";
import { IMG, IMG_SMALL, PLATFORM_URLS, normalizeProvider, FisheyeEffect, DESKTOP_STOPS, MOBILE_STOPS } from "./shared";

export default function RoomPage() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 120);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const [timeOverride, setTimeOverride] = useState("auto");
  const TIMES = ["auto", "dawn", "day", "sunset", "night"];
  const cycleTime = () => setTimeOverride((t) => TIMES[(TIMES.indexOf(t) + 1) % TIMES.length]);

  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [region, setRegion] = useState("IN");
  const [ranked, setRanked] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(0);
  const [fisheye, setFisheye] = useState<any>(null);
  useEffect(() => {
    const fx = new FisheyeEffect();
    setFisheye(fx);
    return () => { try { fx.dispose(); } catch {} };
  }, []);
  const teleportRef = useRef<any>({ active: false, t: 1 });
  const computing = useRef(false);
  const tvBoxRef = useRef<HTMLDivElement | null>(null);
  const tvInnerRef = useRef<HTMLDivElement | null>(null);
  const [flight, setFlight] = useState<any>(null);
  const [zoomed, setZoomed] = useState(false);
  const [showList, setShowList] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lights, setLights] = useState<any>({ lamp: true, shelf: true, board: true, tv: true, posters: true });
  const toggleLight = (k: string) => setLights((s: any) => ({ ...s, [k]: !s[k] }));

  const openPaper = (plat: any, rank: number, rect: any, imgUrl: string) => {
    setFlight({ plat, rank, rect, imgUrl });
    setClosing(false);
    setZoomed(false);
    setShowList(false);
    setTimeout(() => setZoomed(true), 30);
    setTimeout(() => setShowList(true), 620);
  };
  const closePaper = () => {
    setShowList(false);
    setClosing(true);
    setZoomed(false);
    setTimeout(() => { setFlight(null); setClosing(false); }, 600);
  };

  useEffect(() => {
    setMounted(true);
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    try {
      const saved = localStorage.getItem("retro-watchlist");
      if (saved) setWatchlist(JSON.parse(saved));
    } catch (e) { console.warn("Storage blocked"); }
    const hs = document.documentElement.style, bs = document.body.style;
    const prev = { h: hs.height, o: hs.overflow, bh: bs.height, bo: bs.overflow };
    hs.height = "auto"; hs.overflowY = "auto"; hs.overflowX = "hidden"; bs.height = "auto"; bs.overflowY = "auto"; bs.overflowX = "hidden";
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scrollRef.current = p;
      setProgress(p);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      Object.assign(hs, { height: prev.h, overflow: prev.o });
      Object.assign(bs, { height: prev.bh, overflow: prev.bo });
    };
  }, []);

  useEffect(() => {
    fetch(`/api/tmdb/trending/movie/week`)
      .then((r) => r.json())
      .then((d) => setTrending((d.results || []).filter((x: any) => x.poster_path).slice(0, 5)
        .map((x: any) => ({ url: `${IMG}${x.poster_path}`, title: x.title }))));
  }, []);

  const save = (list: any[]) => { setWatchlist(list); try { localStorage.setItem("retro-watchlist", JSON.stringify(list)); } catch (e) {} };
  const onAdd = (item: any) => {
    if (watchlist.some((w) => w.id === item.id)) return;
    const rd = item.release_date || item.first_air_date || "";
    save([...watchlist, { id: item.id, title: item.title || item.name, mediaType: item.media_type, posterPath: item.poster_path, year: rd ? rd.substring(0, 4) : "Unknown", completed: false }]);
  };
  const onRemove = (id: number) => save(watchlist.filter((w) => w.id !== id));
  const onToggle = (id: number) => save(watchlist.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w)));

  const wallPosters = useMemo(() => {
    const recent = [...watchlist].reverse().filter((w) => w.posterPath).slice(0, 5)
      .map((w) => ({ url: `${IMG}${w.posterPath}`, title: w.title }));
    return recent.length > 0 ? recent : trending;
  }, [watchlist, trending]);

  const atBoard = progress > 0.8;
  useEffect(() => {
    if (!atBoard || computing.current) return;
    const pending = watchlist.filter((w) => !w.completed);
    if (pending.length === 0) { setRanked([]); return; }
    computing.current = true;
    (async () => {
      const scores: any = {};
      await Promise.all(pending.map(async (item) => {
        try {
          const res = await fetch(`/api/tmdb/${item.mediaType}/${item.id}?append_to_response=watch/providers`);
          const data = await res.json();
          let mins = 0;
          if (item.mediaType === "movie") mins = data.runtime || 120;
          else {
            const ep = data.episode_run_time?.[0] || 45;
            mins = ep * (data.number_of_episodes || 1);
          }
          const provs = data["watch/providers"]?.results?.[region]?.flatrate || [];
          provs.forEach((prov: any) => {
            const name = normalizeProvider(prov.provider_name);
            if (!scores[name]) scores[name] = { provider: name, count: 0, totalMinutes: 0, items: [] };
            if (!scores[name].items.some((x: any) => x.id === item.id)) {
              scores[name].items.push(item);
              scores[name].count += 1;
              scores[name].totalMinutes += mins;
            }
          });
        } catch {}
      }));
      const arr = Object.values(scores).sort((a: any, b: any) => b.count - a.count || b.totalMinutes - a.totalMinutes);
      setRanked(arr as any[]);
      computing.current = false;
    })();
  }, [atBoard, watchlist, region]);

  const atTV = progress >= 0.3 && progress <= 0.5;
  const captions = [
    { a: 0.0, b: 0.1, t: "📼 THE VIDEO ROOM", s: "SCROLL TO WALK IN" },
    { a: 0.54, b: 0.76, t: "THE SHELF", s: "HOVER A CARTRIDGE · CLICK TO MARK CLEARED" },
    { a: 0.86, b: 1.01, t: "THE BOARD", s: "CLICK A PAPER TO PULL IT OFF THE BOARD" },
  ];
  const zone = progress < 0.5 ? 0 : progress < 0.78 ? 1 : 2;
  const activeStops = isMobile ? MOBILE_STOPS : DESKTOP_STOPS;
  const go = (target: number) => {
    const stop = activeStops.find((s) => Math.abs(s.t - target) < 0.001) || activeStops[activeStops.length - 1];
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, target * max);
    scrollRef.current = target;
    setProgress(target);
    teleportRef.current = {
      active: true,
      t: 0,
      toPos: new THREE.Vector3().fromArray(stop.pos),
      toLook: new THREE.Vector3().fromArray(stop.look),
      toK: stop.k,
      toP: target,
    };
  };

  return (
    <div style={{ fontFamily: "'VT323', monospace" }}>
      <style>{`
        .room-hud { position: fixed; z-index: 60; pointer-events: none; }
        .room-hud a, .room-hud button { pointer-events: auto; }
        html, body { overflow-x: hidden !important; }
        ::-webkit-scrollbar:horizontal { display: none !important; height: 0 !important; }
        @keyframes crtIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes crtFlicker { 0%,100% { opacity: 1; } 92% { opacity: 0.96; } 96% { opacity: 0.99; } }
        @keyframes paperFlip { 0% { transform: rotateY(90deg); } 100% { transform: rotateY(0deg); } }
        @keyframes crtOn { 0% { transform: scale(1, 0.002); filter: brightness(5); opacity: 0; } 30% { transform: scale(1, 0.02); filter: brightness(5); opacity: 1; } 55% { transform: scale(1, 1); filter: brightness(2.2); } 70% { filter: brightness(0.7); } 82% { filter: brightness(1.7); } 100% { transform: scale(1, 1); filter: brightness(1); opacity: 1; } }
        @keyframes crtOff { 0% { transform: scale(1, 1); filter: brightness(1.5); opacity: 1; } 45% { transform: scale(1, 0.006); filter: brightness(4); opacity: 1; } 75% { transform: scale(0.03, 0.004); filter: brightness(6); opacity: 1; } 100% { transform: scale(0.001, 0.002); filter: brightness(0); opacity: 0; } }
        @keyframes pwrBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes paperFlipBack { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(90deg); } }
      `}</style>
      <div style={{ height: isMobile ? "2000vh" : "780vh" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {mounted && (
          <ErrorBoundary>
            <Canvas
              shadows
              dpr={[1, 1.75]}
              camera={{ fov: 80, near: 0.05, far: 30, position: [0, 1.55, 2.75] }}
              style={{ touchAction: "pan-y" }}
              onCreated={({ gl }) => { gl.toneMappingExposure = 0.9; }}
            >
              <RoomScene
                watchlist={watchlist} onToggle={onToggle} ranked={ranked} wallPosters={wallPosters}
                scrollRef={scrollRef} fisheye={fisheye} tvBoxRef={tvBoxRef} tvInnerRef={tvInnerRef} teleportRef={teleportRef} onOpen={openPaper} uiActive={atTV} isMobile={isMobile} lights={lights} kbShift={isMobile && kbOpen ? 0.45 : 0} timeOverride={timeOverride}
              />
            </Canvas>
          </ErrorBoundary>
        )}
      </div>
      {atTV && (
        <CRTOverlay
          boxRef={tvBoxRef} innerRef={tvInnerRef}
          watchlist={watchlist} onAdd={onAdd} onRemove={onRemove} region={region} setRegion={setRegion}
        />
      )}
      {flight && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, pointerEvents: "none" }}>
          <div
            onClick={closePaper}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", opacity: zoomed ? 1 : 0, transition: "opacity 0.4s", pointerEvents: showList ? "auto" : "none" }}
          />
          <div style={{
            position: "absolute",
            left: zoomed ? "50%" : flight.rect.left,
            top: zoomed ? "50%" : flight.rect.top,
            width: zoomed ? "min(600px, 92vw)" : flight.rect.width,
            height: zoomed ? "min(800px, 90vh)" : flight.rect.height,
            transform: zoomed ? "translate(-50%, -50%)" : "none",
            transition: "all 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
            perspective: "1200px",
            pointerEvents: "auto",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "#ddc08a",
              border: "4px solid #111",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              fontFamily: "'VT323', monospace",
              color: "#111",
              overflow: "hidden",
              animation: zoomed ? "paperFlip 0.7s cubic-bezier(0.3, 0.6, 0.3, 1)" : closing ? "paperFlipBack 0.2s ease-out" : "none",
            }}>
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#c22", boxShadow: "0 2px 4px rgba(0,0,0,0.5)", zIndex: 5 }} />
              <img src={flight.imgUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", opacity: zoomed ? 0 : 1, transition: "opacity 0.25s" }} />
              <div style={{ position: "absolute", inset: 0, opacity: zoomed ? 1 : 0, transition: "opacity 0.35s ease 0.2s", display: "flex", flexDirection: "column", padding: "26px 18px 14px", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #111", paddingBottom: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: "2rem", fontWeight: "bold" }}>#{flight.rank} {flight.plat.provider}</span>
                  <span style={{ fontSize: "1.4rem", color: "#8a1e1e" }}>{flight.plat.count} TITLES · ~{Math.round(flight.plat.totalMinutes / 60)} HRS</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start", paddingBottom: 8 }}>
                  {flight.plat.items.map((it: any) => (
                    <div key={it.id} style={{ width: 86, textAlign: "center" }}>
                      {it.posterPath ? (
                        <img src={`${IMG_SMALL}${it.posterPath}`} alt="" style={{ width: 86, height: 120, objectFit: "cover", border: "2px solid #111" }} />
                      ) : (
                        <div style={{ width: 86, height: 120, background: "#333", border: "2px solid #111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>?</div>
                      )}
                      <div style={{ fontSize: "1rem", lineHeight: 1.1, marginTop: 3 }}>{it.title || it.name}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={PLATFORM_URLS[flight.plat.provider.toUpperCase()] || `https://www.google.com/search?q=${encodeURIComponent(flight.plat.provider)}`}
                    target="_blank" rel="noopener noreferrer" className="go-to-app-btn" style={{ flex: 1, textAlign: "center" }}
                  >
                    LAUNCH APP ↗
                  </a>
                  <button onClick={closePaper} className="retro-btn" style={{ flex: 1, fontSize: "1.4rem" }}>◀ PIN BACK TO BOARD</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="room-hud" style={{ top: 12, left: 16, right: 16, display: "flex", justifyContent: "space-between", fontSize: "1.3rem" }}>
        <span style={{ color: "#eab308", textShadow: "2px 2px 0 #000" }}>📼 THE VIDEO ROOM</span>
        <span style={{ display: "flex", gap: 8 }}>
          <Link className="retro-btn" style={{ textDecoration: "none" }} href="/">2D MODE</Link>
          <Link className="retro-btn" style={{ textDecoration: "none" }} href="/watched">CHECKLIST</Link>
        </span>
      </div>

      <div className="room-hud" style={isMobile
        ? { bottom: 76, left: 0, right: 0, display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "nowrap", overflowX: "auto", paddingInline: 6, whiteSpace: "nowrap" }
        : { left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        {!isMobile && <span style={{ fontSize: "1.1rem", color: "#9fdcff", textShadow: "2px 2px 0 #000" }}>LIGHTS</span>}
        {[{ k: "lamp", l: "💡 LAMP" }, { k: "shelf", l: "🎞 SHELF" }, { k: "board", l: "📌 BOARD" }, { k: "posters", l: "🖼 POSTERS" }].map((s: any) => (
          <button
            key={s.k}
            onClick={() => toggleLight(s.k)}
            style={{
              fontFamily: "'VT323', monospace", fontSize: isMobile ? "0.82rem" : "1.05rem", padding: isMobile ? "1px 5px" : "2px 10px", cursor: "pointer", flexShrink: 0,
              background: lights[s.k] ? "#eab308" : "#111", color: lights[s.k] ? "#000" : "#66788a",
              border: "2px solid #38bdf8", boxShadow: lights[s.k] ? "0 0 10px rgba(234,179,8,0.5)" : "none",
            }}
          >
            {s.l} {lights[s.k] ? "ON" : "OFF"}
          </button>
        ))}
        <button
          onClick={cycleTime}
          style={{
            fontFamily: "'VT323', monospace", fontSize: isMobile ? "0.82rem" : "1.05rem", padding: isMobile ? "1px 5px" : "2px 10px", cursor: "pointer", flexShrink: 0,
            background: "#111", color: "#9fdcff", border: "2px solid #38bdf8",
          }}
        >
          🕐 {timeOverride === "auto" ? "AUTO" : timeOverride.toUpperCase()}
        </button>
      </div>

      <div className="room-hud" style={{ bottom: 26, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
        {[{ l: "📺 TV", t: 0.4 }, { l: "🎞 SHELF", t: 0.72 }, { l: "📌 BOARD", t: 1.0 }].map((b, i) => (
          <button
            key={i}
            onClick={() => go(b.t)}
            style={{
              fontFamily: "'VT323', monospace", fontSize: "1.2rem", padding: "4px 16px", cursor: "pointer",
              background: zone === i ? "#eab308" : "#111", color: zone === i ? "#000" : "#9fdcff",
              border: `2px solid ${zone === i ? "#eab308" : "#38bdf8"}`, boxShadow: "0 0 10px rgba(56,189,248,0.3)",
            }}
          >
            {b.l}
          </button>
        ))}
      </div>
      {captions.map((c, i) => {
        const o = progress >= c.a && progress <= c.b ? 1 : 0;
        return (
          <div key={i} className="room-hud" style={{ bottom: "14%", left: 0, right: 0, textAlign: "center", opacity: o, transition: "opacity 0.6s" }}>
            <div style={{ fontSize: "2.6rem", color: "#fff", textShadow: "0 0 12px #38bdf8, 2px 2px 0 #000" }}>{c.t}</div>
            <div style={{ fontSize: "1.4rem", color: "#9fdcff", textShadow: "2px 2px 0 #000" }}>{c.s}</div>
          </div>
        );
      })}
    </div>
  );
}