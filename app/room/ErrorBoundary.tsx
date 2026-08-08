"use client";
import React from "react";

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed", inset: 0, background: "#050505", color: "#9fdcff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "'VT323', monospace", textAlign: "center", padding: 20, gap: 14,
          }}
        >
          <div style={{ fontSize: "3rem", color: "#eab308", textShadow: "2px 2px 0 #000" }}>📺 SIGNAL LOST</div>
          <div style={{ fontSize: "1.4rem", maxWidth: 420 }}>
            Your device or browser couldn't start the 3D engine (WebGL).
            The 2D mode works everywhere!
          </div>
          <a href="/" className="retro-btn" style={{ textDecoration: "none", fontSize: "1.4rem", padding: "8px 20px" }}>
            ◀ SWITCH TO 2D MODE
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}