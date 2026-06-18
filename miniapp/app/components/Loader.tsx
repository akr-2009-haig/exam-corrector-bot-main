"use client";

import { useEffect, useState } from "react";

/**
 * A professional HUD-style loading animation (PUBG/Space theme).
 * Replaces simple "Loading..." texts with a high-end visual experience.
 */
export default function Loader({ text = "جارٍ الاتصال بالخادم..." }: { text?: string }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const int = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 400);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="loader-container">
      <div className="hud-loader">
        {/* Outer targeting ring */}
        <div className="hud-ring outer-ring"></div>
        {/* Inner fast-spinning ring */}
        <div className="hud-ring inner-ring"></div>
        
        {/* Center dot/pulse */}
        <div className="hud-center-pulse"></div>
        
        {/* Crosshair marks */}
        <div className="cross-mark cross-top"></div>
        <div className="cross-mark cross-right"></div>
        <div className="cross-mark cross-bottom"></div>
        <div className="cross-mark cross-left"></div>
      </div>
      <div className="loader-text">
        <span className="loader-scan"></span>
        {text.replace(/\.+$/, "")}{dots}
      </div>
    </div>
  );
}
