"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

// ==========================================
// CONSTANTS
// ==========================================

const PLATFORM_URLS: Record<string, string> = {
  'NETFLIX': 'https://www.netflix.com',
  'JIOHOTSTAR': 'https://www.hotstar.com',
  'AMAZON PRIME VIDEO': 'https://www.primevideo.com',
  'PRIME VIDEO': 'https://www.primevideo.com',
  'DISNEY+ HOTSTAR': 'https://www.hotstar.com',
  'APPLE TV+': 'https://tv.apple.com',
  'HULU': 'https://www.hulu.com',
  'HBOMAX': 'https://www.max.com',
  'MAX': 'https://www.max.com',
};

const COUNTRIES = [
  { code: "US", name: "🇺🇸 UNITED STATES" },
  { code: "GB", name: "🇬🇧 UNITED KINGDOM" },
  { code: "CA", name: "🇨🇦 CANADA" },
  { code: "IN", name: "🇮🇳 INDIA" },
  { code: "AU", name: "🇦🇺 AUSTRALIA" },
];

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w92";

// ==========================================
// COMPONENT: CARTRIDGE
// ==========================================
function Cartridge({ item, onRemove, IMAGE_BASE_URL, isReadOnly }: any) {
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

      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData?.data;
      if (!data) return;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];
        const max = Math.max(pr, pg, pb);
        const min = Math.min(pr, pg, pb);
        
        if (max - min > 40) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }

      if (count === 0) {
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count > 0) {
        setBgColor(`rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`);
      }
    } catch (err) {
      console.error("Could not extract color", err);
    }
  };

  return (
    <div 
      className="famicom-cartridge" 
      style={{ backgroundColor: bgColor, transition: "background-color 0.5s ease" }}
    >
      <div className="cart-spine">
        <span className="spine-text">{item.title || item.name}</span>
      </div>

      {!isReadOnly && (
        <button onClick={() => onRemove(item.id)} className="cart-remove">
          ✕
        </button>
      )}

      <div className="cart-label">
        <div className="cart-art-area">
          {item.posterPath && !imgFailed ? (
            <img
              crossOrigin="anonymous"
              src={`${IMAGE_BASE_URL}${item.posterPath}?cors=1`}
              alt="poster"
              className="cart-poster"
              onLoad={handleImageLoad}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div 
              className="cart-poster" 
              style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#333" }}
            >
              ?
            </div>
          )}
        </div>
        <div className="cart-title">{item.title}</div>
      </div>
      
      <div className="cart-grip"></div>
    </div>
  );
}

// ==========================================
// COMPONENT: MAIN APP (RetroTVScreen)
// ==========================================
export default function RetroTVScreen() {
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [appState, setAppState] = useState("input");
  
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [selectedRegion, setSelectedRegion] = useState("IN");
  const [optimizeFor, setOptimizeFor] = useState("titles");
  const [apiError, setApiError] = useState("");
  
  const [rankedPlatforms, setRankedPlatforms] = useState<any[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // --- EFFECTS ---
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem("retro-watchlist");
      if (saved) setWatchlist(JSON.parse(saved));
    } catch (e) {
      console.warn("Storage blocked on this network");
    }
    try {
      if (!localStorage.getItem("oneremote-intro-seen")) setShowIntro(true);
    } catch {}
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("retro-watchlist", JSON.stringify(watchlist));
      } catch (e) {
        console.warn("Storage blocked");
      }
    }
  }, [watchlist, isLoaded]);

  // 💥 NATIVE BACK AND FORWARD BUTTON LISTENER
  useEffect(() => {
    const handlePopState = () => {
      const isShowingResultsURL = window.location.hash === "#results";

      if (isShowingResultsURL && appState !== "result") {
        setAppState("result");
      } 
      else if (!isShowingResultsURL && appState === "result") {
        setAppState("input");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [appState]);

  useEffect(() => {
    if (!inputValue.trim() || inputValue.length < 2) {
      setSearchResults([]);
      setApiError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(inputValue)}&include_adult=false`);

        if (!res.ok) {
          setApiError("INVALID API KEY OR LIMIT");
          searchResults.length > 0 && setSearchResults([]);
          return;
        }

        const data = await res.json();
        setApiError("");

        if (data.results) {
          const validMedia = data.results.filter(
            (item: any) => item.media_type === "movie" || item.media_type === "tv"
          );
          setSearchResults(validMedia.slice(0, 5));
        }
      } catch (err) {
        setApiError("NETWORK ERROR");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // --- HANDLERS ---
  const handleSelectShow = (item: any) => {
    const title = item.title || item.name;
    
    const releaseDate = item.release_date || item.first_air_date || "";
    const year = releaseDate ? releaseDate.substring(0, 4) : "Unknown";
    
    if (watchlist.some((w) => w.id === item.id)) return;

    const updatedList = [
      ...watchlist,
      {
        id: item.id,
        title,
        mediaType: item.media_type,
        posterPath: item.poster_path,
        year: year,
        completed: false,
      },
    ];

    setWatchlist(updatedList);
    
    setInputValue("");
    setSearchResults([]);
    setFocusedIndex(-1);
  };

  const handleRemoveShow = (idToRemove: number) => {
    const updated = watchlist.filter((item) => item.id !== idToRemove);
    setWatchlist(updated);
  };

  const pendingWatchlist = watchlist.filter(item => !item.completed);

  const calculateBestPlatform = async () => {
    if (pendingWatchlist.length === 0) return;
    
    setAppState("loading");
    setExpandedPlatform(null);

    try {
      const providerScores: any = {};

      const fetchPromises = pendingWatchlist.map((item) =>
        fetch(`/api/tmdb/${item.mediaType}/${item.id}?append_to_response=watch/providers`)
          .then((res) => res.json())
          .then((data) => ({ item, data }))
      );

      const results = await Promise.all(fetchPromises);

      results.forEach(({ item, data }) => {
        let itemRuntime = 0;
        
        if (item.mediaType === "movie") {
          itemRuntime = data.runtime || 120;
        } else {
          const epTime = data.episode_run_time && data.episode_run_time.length > 0 ? data.episode_run_time[0] : 45;
          const eps = data.number_of_episodes || 1;
          itemRuntime = epTime * eps;
        }

        const regionData = data["watch/providers"]?.results?.[selectedRegion];
        const providers = regionData?.flatrate || [];
        const justWatchLink = regionData?.link || "";

        providers.forEach((prov: any) => {
          const rawN = String(prov.provider_name).toUpperCase();
          let name = rawN;
          if (rawN.includes("NETFLIX")) name = "NETFLIX";
          else if (rawN.includes("AMAZON PRIME") || rawN.includes("PRIME VIDEO")) name = "AMAZON PRIME VIDEO";
          else if (rawN.includes("APPLE TV")) name = "APPLE TV+";
          else if (rawN.includes("PARAMOUNT")) name = "PARAMOUNT+";
          else if (rawN.includes("HBO") || rawN.includes("MAX")) name = "MAX";
          else if (rawN.includes("CRUNCHYROLL")) name = "CRUNCHYROLL";
          else if (rawN.includes("JIO")) name = "JIOHOTSTAR";
          else if (rawN.includes("DISNEY") || rawN.includes("HOTSTAR")) name = "DISNEY+ HOTSTAR";
          else if (rawN.includes("HULU")) name = "HULU";
          else if (rawN.includes("PEACOCK")) name = "PEACOCK";
          else if (rawN.includes("STARZ")) name = "STARZ";
          else if (rawN.includes("SHOWTIME")) name = "SHOWTIME";
          else if (rawN.includes("SONY LIV")) name = "SONY LIV";
          else if (rawN.includes("ZEE5")) name = "ZEE5";
          else if (rawN.includes("MUBI")) name = "MUBI";
          else if (rawN.includes("AMAZON")) name = "AMAZON PRIME VIDEO";
          else if (rawN.includes(" CHANNEL")) name = rawN.split(" CHANNEL")[0];

          if (!providerScores[name]) {
            providerScores[name] = {
              count: 0,
              totalMinutes: 0,
              items: [],
              logoPath: prov.logo_path,
              link: justWatchLink,
            };
          }
          
          const isAlreadyAdded = providerScores[name].items.some((existingItem: any) => existingItem.id === item.id);
          
          if (!isAlreadyAdded) {
            providerScores[name].count += 1;
            providerScores[name].totalMinutes += itemRuntime;
            providerScores[name].items.push(item);
          }
        });
      });

      const rankedArray = Object.entries(providerScores).map(([provider, stats]: any) => ({
        provider,
        count: stats.count,
        totalMinutes: stats.totalMinutes,
        items: stats.items,
        logoPath: stats.logoPath,
        link: stats.link,
        score: optimizeFor === "time" ? stats.totalMinutes : stats.count,
      }));

      rankedArray.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; 
        }
        if (optimizeFor === "titles") {
          return b.totalMinutes - a.totalMinutes;
        }
        return b.count - a.count;
      });

      setTimeout(() => {
        setRankedPlatforms(rankedArray);
        try { if (window.location.hash !== "#results") window.history.pushState(null, "", "#results"); } catch(e) {}
        setAppState("result");
      }, 1500);

    } catch (err) {
      setAppState("input");
      setApiError("CALCULATION ERROR: PLEASE TRY AGAIN");
    }
  };

  return (
    <div className="tv-container">
      {showIntro && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0b1626", border: "3px solid #eab308", boxShadow: "0 0 30px rgba(234,179,8,0.45)", padding: "18px 16px", maxWidth: 430, fontFamily: "'VT323', monospace", color: "#9fdcff", textAlign: "center" }}>
            <div style={{ fontSize: "2.2rem", color: "#eab308", textShadow: "2px 2px 0 #000" }}>🎮 ONEREMOTE</div>
            <div style={{ fontSize: "1.4rem", marginTop: 4, color: "#fff" }}>One remote to rule every streaming service.</div>
            <div style={{ fontSize: "1.25rem", marginTop: 12, textAlign: "left", lineHeight: 1.4 }}>
              1️⃣ ADD your movies / shows<br />
              2️⃣ PICK your country<br />
              3️⃣ CALCULATE → we reveal the ONE subscription that covers the most titles!
            </div>
            <button
              onClick={() => { setShowIntro(false); try { localStorage.setItem("oneremote-intro-seen", "1"); } catch {} }}
              className="retro-btn"
              style={{ marginTop: 14, fontSize: "1.5rem", padding: "6px 20px", cursor: "pointer" }}
            >
              ▶ GOT IT
            </button>
          </div>
        </div>
      )}
      <div className="tv-screen">
        <motion.div
          initial={{ scaleX: 0, scaleY: 0.005, opacity: 0 }}
          animate={
            isPowerOn
              ? {
                  scaleX: [0, 1, 1],
                  scaleY: [0.005, 0.005, 1],
                  opacity: [1, 1, 1],
                  backgroundColor: ["#ffffff", "#ffffff", "#101d2e"],
                }
              : { scaleX: 0, scaleY: 0, opacity: 0 }
          }
          transition={{ duration: 0.6, times: [0, 0.4, 1], ease: "easeOut" }}
          className="screen-content"
        >
          {isPowerOn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="h-full flex flex-col justify-between"
            >
              
              {appState === "input" && (
                <>
                  <div className="flex flex-col flex-1 min-h-0">
                    
                    <div className="screen-header">
                      <div>
                        <h1 className="glow-text">AV-1</h1>
                        <span className="play-status">PLAY ▶</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Link href="/room" className="retro-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center", background: "#eab308", color: "#000" }}>
                          📼 3D ROOM
                        </Link>
                        <Link href="/watched" className="retro-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
                          ✔ CHECKLIST
                        </Link>
                      </div>
                    </div>
                    <div className="tagline" style={{ textAlign: "center", fontSize: "1.15rem", color: "#7dd3fc", padding: "2px 12px 0", textShadow: "1px 1px 0 #000" }}>
                      Add your watchlist → we find the ONE subscription that has it all.
                    </div>

                    <div className="region-select-group">
                      <span style={{ fontSize: "1.4rem", color: "#93c5fd" }}>REGION:</span>
                      <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="retro-select"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="optimize-group">
                      <span style={{ fontSize: "1.4rem", color: "#eab308" }}>SORT BY:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`optimize-btn ${optimizeFor === "titles" ? "active" : ""}`}
                          onClick={() => setOptimizeFor("titles")}
                        >
                          MAX TITLES
                        </button>
                        <button
                          type="button"
                          className={`optimize-btn ${optimizeFor === "time" ? "active" : ""}`}
                          onClick={() => setOptimizeFor("time")}
                        >
                          MAX WATCH TIME
                        </button>
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
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setFocusedIndex(-1);
                          }}
                          onKeyDown={(e) => {
                            if (searchResults.length === 0) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                            } else if (e.key === "Enter" && focusedIndex >= 0) {
                              e.preventDefault();
                              handleSelectShow(searchResults[focusedIndex]);
                              setFocusedIndex(-1);
                            }
                          }}
                        />

                        {searchResults.length > 0 && (
                          <div className="search-results-dropdown">
                            {searchResults.map((item, index) => (
                              <div
                                key={item.id}
                                onClick={() => handleSelectShow(item)}
                                className="search-result-item"
                                style={focusedIndex === index ? { backgroundColor: "#1e3a5f", color: "#38bdf8" } : {}}
                              >
                                <div className="search-result-info">
                                  {item.poster_path ? (
                                    <img
                                      src={`${IMAGE_BASE_URL}${item.poster_path}`}
                                      alt="poster"
                                      className="poster-thumb"
                                    />
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

                      {apiError && <p style={{ color: "#ef4444", fontSize: "1.4rem" }}>{apiError}</p>}

                      <div className="watchlist-container">
                        {pendingWatchlist.map((item) => (
                          <Cartridge
                            key={item.id}
                            item={item}
                            onRemove={handleRemoveShow}
                            IMAGE_BASE_URL={IMAGE_BASE_URL}
                            isReadOnly={false}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="calc-row" style={{ padding: "12px 16px 12px" }}>
                    {pendingWatchlist.length > 0 && (
                      <button onClick={calculateBestPlatform} className="calc-action-btn" style={{ width: "100%", margin: 0 }}>
                        CALCULATE BEST SERVICE ▶
                      </button>
                    )}
                  </div>
                </>
              )}

              {appState === "loading" && (
                <div className="analog-loading-screen">
                  <div className="crt-snow"></div>
                  <div className="scanlines"></div>
                  <div className="vhs-tear tear-1"></div>
                  <div className="vhs-tear tear-2"></div>
                  <div className="vhs-tear tear-3"></div>
                  
                  <div className="analog-text-fx w-full text-center font-mono px-4">
                    <div 
                      className="tracking-widest font-black leading-tight"
                      style={{ fontSize: "clamp(2rem, 4vw, 6rem)" }}
                    >
                      SCANNING {selectedRegion}...
                    </div>
                    
                    <div 
                      className="tracking-widest font-black leading-tight mt-2"
                      style={{ fontSize: "clamp(2rem, 4vw, 6rem)" }}
                    >
                      SORTING BY {optimizeFor.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              {appState === "result" && (
                <div className="flex flex-col items-center justify-start text-center w-full h-full pt-4 pb-2">
                  <h2 className="text-4xl text-slate-200 mb-1" style={{ textShadow: "2px 2px 0 #000" }}>
                    🏆 HIGH SCORES 🏆
                  </h2>
                  <p className="text-sm text-sky-400 mb-4 animate-pulse">
                    SELECT A PLATFORM TO OPEN CARTRIDGE DRAWER
                  </p>

                  <div className="leaderboard-container w-full px-2">
                    {rankedPlatforms.length > 0 ? (
                      rankedPlatforms.map((plat, idx) => (
                        <div
                          key={plat.provider}
                          className={`arcade-score-slot ${idx === 0 ? "rank-1-winner" : "rank-standard"} ${
                            expandedPlatform === plat.provider ? "is-open" : ""
                          }`}
                        >
                          <div
                            className="arcade-slot-header"
                            onClick={() =>
                              setExpandedPlatform(expandedPlatform === plat.provider ? null : plat.provider)
                            }
                          >
                            <div className="arcade-slot-left">
                              <div className={`rank-badge ${idx === 0 ? "gold-badge" : "silver-badge"}`}>
                                #{idx + 1}
                              </div>
                              
                              {plat.logoPath && (
                                <img
                                  src={`${IMAGE_BASE_URL}${plat.logoPath}`}
                                  alt={plat.provider}
                                  className="arcade-provider-logo"
                                />
                              )}
                              
                              <div className="arcade-name-group">
                                <span className="arcade-platform-name">{plat.provider}</span>
                                {idx === 0 && <span className="winner-tag">★ TOP MATCH ★</span>}
                              </div>
                            </div>

                            <div className="arcade-stats-group">
                              <div className="arcade-title-count">
                                {plat.count} <span className="arcade-title-label">TITLES</span>
                              </div>
                              {plat.totalMinutes > 0 && (
                                <div className="arcade-time-count">~{Math.round(plat.totalMinutes / 60)} HRS</div>
                              )}
                            </div>
                          </div>

                          {!expandedPlatform || expandedPlatform !== plat.provider ? (
                            <div
                              className="expand-hint"
                              onClick={() => setExpandedPlatform(plat.provider)}
                            >
                              ▼ INSERT COIN TO VIEW ▼
                            </div>
                          ) : (
                            <div
                              className="expand-hint close-hint"
                              onClick={() => setExpandedPlatform(null)}
                            >
                              ▲ CLOSE DRAWER ▲
                            </div>
                          )}

                          {expandedPlatform === plat.provider && (
                            <div className="expanded-stack-area">
                              <div className="media-stack">
                                {plat.items.map((item: any) => (
                                  <div className="stacked-item" key={item.id}>
                                    <Cartridge
                                      item={item}
                                      onRemove={() => {}}
                                      IMAGE_BASE_URL={IMAGE_BASE_URL}
                                      isReadOnly={true}
                                    />
                                  </div>
                                ))}
                              </div>
                              <a
                                href={
                                  PLATFORM_URLS[plat.provider.toUpperCase()] || 
                                  `https://www.google.com/search?q=${encodeURIComponent(plat.provider)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="go-to-app-btn"
                              >
                                LAUNCH APP ↗
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-red-400 text-xl font-bold border-4 border-red-500 bg-red-950 shadow-[0_0_15px_red]">
                        SYSTEM ERROR:
                        <br />
                        NO SUBSCRIPTIONS FOUND IN REGION.
                      </div>
                    )}
                  </div>

                  <div className="mt-auto result-actions" style={{ display: "flex", gap: 8, width: "100%" }}>
                    <button
                      onClick={() => {
                        if (window.location.hash === "#results") {
                          try { window.history.back(); } catch(e) { setAppState("input"); }
                        } else {
                          setAppState("input");
                        }
                      }}
                      className="retro-btn text-xl border-2 border-white"
                      style={{ flex: 1, minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      ◀ EDIT WATCHLIST
                    </button>
                    <Link
                      href="/watched"
                      className="retro-btn text-xl border-2 border-white"
                      style={{ flex: 1, minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                    >
                      ✔ CHECKLIST
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* TV Hardware Controls */}
      <div className="tv-controls" style={{ position: "relative", zIndex: 9999 }}>
        <button 
          onClick={() => setIsPowerOn(!isPowerOn)} 
          className="pwr-button"
          style={{ touchAction: "manipulation", cursor: "pointer" }}
        >
          PWR
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: "1rem", color: "#5a6a7a", padding: "10px 6px" }}>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}