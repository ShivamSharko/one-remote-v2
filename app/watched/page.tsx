"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w92";

// ==========================================
// COMPONENT: CHECKLIST CARTRIDGE
// ==========================================
function ChecklistCartridge({ item, onToggle, onRemove }: any) {
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
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
        if (max - min > 40) {
          r += pr; g += pg; b += pb; count++;
        }
      }

      if (count === 0) {
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      }

      if (count > 0) {
        setBgColor(`rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`);
      }
    } catch (err) {
      console.error("Could not extract color", err);
    }
  };

  const finalBgColor = item.completed ? "#334155" : bgColor;

  return (
    <div className={`relative cursor-pointer transition-transform hover:scale-105 ${item.completed ? "opacity-90" : ""}`} onClick={() => onToggle(item.id)}>
      <div 
        className="famicom-cartridge" 
        style={{ backgroundColor: finalBgColor, transition: "background-color 0.5s ease" }}
      >
        {/* 💥 FIXED: The Delete button is now INSIDE the cartridge box! */}
        <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="cart-remove" title="Remove from list">
          ✕
        </button>

        <div className="cart-label">
          <div className="cart-art-area">
            {item.posterPath && !imgFailed ? (
              <img
                crossOrigin="anonymous"
                src={`${IMAGE_BASE_URL}${item.posterPath}?cors=1`}
                alt={item.title}
                className="cart-poster"
                onLoad={handleImageLoad}
                onError={() => setImgFailed(true)}
                style={{ filter: item.completed ? "grayscale(100%) contrast(1.2)" : "none", transition: "filter 0.5s ease" }}
              />
            ) : (
              <div className="cart-poster flex items-center justify-center bg-gray-800">?</div>
            )}

            {item.completed && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <span className="border-2 border-green-400 text-green-400 bg-black/80 font-bold px-1 py-0.5 text-xs rotate-[-12deg] tracking-wider shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                  ✔ CLEARED
                </span>
              </div>
            )}
          </div>
          <div className="cart-title" style={{ color: item.completed ? "#94a3b8" : "#eab308", fontSize: "0.6rem", lineHeight: "1.2" }}>
            {item.title}
            {item.year && item.year !== "Unknown" && (
              <div style={{ color: item.completed ? "#64748b" : "#fef08a", marginTop: "2px" }}>({item.year})</div>
            )}
          </div>
        </div>
        <div className="cart-grip"></div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: MAIN CHECKLIST PAGE
// ==========================================
export default function WatchedChecklistPage() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [isPowerOn, setIsPowerOn] = useState(true);
  
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [sortBy, setSortBy] = useState<"order" | "title" | "year">("order");

  useEffect(() => {
    const saved = localStorage.getItem("retro-watchlist");
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  const saveWatchlist = (updatedList: any[]) => {
    setWatchlist(updatedList);
    localStorage.setItem("retro-watchlist", JSON.stringify(updatedList));
  };

  const toggleWatched = (id: number) => {
    const updated = watchlist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    saveWatchlist(updated);
  };

  const removeItem = (id: number) => {
    const updated = watchlist.filter((item) => item.id !== id);
    saveWatchlist(updated);
  };

  // 1. FILTERING
  let displayList = watchlist.filter((item) => {
    if (filter === "completed") return item.completed;
    if (filter === "pending") return !item.completed;
    return true;
  });

  // 2. SORTING 
  displayList.sort((a, b) => {
    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (sortBy === "year") {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      return yearB - yearA; 
    }
    return 0; 
  });

  const totalCount = watchlist.length;
  const completedCount = watchlist.filter((item) => item.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="tv-container">
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
              <div className="flex flex-col flex-1 min-h-0">
                
                {/* Header */}
                <div className="screen-header mb-2">
                  <div className="av2-header" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "baseline", gap: 10 }}>
                    <h1 className="glow-text" style={{ marginBottom: 0 }}>AV-2</h1>
                    <span style={{ color: "#38bdf8", fontSize: "1.4rem", fontWeight: "bold" }}>CHECKLIST</span>
                  </div>
                  <Link href="/" className="retro-btn text-lg border-2 border-sky-600" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
                    ◀ BACK TO MAIN
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="bg-slate-900 border-2 border-sky-500 p-2 mb-3 rounded flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xl">
                    <span className="text-yellow-400">PROGRESS:</span>
                    <span className="text-green-400 font-bold">
                      {completedCount} / {totalCount} CLEARED ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-4 border border-sky-700 rounded overflow-hidden p-0.5">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.3) 10px)",
                      }}
                    />
                  </div>
                </div>

                {/* Filters & Sorting Controls */}
                <div className="filter-sort-row" style={{ display: "flex", flexWrap: "nowrap", justifyContent: "space-between", alignItems: "center", gap: 8, backgroundColor: "#0f172a", border: "1px solid #334155", padding: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setFilter("all")} className={`optimize-btn ${filter === "all" ? "active" : ""}`}>ALL</button>
                    <button onClick={() => setFilter("pending")} className={`optimize-btn ${filter === "pending" ? "active" : ""}`}>PENDING</button>
                    <button onClick={() => setFilter("completed")} className={`optimize-btn ${filter === "completed" ? "active" : ""}`}>CLEARED</button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "1.2rem", color: "#93c5fd", whiteSpace: "nowrap" }}>SORT:</span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="retro-select"
                      style={{ padding: "0 4px", fontSize: "1.1rem", maxWidth: 150 }}
                    >
                      <option value="order">ORDER ADDED</option>
                      <option value="title">TITLE (A-Z)</option>
                      <option value="year">RELEASE YEAR</option>
                    </select>
                  </div>
                </div>

                {/* Cartridge Grid */}
                <div className="watchlist-container">
                  {displayList.length > 0 ? (
                    displayList.map((item) => (
                      <ChecklistCartridge
                        key={item.id}
                        item={item}
                        onToggle={toggleWatched}
                        onRemove={removeItem}
                      />
                    ))
                  ) : (
                    <div className="w-full text-center py-12 text-slate-400 text-2xl">
                      NO DATA FOUND IN THIS CATEGORY.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="tv-controls">
        <button onClick={() => setIsPowerOn(!isPowerOn)} className="pwr-button">PWR</button>
      </div>
    </div>
  );
}

