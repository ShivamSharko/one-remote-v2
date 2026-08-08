"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Vignette, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  IMG_SMALL, DESKTOP_STOPS, MOBILE_STOPS, fetchAsImage, fallbackPoster,
  makeLabelTexture, paperTexture, stampTexture, useClientTexture,
  floorTexture, corkTexture, wallTexture, deskTexture, tvBodyTexture,
  keysTexture, rugTexture, tvScreenTexture, crtGlowTexture, skyTexture,
} from "./shared";

// ==========================================
// CAMERA RIG
// ==========================================
function CameraRig({ scrollRef, fisheye, teleportRef, stops, kbShift }: any) {
  const smooth = useRef(0);
  const lastLook = useRef(new THREE.Vector3(0, 1.25, -2.6));
  const vPos = useMemo(() => new THREE.Vector3(), []);
  const vLook = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const tp = teleportRef?.current;
    if (tp && tp.active) {
      if (tp.t === 0) {
        tp.fromPos = state.camera.position.clone();
        tp.fromLook = lastLook.current.clone();
      }
      tp.t = Math.min(1, tp.t + dt / 0.9);
      const e = tp.t * tp.t * (3 - 2 * tp.t);
      vPos.lerpVectors(tp.fromPos, tp.toPos, e);
      vLook.lerpVectors(tp.fromLook, tp.toLook, e);
      state.camera.position.copy(vPos);
      state.camera.lookAt(vLook);
      lastLook.current.copy(vLook);
      if (fisheye) fisheye.uniforms.get("uK").value = THREE.MathUtils.lerp(0.22, tp.toK, e);
      if (tp.t >= 1) {
        tp.active = false;
        smooth.current = tp.toP;
      }
      return;
    }
    smooth.current = THREE.MathUtils.damp(smooth.current, scrollRef.current, 2.5, dt);
    const p = THREE.MathUtils.clamp(smooth.current, 0, 1);
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1].t) i++;
    const s0 = stops[i], s1 = stops[i + 1];
    let lt = (p - s0.t) / (s1.t - s0.t);
    lt = THREE.MathUtils.clamp(lt, 0, 1);
    lt = lt * lt * (3 - 2 * lt);
    a.fromArray(s0.pos); b.fromArray(s1.pos); vPos.lerpVectors(a, b, lt);
    a.fromArray(s0.look); b.fromArray(s1.look); vLook.lerpVectors(a, b, lt);
    vLook.y -= kbShift || 0;
    const t = state.clock.elapsedTime;
    vPos.x += Math.sin(t * 0.7) * 0.01;
    vPos.y += Math.sin(t * 1.3) * 0.007;
    state.camera.position.copy(vPos);
    state.camera.lookAt(vLook);
    lastLook.current.copy(vLook);
    state.camera.rotateZ(Math.sin(t * 0.4) * 0.006);
    if (fisheye) fisheye.uniforms.get("uK").value = THREE.MathUtils.lerp(s0.k, s1.k, lt);
  });
  return null;
}

// ==========================================
// TV SCREEN ANCHOR (projects 2D UI onto 3D TV)
// ==========================================
function TVScreenAnchor({ boxRef, innerRef }: any) {
  const { camera, size } = useThree();
  const pts = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);
  useFrame(() => {
    const box = boxRef.current, inner = innerRef.current;
    if (!box || !inner) return;
    const Z = -2.085;
    pts[0].set(-0.33, 1.39, Z).project(camera);
    pts[1].set(0.33, 1.39, Z).project(camera);
    pts[2].set(0.33, 0.91, Z).project(camera);
    pts[3].set(-0.33, 0.91, Z).project(camera);
    if (pts.some((p) => p.z > 1)) { box.style.visibility = "hidden"; return; }
    const nudge = -size.width * 0.00001;
    const P = pts.map((p) => ({ x: (p.x * 0.5 + 0.5) * size.width + nudge, y: (-p.y * 0.5 + 0.5) * size.height }));
    const cx = (P[0].x + P[1].x + P[2].x + P[3].x) / 4;
    const cy = (P[0].y + P[1].y + P[2].y + P[3].y) / 4;
    const w = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y);
    if (w < 40 || Math.abs(cx - size.width / 2) > size.width * 0.6 || Math.abs(cy - size.height / 2) > size.height * 0.6) {
      box.style.visibility = "hidden";
      return;
    }
    box.style.visibility = "visible";
    const W = 760, H = 560;
    const [p0, p1, p2, p3] = P;
    const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
    const ex = p0.x - p1.x + p2.x - p3.x, ey = p0.y - p1.y + p2.y - p3.y;
    const A = W * dx1, B = H * dx2, D = W * dy1, E = H * dy2;
    const det = A * E - B * D;
    let m6 = 0, m7 = 0;
    if (Math.abs(det) > 1e-8) {
      m6 = (ex * E - B * ey) / det;
      m7 = (A * ey - ex * D) / det;
    }
    const m0 = (p1.x - p0.x) / W + p1.x * m6;
    const m1 = (p3.x - p0.x) / H + p3.x * m7;
    const m3 = (p1.y - p0.y) / W + p1.y * m6;
    const m4 = (p3.y - p0.y) / H + p3.y * m7;
    const m2 = p0.x, m5 = p0.y;
    box.style.left = "0px";
    box.style.top = "0px";
    box.style.width = `${W}px`;
    box.style.height = `${H}px`;
    box.style.transformOrigin = "0 0";
    box.style.transform = `matrix3d(${m0},${m3},0,${m6},${m1},${m4},0,${m7},0,0,1,0,${m2},${m5},0,1)`;
    inner.style.transform = "none";
  });
  return null;
}

// ==========================================
// FURNITURE
// ==========================================
function Desk() {
  const wood = useClientTexture(deskTexture);
  return (
    <group position={[0, 0, -2.45]}>
      <mesh castShadow position={[0, 0.78, 0]}>
        <boxGeometry args={[2.6, 0.08, 1.0]} />
        <meshStandardMaterial map={wood || undefined} color="#ffffff" roughness={0.55} />
      </mesh>
      {[[-1.2, -0.4], [1.2, -0.4], [-1.2, 0.4], [1.2, 0.4]].map((p, i) => (
        <mesh key={i} castShadow position={[p[0], 0.39, p[1]]}>
          <boxGeometry args={[0.08, 0.78, 0.08]} />
          <meshStandardMaterial color="#402a18" roughness={0.8} />
        </mesh>
      ))}
      <mesh castShadow position={[-0.85, 0.55, 0.1]}>
        <boxGeometry args={[0.5, 0.45, 0.7]} />
        <meshStandardMaterial color="#4a3320" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.85, 0.55, 0.1]}>
        <boxGeometry args={[0.5, 0.45, 0.7]} />
        <meshStandardMaterial color="#4a3320" roughness={0.8} />
      </mesh>
    </group>
  );
}

function TVSet({ uiActive, glowOn }: any) {
  const screenTex = useClientTexture(tvScreenTexture);
  const bodyTex = useClientTexture(tvBodyTexture);
  const glowTex = useClientTexture(crtGlowTexture);
  const matRef = useRef<any>(null);
  useFrame((s, dt) => {
    if (matRef.current && !uiActive) {
      matRef.current.color.setScalar(0.72 + Math.sin(s.clock.elapsedTime * 9) * 0.06);
    }
    if (glowTex) glowTex.offset.y += dt * 0.04;
  });
  return (
    <group position={[0, 0, -2.45]}>
      <mesh castShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[0.88, 0.64, 0.72]} />
        <meshStandardMaterial map={bodyTex || undefined} color="#ffffff" roughness={0.5} />
      </mesh>
      {uiActive ? (
        <mesh key="tv-ui" position={[0, 1.15, 0.365]}>
          <planeGeometry args={[0.66, 0.48]} />
          <meshBasicMaterial map={glowTex || undefined} toneMapped={false} />
        </mesh>
      ) : screenTex ? (
        <mesh key="tv-on" position={[0, 1.15, 0.365]}>
          <planeGeometry args={[0.66, 0.48]} />
          <meshBasicMaterial ref={matRef} map={screenTex} color="#777777" toneMapped={false} />
        </mesh>
      ) : (
        <mesh key="tv-off" position={[0, 1.15, 0.365]}>
          <planeGeometry args={[0.66, 0.48]} />
          <meshBasicMaterial ref={matRef} color="#0a0d12" toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, 0.86, 0.365]}>
        <planeGeometry args={[0.8, 0.06]} />
        <meshStandardMaterial color="#6d675c" roughness={0.6} />
      </mesh>
      {glowOn && (
        <>
          <pointLight position={[0, 1.2, -1.8]} intensity={6} distance={7.5} color="#7fdcff" />
          <pointLight position={[0, 1.35, -1.1]} intensity={2.6} distance={6} color="#9fe8ff" />
        </>
      )}
    </group>
  );
}

function Lamp({ on }: any) {
  return (
    <group position={[0.78, 0.82, -2.6]}>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 0.24, 12]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.14, 0.18, 16, 1, true]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {on && (
        <>
          <mesh position={[0, 0.28, 0.06]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color="#ffb066" toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.3, 0.05]} intensity={1.6} distance={3} color="#ff9d4d" castShadow />
        </>
      )}
    </group>
  );
}

function Chair() {
  return (
    <group position={[0.95, 0, -0.55]} rotation={[0, Math.PI - 0.4, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.55, 0.1, 0.55]} />
        <meshStandardMaterial color="#4a241c" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.8, -0.26]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.1]} />
        <meshStandardMaterial color="#4a241c" roughness={0.9} />
      </mesh>
      {[[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].map((p, i) => (
        <mesh key={i} position={[p[0], 0.22, p[1]]}>
          <boxGeometry args={[0.06, 0.44, 0.06]} />
          <meshStandardMaterial color="#332014" />
        </mesh>
      ))}
    </group>
  );
}

function WindowWithView({ position, override }: any) {
  const [real, setReal] = useState("day");
  useEffect(() => {
    const calc = () => {
      const h = new Date().getHours();
      setReal(h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "sunset" : "night");
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, []);
  const phase = override && override !== "auto" ? override : real;
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const t = skyTexture(phase);
    setTex(t);
    return () => { t.dispose(); };
  }, [phase]);
  const light = phase === "day" ? "#fff2cf" : phase === "dawn" ? "#ffbe73" : phase === "sunset" ? "#ff9d4d" : "#7ea8ff";
  const intensity = phase === "night" ? 1.8 : phase === "day" ? 5.5 : phase === "dawn" ? 7 : 3.5;
  return (
    <group position={position}>
      <mesh key={phase} position={[0, 0, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial map={tex || undefined} color={tex ? "#ffffff" : "#0b1026"} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.58, 0.03]}><boxGeometry args={[1.28, 0.08, 0.06]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[0, -0.58, 0.03]}><boxGeometry args={[1.28, 0.08, 0.06]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[-0.6, 0, 0.03]}><boxGeometry args={[0.08, 1.24, 0.06]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[0.6, 0, 0.03]}><boxGeometry args={[0.08, 1.24, 0.06]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.05, 1.1, 0.04]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.05, 1.1, 0.04]} /><meshStandardMaterial color="#e8e0cf" roughness={0.6} /></mesh>
      <mesh position={[0, -0.66, 0.08]} castShadow>
        <boxGeometry args={[1.42, 0.05, 0.2]} />
        <meshStandardMaterial color="#e8e0cf" roughness={0.6} />
      </mesh>
      <pointLight position={[0, 0, 1.2]} intensity={intensity} distance={phase === "dawn" || phase === "day" ? 12 : 8} color={light} />
    </group>
  );
}

function BookStack({ position, rot }: any) {
  const books = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    w: 0.34 - i * 0.03,
    c: ["#7a4a2b", "#4a5d3a", "#5a3a4a", "#3a4a5d", "#8a6a3a"][i % 5],
    o: (Math.random() - 0.5) * 0.04,
  })), []);
  let y = 0;
  return (
    <group position={position} rotation={[0, rot || 0, 0]}>
      {books.map((b, i) => {
        const yy = y + 0.025; y += 0.05;
        return (
          <mesh key={i} castShadow position={[b.o, yy, 0]}>
            <boxGeometry args={[b.w, 0.05, 0.24]} />
            <meshStandardMaterial color={b.c} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

function Keyboard() {
  const keys = useClientTexture(keysTexture);
  return (
    <group position={[0, 0.83, -2.05]} rotation={[0.1, 0, 0]}>
      <mesh castShadow><boxGeometry args={[0.55, 0.03, 0.18]} /><meshStandardMaterial color="#d8d2c0" roughness={0.6} /></mesh>
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.14]} />
        <meshStandardMaterial map={keys || undefined} color="#ffffff" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Mug() {
  return (
    <group position={[-0.55, 0.82, -2.2]}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
        <meshStandardMaterial color="#7a2e2e" roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.03, 0.008, 8, 16]} />
        <meshStandardMaterial color="#7a2e2e" roughness={0.4} />
      </mesh>
    </group>
  );
}

// ==========================================
// WALL POSTERS
// ==========================================
function PosterPlane({ x, url, title }: any) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const texRef = useRef<THREE.Texture | null>(null);
  useEffect(() => () => { texRef.current?.dispose(); }, []);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!url) throw new Error("no url");
        const img = await fetchAsImage(url);
        if (!alive) return;
        const c = document.createElement("canvas");
        c.width = 128; c.height = 192;
        const ctx = c.getContext("2d")!;
        const iw = img.width || 1, ih = img.height || 1;
        const sc = Math.max(128 / iw, 192 / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(img, (128 - dw) / 2, (192 - dh) / 2, dw, dh);
        for (let i = 0; i < 12; i++) {
          ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const x = Math.random() * 128;
          ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 20, 192);
          ctx.stroke();
        }
        const sh = ctx.createLinearGradient(0, 0, 128, 192);
        sh.addColorStop(0, "rgba(255,255,255,0.08)"); sh.addColorStop(0.5, "rgba(0,0,0,0.10)"); sh.addColorStop(1, "rgba(255,255,255,0.05)");
        ctx.fillStyle = sh; ctx.fillRect(0, 0, 128, 192);
        ctx.fillStyle = "rgba(230,225,200,0.8)";
        ctx.save(); ctx.translate(10, 8); ctx.rotate(-0.5); ctx.fillRect(-12, -5, 26, 10); ctx.restore();
        ctx.save(); ctx.translate(118, 8); ctx.rotate(0.5); ctx.fillRect(-14, -5, 26, 10); ctx.restore();
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        if (!alive) { t.dispose(); return; }
        texRef.current?.dispose();
        texRef.current = t;
        setTex(t);
      } catch {
        if (alive) setTex(fallbackPoster(title || "MOVIE"));
      }
    };
    run();
    return () => { alive = false; };
  }, [url, title]);
  return tex ? (
    <mesh key="poster-on" position={[x, 2.0, -2.98]}>
      <planeGeometry args={[0.52, 0.78]} />
      <meshStandardMaterial map={tex} color="#c8c8c8" roughness={0.9} />
    </mesh>
  ) : (
    <mesh key="poster-off" position={[x, 2.0, -2.98]}>
      <planeGeometry args={[0.52, 0.78]} />
      <meshStandardMaterial color="#333333" roughness={0.9} />
    </mesh>
  );
}

function WallPosters({ posters }: any) {
  const xs = [-1.15, -0.45, 0.25, 0.95, 1.65];
  return (
    <group>
      {xs.map((x, i) => (
        <PosterPlane key={i} x={x} url={posters[i]?.url} title={posters[i]?.title || "MOVIE"} />
      ))}
    </group>
  );
}

// ==========================================
// SHELF + CARTRIDGES
// ==========================================
function Cartridge({ item, position, onToggle, stamp }: any) {
  const [label, setLabel] = useState<THREE.Texture | null>(null);
  const [grayLabel, setGrayLabel] = useState<THREE.Texture | null>(null);
  const [bodyColor, setBodyColor] = useState("#d8d4c8");
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  const base = useMemo(() => new THREE.Vector3().fromArray(position), [position]);
  useEffect(() => {
    let alive = true;
    const build = (img: HTMLImageElement | null) => {
      if (!alive) return;
      setLabel(makeLabelTexture(img, item.title, false));
      setGrayLabel(makeLabelTexture(img, item.title, true));
      if (img) {
        try {
          const c = document.createElement("canvas");
          c.width = 32; c.height = 32;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0, 32, 32);
          const d = ctx.getImageData(0, 0, 32, 32).data;
          let r = 0, gg = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 8) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
          if (n > 0) setBodyColor(`rgb(${Math.floor(r / n)}, ${Math.floor(gg / n)}, ${Math.floor(b / n)})`);
        } catch {}
      }
    };
    if (item.posterPath) {
      fetchAsImage(`${IMG_SMALL}${item.posterPath}`)
        .then((img) => build(img))
        .catch(() => build(null));
    } else build(null);
    return () => { alive = false; };
  }, [item.posterPath, item.title]);
  useEffect(() => () => { label?.dispose(); }, [label]);
  useEffect(() => () => { grayLabel?.dispose(); }, [grayLabel]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.position.x = THREE.MathUtils.damp(g.current.position.x, base.x + (hover ? 0.24 : 0), 10, dt);
    g.current.position.y = THREE.MathUtils.damp(g.current.position.y, base.y + (hover ? 0.04 : 0), 10, dt);
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, hover ? 0.15 : -0.38, 10, dt);
    const s = THREE.MathUtils.damp(g.current.scale.x, hover ? 1.25 : 1, 10, dt);
    g.current.scale.setScalar(s);
  });
  const shown = item.completed ? grayLabel : label;
  return (
    <group
      ref={g}
      position={position}
      rotation={[0, -0.38, 0]}
      onClick={(e: any) => { e.stopPropagation(); onToggle(item.id); }}
      onPointerOver={(e: any) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.045, 0.22, 0.15]} />
        <meshStandardMaterial color={item.completed ? "#334155" : bodyColor} roughness={0.6} />
      </mesh>
      {shown ? (
        <mesh key="label-on" position={[0.024, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.14, 0.2]} />
          <meshStandardMaterial map={shown} color="#ffffff" />
        </mesh>
      ) : (
        <mesh key="label-off" position={[0.024, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.14, 0.2]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
      )}
      {item.completed && stamp && (
        <mesh position={[0.03, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.11, 0.055]} />
          <meshBasicMaterial map={stamp} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Shelf({ watchlist, onToggle, lit }: any) {
  const stamp = useClientTexture(stampTexture);
  const rows = [1.4, 0.95, 1.86];
  const list = useMemo(() => [...watchlist].reverse().slice(0, 30), [watchlist]);
  return (
    <group>
      <mesh castShadow position={[-2.95, 1.25, -0.8]}>
        <boxGeometry args={[0.06, 2.2, 2.4]} />
        <meshStandardMaterial color="#3a2817" roughness={0.8} />
      </mesh>
      {rows.map((y, i) => (
        <mesh key={i} castShadow position={[-2.78, y - 0.11, -0.8]}>
          <boxGeometry args={[0.36, 0.04, 2.4]} />
          <meshStandardMaterial color="#543823" roughness={0.7} />
        </mesh>
      ))}
      {rows.map((y, i) => (
        <mesh key={`led-${i}`} position={[-2.62, y - 0.085, -0.8]}>
          <boxGeometry args={[0.02, 0.012, 2.4]} />
          <meshBasicMaterial color={lit ? "#c89a5a" : "#2a2015"} toneMapped={false} />
        </mesh>
      ))}
      {lit && (
        <>
          <pointLight position={[-2.3, 1.5, -0.8]} intensity={2.2} distance={4.2} color="#ffd9a0" />
          <pointLight position={[-2.3, 1.05, -0.8]} intensity={1.2} distance={3} color="#ffd9a0" />
        </>
      )}
      {stamp && list.map((item: any, i: number) => {
        const row = Math.floor(i / 10), col = i % 10;
        return (
          <Cartridge
            key={item.id}
            item={item}
            stamp={stamp}
            onToggle={onToggle}
            position={[-2.76, rows[row], -1.65 + col * 0.17]}
          />
        );
      })}
    </group>
  );
}

// ==========================================
// PIN BOARD
// ==========================================
function BoardPaper({ plat, pos, tilt, rank, onOpen }: any) {
  const { camera, size } = useThree();
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  const front = useMemo(() => paperTexture(rank, plat.provider, plat.count, Math.round(plat.totalMinutes / 60)), [plat, rank]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  useFrame((_, dt) => {
    if (!g.current) return;
    const s = THREE.MathUtils.damp(g.current.scale.x, hover ? 1.1 : 1, 10, dt);
    g.current.scale.setScalar(s);
  });
  const open = (e: any) => {
    e.stopPropagation();
    const c = new THREE.Vector3(2.94, pos[0], pos[1]).project(camera);
    const t = new THREE.Vector3(2.94, pos[0] + 0.21, pos[1]).project(camera);
    const r = new THREE.Vector3(2.94, pos[0], pos[1] + 0.17).project(camera);
    const cx = (c.x * 0.5 + 0.5) * size.width;
    const cy = (-c.y * 0.5 + 0.5) * size.height;
    const halfH = Math.max(20, cy - (-t.y * 0.5 + 0.5) * size.height);
    const halfW = Math.max(20, Math.abs((r.x * 0.5 + 0.5) * size.width - cx));
    const rect = { left: cx - halfW, top: cy - halfH, width: halfW * 2, height: halfH * 2 };
    let imgUrl = "";
    try { imgUrl = (front.image as HTMLCanvasElement).toDataURL(); } catch {}
    onOpen(plat, rank, rect, imgUrl);
  };
  return (
    <group position={[2.94, pos[0], pos[1]]} rotation={[0, -Math.PI / 2, tilt]}>
      <group
        ref={g}
        onClick={open}
        onPointerOver={(e: any) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <mesh>
          <planeGeometry args={[0.34, 0.42]} />
          <meshStandardMaterial map={front} roughness={0.9} />
        </mesh>
      </group>
      <mesh position={[0, 0.18, 0.015]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#cc2222" roughness={0.3} />
      </mesh>
    </group>
  );
}

function PinBoard({ ranked, onOpen, lit }: any) {
  const cork = useClientTexture(corkTexture);
  const spots = [
    [1.78, -1.35], [1.78, -0.9], [1.78, -0.45],
    [1.3, -1.35], [1.3, -0.9], [1.3, -0.45],
  ];
  return (
    <group>
      <mesh position={[2.98, 1.5, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.82, 1.32]} />
        <meshStandardMaterial color="#3a2817" roughness={0.8} />
      </mesh>
      {cork ? (
        <mesh key="cork-on" position={[2.97, 1.5, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.7, 1.2]} />
          <meshStandardMaterial map={cork} roughness={1} />
        </mesh>
      ) : (
        <mesh key="cork-off" position={[2.97, 1.5, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.7, 1.2]} />
          <meshStandardMaterial color="#8a6540" roughness={1} />
        </mesh>
      )}
      <mesh position={[2.95, 2.12, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 0.02]} />
        <meshBasicMaterial color={lit ? "#c89a5a" : "#2a2015"} toneMapped={false} />
      </mesh>
      <mesh position={[2.95, 0.88, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 0.02]} />
        <meshBasicMaterial color={lit ? "#c89a5a" : "#2a2015"} toneMapped={false} />
      </mesh>
      {lit && <pointLight position={[2.3, 1.5, -0.9]} intensity={1.8} distance={4} color="#ffd9a0" />}
      {ranked.slice(0, 6).map((p: any, i: number) => (
        <BoardPaper key={p.provider} plat={p} pos={spots[i]} tilt={(((i * 37) % 10) - 5) * 0.02} rank={i + 1} onOpen={onOpen} />
      ))}
      {ranked.length === 0 && (
        <mesh position={[2.94, 1.5, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshStandardMaterial color="#e8ddc2" />
        </mesh>
      )}
    </group>
  );
}

// ==========================================
// FULL ROOM SCENE
// ==========================================
export function RoomScene(props: any) {
  const { watchlist, onToggle, ranked, wallPosters, scrollRef, fisheye, tvBoxRef, tvInnerRef, teleportRef, onOpen, uiActive, isMobile, lights, kbShift, timeOverride } = props;
  const STOPS = isMobile ? MOBILE_STOPS : DESKTOP_STOPS;
  const wood = useClientTexture(floorTexture);
  const rug = useClientTexture(rugTexture);
  const wall = useClientTexture(wallTexture);
  return (
    <>
      <color attach="background" args={["#050302"]} />
      <fog attach="fog" args={["#050302", 6, 12]} />
      <ambientLight intensity={0.16} color="#ffd9b0" />
      {wood ? (
        <mesh key="floor-on" rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={0.02} color="#ffffff" roughness={0.7} />
        </mesh>
      ) : (
        <mesh key="floor-off" rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#5a3a20" roughness={0.85} />
        </mesh>
      )}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#6e6252" roughness={1} />
      </mesh>
      <mesh position={[0, 1.5, -3]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial map={wall || undefined} color="#d6c7ae" roughness={0.95} />
      </mesh>
      <mesh position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial map={wall || undefined} color="#cfc0a6" roughness={0.95} />
      </mesh>
      <mesh position={[3, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial map={wall || undefined} color="#cfc0a6" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.5, 3]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial map={wall || undefined} color="#8a7a62" roughness={1} />
      </mesh>
      <mesh position={[0, 0.06, -2.97]}><boxGeometry args={[6, 0.12, 0.05]} /><meshStandardMaterial color="#ddd6c6" roughness={0.5} /></mesh>
      <mesh position={[-2.97, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[6, 0.12, 0.05]} /><meshStandardMaterial color="#ddd6c6" roughness={0.5} /></mesh>
      <mesh position={[2.97, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[6, 0.12, 0.05]} /><meshStandardMaterial color="#ddd6c6" roughness={0.5} /></mesh>
      {rug ? (
        <mesh key="rug-on" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]} receiveShadow>
          <planeGeometry args={[2.6, 1.9]} />
          <meshStandardMaterial map={rug} roughness={1} />
        </mesh>
      ) : (
        <mesh key="rug-off" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]} receiveShadow>
          <planeGeometry args={[2.6, 1.9]} />
          <meshStandardMaterial color="#4a1a1a" roughness={1} />
        </mesh>
      )}
      <Desk />
      <TVSet uiActive={uiActive} glowOn />
      <Lamp on={lights.lamp} />
      <Chair />
      <Keyboard />
      <BookStack position={[-1.12, 0.82, -2.62]} rot={0.2} />
      <BookStack position={[1.12, 0.82, -2.62]} rot={-0.15} />
      <Mug />
      <WindowWithView position={[-2.2, 1.75, -2.95]} override={timeOverride} />
      <WallPosters posters={wallPosters} />
      <mesh position={[0.25, 2.52, -2.96]}>
        <boxGeometry args={[3.7, 0.02, 0.03]} />
        <meshBasicMaterial color={lights.posters ? "#c89a5a" : "#2a2015"} toneMapped={false} />
      </mesh>
      {lights.posters && (
        <>
          {[-1.15, -0.45, 0.25, 0.95, 1.65].map((x, i) => (
            <pointLight key={i} position={[x, 2.3, -2.6]} intensity={0.5} distance={2} color="#ffd9a0" />
          ))}
        </>
      )}
      <Shelf watchlist={watchlist} onToggle={onToggle} lit={lights.shelf} />
      <PinBoard ranked={ranked} onOpen={onOpen} lit={lights.board} />
      <CameraRig scrollRef={scrollRef} fisheye={fisheye} teleportRef={teleportRef} stops={STOPS} kbShift={kbShift} />
      <TVScreenAnchor boxRef={tvBoxRef} innerRef={tvInnerRef} />
      {fisheye && (
        <EffectComposer>
          <primitive object={fisheye} />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.3} darkness={0.85} />
        </EffectComposer>
      )}
    </>
  );
}