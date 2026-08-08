"use client";
import * as THREE from "three";
import { Effect } from "postprocessing";
import { useEffect, useState } from "react";

export const IMG = "https://image.tmdb.org/t/p/w200";
export const IMG_SMALL = "https://image.tmdb.org/t/p/w92";

export const COUNTRIES = [
  { code: "US", name: "🇺🇸 UNITED STATES" },
  { code: "GB", name: "🇬 UNITED KINGDOM" },
  { code: "CA", name: "🇨🇦 CANADA" },
  { code: "IN", name: "🇮 INDIA" },
  { code: "AU", name: "🇦 AUSTRALIA" },
];

export const PLATFORM_URLS: Record<string, string> = {
  NETFLIX: "https://www.netflix.com",
  JIOHOTSTAR: "https://www.hotstar.com",
  "AMAZON PRIME VIDEO": "https://www.primevideo.com",
  "PRIME VIDEO": "https://www.primevideo.com",
  "DISNEY+ HOTSTAR": "https://www.hotstar.com",
  "APPLE TV+": "https://tv.apple.com",
  HULU: "https://www.hulu.com",
  HBOMAX: "https://www.max.com",
  MAX: "https://www.max.com",
};

export function normalizeProvider(raw: string): string {
  const n = raw.toUpperCase();
  if (n.includes("NETFLIX")) return "NETFLIX";
  if (n.includes("AMAZON PRIME") || n.includes("PRIME VIDEO")) return "AMAZON PRIME VIDEO";
  if (n.includes("APPLE TV")) return "APPLE TV+";
  if (n.includes("PARAMOUNT")) return "PARAMOUNT+";
  if (n.includes("HBO") || n.includes("MAX")) return "MAX";
  if (n.includes("CRUNCHYROLL")) return "CRUNCHYROLL";
  if (n.includes("JIO")) return "JIOHOTSTAR";
  if (n.includes("DISNEY") || n.includes("HOTSTAR")) return "DISNEY+ HOTSTAR";
  if (n.includes("HULU")) return "HULU";
  if (n.includes("PEACOCK")) return "PEACOCK";
  if (n.includes("STARZ")) return "STARZ";
  if (n.includes("SHOWTIME")) return "SHOWTIME";
  if (n.includes("SONY LIV")) return "SONY LIV";
  if (n.includes("ZEE5")) return "ZEE5";
  if (n.includes("MUBI")) return "MUBI";
  if (n.includes("AMAZON")) return "AMAZON PRIME VIDEO";
  if (n.includes(" CHANNEL")) return n.split(" CHANNEL")[0];
  return n;
}

// ==========================================
// FISHEYE LENS
// ==========================================
export const FISHEYE_MAX = 0.26;

const FISHEYE_FRAG = `
uniform float uK;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  float f = 1.0 + uK * r2;
  vec2 suv = 0.5 + c * f;
  vec2 cr = 0.5 + c * (f + uK * 0.06 * r2);
  vec2 cb = 0.5 + c * (f - uK * 0.06 * r2);
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec4 col;
  col.r = texture2D(inputBuffer, clamp(cr, 0.0, 1.0)).r;
  col.g = texture2D(inputBuffer, suv).g;
  col.b = texture2D(inputBuffer, clamp(cb, 0.0, 1.0)).b;
  col.a = 1.0;
  float vig = smoothstep(0.9, 0.3, length(c));
  col.rgb *= mix(0.72, 1.0, vig);
  outputColor = col;
}
`;

export class FisheyeEffect extends Effect {
  constructor() {
    super("FisheyeEffect", FISHEYE_FRAG, {
      uniforms: new Map([["uK", new THREE.Uniform(0.26)]]),
    });
  }
}

// ==========================================
// TEXTURE PAINTERS
// ==========================================
export function makeTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function floorTexture() {
  const t = makeTex(1024, 1024, (ctx) => {
    ctx.fillStyle = "#3a2412"; ctx.fillRect(0, 0, 1024, 1024);
    for (let r = 0; r < 8; r++) {
      const y = r * 128;
      ctx.fillStyle = `hsl(${24 + Math.random() * 8}, 45%, ${22 + Math.random() * 12}%)`;
      ctx.fillRect(0, y, 1024, 124);
      for (let g = 0; g < 60; g++) {
        const gy = y + Math.random() * 124;
        ctx.strokeStyle = `rgba(30,15,5,${0.08 + Math.random() * 0.15})`;
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(300, gy + (Math.random() - 0.5) * 10, 700, gy + (Math.random() - 0.5) * 10, 1024, gy);
        ctx.stroke();
      }
      for (let g = 0; g < 18; g++) {
        const gy = y + Math.random() * 124;
        ctx.strokeStyle = `rgba(255,220,170,${0.03 + Math.random() * 0.05})`;
        ctx.lineWidth = 2 + Math.random() * 3;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(1024, gy + (Math.random() - 0.5) * 6); ctx.stroke();
      }
      for (let k = 0; k < 3; k++) {
        const x = Math.random() * 1024, ky = y + 20 + Math.random() * 84;
        const g = ctx.createRadialGradient(x, ky, 1, x, ky, 14);
        g.addColorStop(0, "rgba(20,8,2,0.8)"); g.addColorStop(0.6, "rgba(60,30,12,0.4)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, ky, 18, 0, 7); ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, y + 124, 1024, 4);
      for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(Math.random() * 1024, y, 3, 124);
      }
    }
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function corkTexture() {
  return makeTex(512, 512, (ctx) => {
    ctx.fillStyle = "#8a6540"; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(70,45,20,${0.2 + Math.random() * 0.3})` : `rgba(200,160,110,${0.15 + Math.random() * 0.25})`;
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(60,38,18,0.35)";
      ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 0, 7); ctx.fill();
    }
    const v = ctx.createRadialGradient(256, 256, 120, 256, 256, 360);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, 512, 512);
  });
}

export function wallTexture() {
  const t = makeTex(512, 512, (ctx) => {
    ctx.fillStyle = "#b3a288"; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,245,225" : "90,75,60"},${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 30 + Math.random() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(70,55,40,0.05)"); g.addColorStop(1, "rgba(70,55,40,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    const lg = ctx.createLinearGradient(0, 0, 0, 512);
    lg.addColorStop(0, "rgba(255,255,255,0.05)"); lg.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 512, 512);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.5);
  return t;
}

export function deskTexture() {
  return makeTex(512, 256, (ctx) => {
    ctx.fillStyle = "#5a3a20"; ctx.fillRect(0, 0, 512, 256);
    for (let g = 0; g < 90; g++) {
      const y = Math.random() * 256;
      ctx.strokeStyle = `rgba(30,15,5,${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 14, 340, y + (Math.random() - 0.5) * 14, 512, y);
      ctx.stroke();
    }
    for (let g = 0; g < 25; g++) {
      const y = Math.random() * 256;
      ctx.strokeStyle = `rgba(255,210,150,${0.04 + Math.random() * 0.06})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
  });
}

export function tvBodyTexture() {
  return makeTex(256, 256, (ctx) => {
    ctx.fillStyle = "#b8ae9a"; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,250,235" : "70,60,45"},${0.04 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    ctx.fillStyle = "rgba(60,50,40,0.5)";
    for (let i = 0; i < 6; i++) ctx.fillRect(200, 40 + i * 14, 40, 4);
    ctx.fillStyle = "rgba(40,35,28,0.8)"; ctx.font = "bold 14px monospace"; ctx.fillText("RETROVISION", 20, 236);
  });
}

export function keysTexture() {
  return makeTex(256, 96, (ctx) => {
    ctx.fillStyle = "#cfc9b8"; ctx.fillRect(0, 0, 256, 96);
    for (let ry = 0; ry < 4; ry++)
      for (let cx = 0; cx < 14; cx++) {
        ctx.fillStyle = "#8f897a"; ctx.fillRect(6 + cx * 17.5, 8 + ry * 20, 14, 16);
        ctx.fillStyle = "#e8e2d2"; ctx.fillRect(6 + cx * 17.5, 6 + ry * 20, 14, 14);
      }
    ctx.fillStyle = "#8f897a"; ctx.fillRect(70, 88, 116, 6);
    ctx.fillStyle = "#e8e2d2"; ctx.fillRect(70, 86, 116, 5);
  });
}

export function rugTexture() {
  return makeTex(512, 512, (ctx) => {
    ctx.fillStyle = "#4a1a1a"; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 3) { ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`; ctx.fillRect(0, y, 512, 1); }
    for (let x = 0; x < 512; x += 3) { ctx.fillStyle = `rgba(255,230,200,${0.02 + Math.random() * 0.03})`; ctx.fillRect(x, 0, 1, 512); }
    ctx.strokeStyle = "#a8823f"; ctx.lineWidth = 14; ctx.strokeRect(24, 24, 464, 464);
    ctx.strokeStyle = "#22304d"; ctx.lineWidth = 6; ctx.strokeRect(56, 56, 400, 400);
    ctx.strokeStyle = "#a8823f"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(256, 256, 110, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(256, 256, 70, 0, 7); ctx.stroke();
    ctx.fillStyle = "#a8823f";
    for (let i = 0; i < 40; i++) {
      const x = 80 + (i % 8) * 50, y = 80 + Math.floor(i / 8) * 70;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    }
    ctx.strokeStyle = "#d8c8a8"; ctx.lineWidth = 2;
    for (let x = 6; x < 512; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 2, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 512); ctx.lineTo(x + 2, 498); ctx.stroke();
    }
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
  });
}

export function tvScreenTexture() {
  return makeTex(256, 192, (ctx) => {
    ctx.fillStyle = "#0b0f14"; ctx.fillRect(0, 0, 256, 192);
    for (let y = 0; y < 192; y += 3) {
      ctx.fillStyle = `rgba(120,220,255,${0.08 + Math.random() * 0.08})`;
      ctx.fillRect(0, y, 256, 1);
      ctx.fillStyle = `rgba(120,255,190,${0.05 + Math.random() * 0.05})`;
      ctx.fillRect(0, y + 1, 256, 1);
    }
    const band = ctx.createLinearGradient(0, 60, 0, 130);
    band.addColorStop(0, "rgba(140,220,255,0)");
    band.addColorStop(0.5, "rgba(140,220,255,0.14)");
    band.addColorStop(1, "rgba(140,220,255,0)");
    ctx.fillStyle = band; ctx.fillRect(0, 60, 256, 70);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(200,210,220,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 192, 1, 1);
    }
    ctx.fillStyle = "rgba(180,200,215,0.45)"; ctx.font = "bold 30px monospace"; ctx.fillText("AV-1", 16, 42);
    ctx.fillStyle = "rgba(120,220,150,0.35)"; ctx.font = "bold 18px monospace"; ctx.fillText("PLAY >", 16, 68);
    ctx.fillStyle = "rgba(220,190,90,0.3)"; ctx.font = "bold 16px monospace"; ctx.fillText("CH 3", 196, 34);
  });
}

export function crtGlowTexture() {
  const t = makeTex(256, 256, (ctx) => {
    ctx.fillStyle = "#050a12"; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = "rgba(90,200,255,0.07)";
      ctx.fillRect(0, y, 256, 1);
      ctx.fillStyle = "rgba(120,255,190,0.12)";
      ctx.fillRect(0, y + 1, 256, 1);
    }
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 170);
    g.addColorStop(0, "rgba(70,160,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function skyTexture(phase: string) {
  return makeTex(256, 256, (ctx) => {
    let top = "#0b1026", bot = "#1b2a4a";
    if (phase === "dawn") { top = "#35406e"; bot = "#ffb26b"; }
    if (phase === "day") { top = "#4da4ff"; bot = "#cfefff"; }
    if (phase === "sunset") { top = "#472a63"; bot = "#ff8c42"; }
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    if (phase === "night" || phase === "dawn") {
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 140, 1.5, 1.5);
      }
    }
    if (phase === "day" || phase === "dawn") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const cloud = (x: number, y: number, s: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 10 * s, 0, 7); ctx.arc(x + 12 * s, y + 2, 8 * s, 0, 7); ctx.arc(x - 12 * s, y + 3, 7 * s, 0, 7);
        ctx.fill();
      };
      cloud(70, 70, 1); cloud(180, 50, 0.8); cloud(130, 100, 0.6);
    }
    if (phase === "night") {
      ctx.fillStyle = "#f4f6ff"; ctx.beginPath(); ctx.arc(180, 70, 22, 0, 7); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(170, 62, 18, 0, 7); ctx.fill();
    } else {
      const sunY = phase === "day" ? 60 : phase === "dawn" ? 150 : 140;
      const sunC = phase === "sunset" ? "#ff5e3a" : "#ffe45c";
      ctx.fillStyle = "rgba(255,220,120,0.35)"; ctx.beginPath(); ctx.arc(170, sunY, 34, 0, 7); ctx.fill();
      ctx.fillStyle = sunC; ctx.beginPath(); ctx.arc(170, sunY, phase === "sunset" ? 26 : 20, 0, 7); ctx.fill();
    }
    ctx.fillStyle = phase === "night" ? "#0a0f1e" : phase === "day" ? "#3f8f5f" : "#2c2140";
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.quadraticCurveTo(60, 170, 120, 205);
    ctx.quadraticCurveTo(180, 235, 256, 195);
    ctx.lineTo(256, 256); ctx.lineTo(0, 256); ctx.closePath(); ctx.fill();
    ctx.fillStyle = phase === "night" ? "#060a14" : "#245b3c";
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 52;
      ctx.beginPath(); ctx.moveTo(x, 216); ctx.lineTo(x + 8, 196); ctx.lineTo(x + 16, 216); ctx.closePath(); ctx.fill();
    }
  });
}

export function makeLabelTexture(img: HTMLImageElement | null, title: string, gray: boolean) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 192;
  const ctx = c.getContext("2d")!;
  if (gray) ctx.filter = "grayscale(1) contrast(1.1)";
  if (img) {
    const iw = img.width || 1, ih = img.height || 1;
    const sc = Math.max(128 / iw, 150 / ih);
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (128 - dw) / 2, (150 - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, "#1a2440"); g.addColorStop(1, "#05070d");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 150);
    ctx.fillStyle = "#eab308"; ctx.font = "bold 20px monospace"; ctx.fillText("?", 56, 85);
  }
  ctx.filter = "none";
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 150, 128, 42);
  ctx.fillStyle = gray ? "#8fa3b8" : "#eab308";
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "center";
  const words = (title || "UNKNOWN").toUpperCase().split(" ");
  let line = "", y = 168, lines = 0;
  const flush = () => { if (line.trim() && lines < 2) { ctx.fillText(line.trim(), 64, y); y += 16; lines++; } };
  words.forEach((w) => {
    if ((line + w).length > 14) { flush(); line = ""; }
    line += w + " ";
  });
  flush();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function paperTexture(rank: number, name: string, count: number, hrs: number) {
  return makeTex(256, 320, (ctx) => {
    ctx.fillStyle = "#e8ddc2"; ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 0; i < 300; i++) ctx.fillRect(Math.random() * 256, Math.random() * 320, 1, 1);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 304);
    ctx.fillStyle = "#111"; ctx.font = "bold 64px monospace";
    ctx.fillText(`#${rank}`, 20, 78);
    ctx.font = "bold 30px monospace";
    const words = name.toUpperCase().split(" ");
    let y = 130;
    let line = "";
    words.forEach((w) => {
      if ((line + w).length > 10) { ctx.fillText(line, 20, y); y += 34; line = ""; }
      line += w + " ";
    });
    ctx.fillText(line, 20, y);
    ctx.fillStyle = "#8a1e1e"; ctx.font = "bold 34px monospace";
    ctx.fillText(`${count} TITLES`, 20, 244);
    ctx.fillStyle = "#333"; ctx.font = "bold 26px monospace";
    ctx.fillText(`~${hrs} HRS`, 20, 278);
    ctx.fillStyle = "#777"; ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("( CLICK TO PULL OUT )", 128, 304);
  });
}

export function stampTexture() {
  return makeTex(128, 64, (ctx) => {
    ctx.clearRect(0, 0, 128, 64);
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 120, 56);
    ctx.fillStyle = "#22c55e"; ctx.font = "bold 26px monospace";
    ctx.fillText("CLEARED", 14, 42);
  });
}

export function fallbackPoster(title: string) {
  return makeTex(128, 192, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, "#1a2440"); g.addColorStop(1, "#05070d");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = "#eab308"; ctx.font = "bold 16px monospace";
    ctx.fillText(String(title || "MOVIE").slice(0, 10), 8, 96);
  });
}

export function fetchAsImage(url: string): Promise<HTMLImageElement> {
  const clean = `${url}${url.includes("?") ? "&" : "?"}blob=1`;
  return fetch(clean, { mode: "cors" })
    .then((r) => { if (!r.ok) throw new Error("bad status"); return r.blob(); })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("img fail")); };
        img.src = blobUrl;
      });
    });
}

export function useClientTexture(factory: () => THREE.Texture) {
  const [t, setT] = useState<THREE.Texture | null>(null);
  useEffect(() => { const tex = factory(); setT(tex); return () => tex.dispose(); }, []);
  return t;
}

// ==========================================
// CAMERA PATH
// ==========================================
export const DESKTOP_STOPS = [
  { t: 0.0, pos: [0, 1.55, 2.75], look: [0, 1.25, -2.6], k: FISHEYE_MAX },
  { t: 0.14, pos: [0, 1.5, 1.5], look: [0, 1.2, -2.6], k: FISHEYE_MAX * 0.9 },
  { t: 0.28, pos: [0, 1.4, 0.35], look: [0, 1.15, -2.5], k: 0.16 },
  { t: 0.4, pos: [0, 1.24, -1.5], look: [0, 1.15, -2.5], k: FISHEYE_MAX },
  { t: 0.52, pos: [-0.6, 1.4, 0.1], look: [-2.95, 1.3, -0.8], k: 0.18 },
  { t: 0.72, pos: [-1.35, 1.35, -0.8], look: [-2.95, 1.3, -0.8], k: FISHEYE_MAX },
  { t: 0.84, pos: [0.6, 1.45, 0.1], look: [2.95, 1.5, -0.9], k: 0.18 },
  { t: 1.0, pos: [1.9, 1.45, -0.85], look: [2.95, 1.5, -0.9], k: FISHEYE_MAX },
];

export const MOBILE_STOPS = [
  { t: 0.0, pos: [0, 1.7, 5.5], look: [0, 1.2, -0.5], k: 0.18 },
  { t: 0.14, pos: [0, 1.6, 3.5], look: [0, 1.2, -2.0], k: 0.16 },
  { t: 0.28, pos: [0, 1.4, 0.35], look: [0, 1.15, -2.5], k: 0.14 },
  { t: 0.4, pos: [0, 1.28, -1.2], look: [0, 1.15, -2.5], k: FISHEYE_MAX },
  { t: 0.52, pos: [-0.3, 1.4, 0.1], look: [-2.95, 1.3, -0.8], k: 0.14 },
  { t: 0.72, pos: [-0.4, 1.35, -0.8], look: [-2.95, 1.3, -0.8], k: 0.18 },
  { t: 0.84, pos: [0.3, 1.45, 0.1], look: [2.95, 1.5, -0.9], k: 0.14 },
  { t: 1.0, pos: [0.9, 1.45, -0.85], look: [2.95, 1.5, -0.9], k: 0.18 },
];