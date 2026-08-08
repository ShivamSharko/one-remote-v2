"use client";
import React, { useEffect, useState } from "react";
import { COUNTRIES, PLATFORM_URLS, normalizeProvider, IMG_SMALL } from "./shared";

function OverlayCartridge({ item, onRemove, isReadOnly }: any) {
  const [bgColor, setBgColor] = useState("#e8e8d8");
  const [imgFailed, setImgFailed] = useState(false);
  const handleImageLoad = (e: any) => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = e.target;
      canvas.width = img.width || 50;
      canvas.height = img.height || 75;
      context?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = context?.getImageData(0, 0, canvas.width, canvas.height)?.data;
      if (!data) return;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        if (Math.max(pr, pg, pb) - Math.min(pr, pg, pb) > 40) { r += pr; g += pg; b += pb; count++; }
      }
      if (count === 0) for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
      if (count > 0) setBgColor(`rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`);
    } catch {}
  };
  return (
    <div className="famicom-cartridge" style={{ backgroundColor: bgColor }}>
      <div className="cart-spine"><span className="spine-text">{item.title}</span></div>
      {!isReadOnly && <button onClick={() => onRemove(item.id)} className="cart-remove">✕</button>}
      <div className="cart-label">
        <div className="cart-art-area">
          {item.posterPath && !imgFailed ? (
            <img crossOrigin="anonymous" src={`${IMG_SMALL}${item.posterPath}?cors=1`} alt="poster" className="cart-poster" onLoad={handleImageLoad} onError={() => setImgFailed(true)} />
          ) : (
            <div className="cart-poster" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#333" }}>?</div>
          )}
        </div>
        <div className="cart-title">{item.title}</div>
      </div>
      <div className="cart-grip"></div>
    </div>
  );
}

export function CRTOverlay({ boxRef, innerRef, watchlist, onAdd, onRemove, region, setRegion }: any) {
  const [powerOn, setPowerOn] = useState(true);
  const [view, setView] = useState<"input" | "loading" | "result">("input");
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [optimizeFor, setOptimizeFor] = useState("titles");
  const [apiError, setApiError] = useState("");
  const [rankedPlatforms, setRankedPlatforms] = useState<any[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);

  const pending = watchlist.filter((w: any) => !w.completed);

  useEffect(() => {
    if (inputValue.trim().length < 2) { setSearchResults([]); setApiError(""); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(inputValue)}&include_adult=false`);
        const data = await res.json();
        setApiError("");
        setSearchResults((data.results || []).filter((r: any) => r.media_type === "movie" || r.media_type === "tv").slice(0, 5));
      } catch { setApiError("NETWORK ERROR"); }
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  const calculate = async () => {
    if (pending.length === 0) return;
    setView("loading");
    setExpandedPlatform(null);
    try {
      const scores: any = {};
      const results = await Promise.all(pending.map((item: any) =>
        fetch(`/api/tmdb/${item.mediaType}/${item.id}?append_to_response=watch/providers`)
          .then((r) => r.json()).then((data) => ({ item, data }))
      ));
      results.forEach(({ item, data }) => {
        let mins = 0;
        if (item.mediaType === "movie") mins = data.runtime || 120;
        else {
          const ep = data.episode_run_time?.[0] || 45;
          mins = ep * (data.number_of_episodes || 1);
        }
        const provs = data["watch/providers"]?.results?.[region]?.flatrate || [];
        provs.forEach((prov: any) => {
          const name = normalizeProvider(prov.provider_name);
          if (!scores[name]) scores[name] = { provider: name, count: 0, totalMinutes: 0, items: [], logoPath: prov.logo_path };
          if (!scores[name].items.some((x: any) => x.id === item.id)) {
            scores[name].count += 1;
            scores[name].totalMinutes += mins;
            scores[name].items.push(item);
          }
        });
      });
      const arr = Object.values(scores).map((s: any) => ({ ...s, score: optimizeFor === "time" ? s.totalMinutes : s.count }));
      arr.sort((a: any, b: any) => b.score - a.score || (optimizeFor === "titles" ? b.totalMinutes - a.totalMinutes : b.count - a.count));
      setTimeout(() => { setRankedPlatforms(arr as any[]); setView("result"); }, 1500);
    } catch {
      setView("input");
      setApiError("CALCULATION ERROR: PLEASE TRY AGAIN");
    }
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed", left: -9999, top: 0, zIndex: 40,
        background: "transparent", border: "none", borderRadius: 0,
        overflow: "hidden", padding: 0, boxSizing: "border-box",
        animation: "crtIn 0.4s ease",
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: 760, height: 560, transformOrigin: "top left", position: "relative",
          backgroundColor: "rgba(8,12,20,0.35)",
          animation: "crtFlicker 2.4s infinite",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%), repeating-linear-gradient(to bottom, rgba(120,220,255,0.06) 0 1px, rgba(0,0,0,0) 1px 4px), repeating-linear-gradient(to bottom, rgba(180,190,200,0.10) 0 2px, rgba(0,0,0,0.28) 2px 4px)",
        }}
      >
        <button
          className="pwr-button"
          style={{
            position: "absolute", top: "auto", bottom: 12, right: 14, width: 52, height: 30, fontSize: "1rem", zIndex: 30,
            animation: powerOn ? "none" : "pwrBlink 1.1s steps(2, start) infinite",
            boxShadow: powerOn ? "0 0 12px rgba(255,60,60,0.9)" : "0 0 4px rgba(255,60,60,0.4)",
          }}
          onClick={() => setPowerOn(!powerOn)}
        >
          PWR
        </button>
        {!powerOn ? (
          <div style={{ position: "absolute", inset: 0, background: "#000" }}>
            <div style={{ position: "absolute", inset: 0, background: "#dff2ff", transformOrigin: "center center", animation: "crtOff 0.5s ease-in forwards" }} />
          </div>
        ) : (
          <div className="screen-content" style={{ position: "absolute", inset: 0, transformOrigin: "center center", animation: "crtOn 0.7s ease-out" }}>
            <div className="h-full flex flex-col justify-between">
              {view === "input" && (
                <>
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="screen-header">
                      <div>
                        <h1 className="glow-text" style={{ fontSize: "2.2rem" }}>AV-1</h1>
                        <span className="play-status" style={{ fontSize: "1.4rem" }}>PLAY ▶</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#4ade80", fontSize: "1.3rem" }}>{pending.length} PENDING</span>
                      </div>
                    </div>
                    <div className="region-select-group">
                      <span style={{ fontSize: "1.3rem", color: "#93c5fd" }}>REGION:</span>
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className="retro-select"
                          style={{ cursor: "pointer", textAlign: "left", minWidth: 220 }}
                          onClick={() => setRegionOpen(!regionOpen)}
                        >
                          {(COUNTRIES.find((c) => c.code === region)?.name || region)} ▾
                        </button>
                        {regionOpen && (
                          <div style={{
                            position: "absolute", right: 0, top: "110%", zIndex: 50,
                            background: "#0b1626", border: "2px solid #38bdf8", minWidth: 240,
                            boxShadow: "0 8px 20px rgba(0,0,0,0.7)",
                          }}>
                            {COUNTRIES.map((c) => (
                              <div
                                key={c.code}
                                onClick={() => { setRegion(c.code); setRegionOpen(false); }}
                                style={{
                                  padding: "6px 12px", cursor: "pointer",
                                  fontFamily: "'VT323', monospace", fontSize: "1.25rem",
                                  color: c.code === region ? "#eab308" : "#9fdcff",
                                  background: c.code === region ? "#1e3a5f" : "transparent",
                                }}
                              >
                                {c.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="optimize-group">
                      <span style={{ fontSize: "1.3rem", color: "#eab308" }}>SORT BY:</span>
                      <div className="flex gap-2">
                        <button type="button" className={`optimize-btn ${optimizeFor === "titles" ? "active" : ""}`} onClick={() => setOptimizeFor("titles")}>MAX TITLES</button>
                        <button type="button" className={`optimize-btn ${optimizeFor === "time" ? "active" : ""}`} onClick={() => setOptimizeFor("time")}>MAX WATCH TIME</button>
                      </div>
                    </div>
                    <div className="screen-body">
                      <p>ADD MOVIES / SHOWS:</p>
                      <div className="input-group" style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="retro-input"
                          placeholder="Type title..."
                          value={inputValue}
                          onChange={(e) => { setInputValue(e.target.value); setFocusedIndex(-1); }}
                          onKeyDown={(e) => {
                            if (searchResults.length === 0) return;
                            if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((p) => (p < searchResults.length - 1 ? p + 1 : p)); }
                            else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((p) => (p > 0 ? p - 1 : 0)); }
                            else if (e.key === "Enter" && focusedIndex >= 0) { e.preventDefault(); onAdd(searchResults[focusedIndex]); setInputValue(""); setSearchResults([]); setFocusedIndex(-1); }
                          }}
                        />
                        {searchResults.length > 0 && (
                          <div className="search-results-dropdown">
                            {searchResults.map((item, index) => (
                              <div
                                key={item.id}
                                onClick={() => { onAdd(item); setInputValue(""); setSearchResults([]); setFocusedIndex(-1); }}
                                className="search-result-item"
                                style={focusedIndex === index ? { backgroundColor: "#1e3a5f", color: "#38bdf8" } : {}}
                              >
                                <div className="search-result-info" style={{ display: "flex", alignItems: "center" }}>
                                  {item.poster_path ? (
                                    <img src={`${IMG_SMALL}${item.poster_path}`} alt="poster" className="poster-thumb" />
                                  ) : (
                                    <div className="poster-thumb flex items-center justify-center text-xs">?</div>
                                  )}
                                  <span>{item.title || item.name}</span>
                                </div>
                                <span className="result-media-type">{item.media_type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {apiError && <p style={{ color: "#ef4444", fontSize: "1.2rem" }}>{apiError}</p>}
                      <div className="watchlist-container">
                        {pending.map((item: any) => (
                          <OverlayCartridge key={item.id} item={item} onRemove={onRemove} isReadOnly={false} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {pending.length > 0 && (
                    <button onClick={calculate} className="calc-action-btn" style={{ width: "calc(100% - 64px)" }}>CALCULATE BEST SERVICE ▶</button>
                  )}
                </>
              )}
              {view === "loading" && (
                <div className="analog-loading-screen">
                  <div className="crt-snow"></div>
                  <div className="scanlines"></div>
                  <div className="vhs-tear tear-1"></div>
                  <div className="vhs-tear tear-2"></div>
                  <div className="vhs-tear tear-3"></div>
                  <div className="analog-text-fx w-full text-center font-mono px-4">
                    <div className="tracking-widest font-black leading-tight" style={{ fontSize: "3rem" }}>SCANNING {region}...</div>
                    <div className="tracking-widest font-black leading-tight mt-2" style={{ fontSize: "3rem" }}>SORTING BY {optimizeFor.toUpperCase()}</div>
                  </div>
                </div>
              )}
              {view === "result" && (
                <div className="flex flex-col items-center justify-start text-center w-full h-full pt-2 pb-2">
                  <h2 className="text-3xl text-slate-200 mb-1" style={{ textShadow: "2px 2px 0 #000" }}>🏆 HIGH SCORES 🏆</h2>
                  <p className="text-sm text-sky-400 mb-2 animate-pulse">SELECT A PLATFORM TO OPEN CARTRIDGE DRAWER</p>
                  <div className="leaderboard-container w-full px-2">
                    {rankedPlatforms.length > 0 ? (
                      rankedPlatforms.map((plat: any, idx: number) => (
                        <div key={plat.provider} className={`arcade-score-slot ${idx === 0 ? "rank-1-winner" : "rank-standard"} ${expandedPlatform === plat.provider ? "is-open" : ""}`}>
                          <div className="arcade-slot-header" onClick={() => setExpandedPlatform(expandedPlatform === plat.provider ? null : plat.provider)}>
                            <div className="arcade-slot-left">
                              <div className={`rank-badge ${idx === 0 ? "gold-badge" : "silver-badge"}`}>#{idx + 1}</div>
                              {plat.logoPath && <img src={`${IMG_SMALL}${plat.logoPath}`} alt={plat.provider} className="arcade-provider-logo" />}
                              <div className="arcade-name-group">
                                <span className="arcade-platform-name">{plat.provider}</span>
                                {idx === 0 && <span className="winner-tag">★ TOP MATCH ★</span>}
                              </div>
                            </div>
                            <div className="arcade-stats-group">
                              <div className="arcade-title-count">{plat.count} <span className="arcade-title-label">TITLES</span></div>
                              {plat.totalMinutes > 0 && <div className="arcade-time-count">~{Math.round(plat.totalMinutes / 60)} HRS</div>}
                            </div>
                          </div>
                          {expandedPlatform !== plat.provider ? (
                            <div className="expand-hint" onClick={() => setExpandedPlatform(plat.provider)}>▼ INSERT COIN TO VIEW ▼</div>
                          ) : (
                            <div className="expand-hint close-hint" onClick={() => setExpandedPlatform(null)}>▲ CLOSE DRAWER ▲</div>
                          )}
                          {expandedPlatform === plat.provider && (
                            <div className="expanded-stack-area">
                              <div className="media-stack">
                                {plat.items.map((item: any) => (
                                  <div className="stacked-item" key={item.id}>
                                    <OverlayCartridge item={item} onRemove={() => {}} isReadOnly={true} />
                                  </div>
                                ))}
                              </div>
                              <a
                                href={PLATFORM_URLS[plat.provider.toUpperCase()] || `https://www.google.com/search?q=${encodeURIComponent(plat.provider)}`}
                                target="_blank" rel="noopener noreferrer" className="go-to-app-btn"
                              >
                                LAUNCH APP ↗
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-red-400 text-xl font-bold border-4 border-red-500 bg-red-950">
                        SYSTEM ERROR:<br />NO SUBSCRIPTIONS FOUND IN REGION.
                      </div>
                    )}
                  </div>
                  <button onClick={() => setView("input")} className="retro-btn text-xl border-2 border-white" style={{ width: "calc(100% - 64px)", minHeight: 40 }}>
                    ◀ EDIT WATCHLIST
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}