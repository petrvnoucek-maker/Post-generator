import { useState, useRef, useEffect, useCallback } from "react";

const FORMATS = [
  { id: "instagram", label: "Instagram", sub: "1:1",    w: 1080, h: 1080 },
  { id: "story",     label: "Story",     sub: "9:16",   w: 1080, h: 1920 },
  { id: "facebook",  label: "FB / LI",   sub: "1.91:1", w: 1200, h: 628  },
  { id: "twitter",   label: "Twitter/X", sub: "16:9",   w: 1200, h: 675  },
];
const FONTS = ["Inter", "Arial", "Georgia", "Times New Roman", "Verdana", "Impact", "Trebuchet MS"];
const UI  = "#1B69BF";
const BAR = "#4A7FC1";
const PREVIEW_MAX = 380;

// logoVariant: "white" = white circle + dark A | "black" = black circle + white A | "blue" = blue circle + white A
function drawLogo(ctx, w, h, logoVariant = "white") {
  const r  = w * 0.055;
  const cx = w - w * 0.07 - r;
  const cy = h * 0.055 + r;
  ctx.save();

  const circleFill = logoVariant === "white" ? "#ffffff"
                   : logoVariant === "black"  ? "#111111"
                   :                            "#1B69BF";
  const aFill      = logoVariant === "white"  ? "#2B5F9E" : "#ffffff";

  // Shadow for better visibility
  ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = r * 0.4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = circleFill; ctx.fill();
  ctx.shadowBlur = 0;

  const fs = r * 1.05;
  ctx.font = `bold ${fs}px Inter, Arial`; ctx.fillStyle = aFill;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("A", cx, cy + fs * 0.32);
  const bw = fs * 0.62, bh = Math.max(2, r * 0.11);
  ctx.fillRect(cx - bw / 2, cy + fs * 0.46, bw, bh);
  ctx.restore();
}

function wrapLines(ctx, text, maxW) {
  const words = (text || "").split(" ").filter(Boolean);
  const lines = []; let line = "";
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + " "; }
    else line = test;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function drawPost(ctx, w, h, { bgMode, bgColor, bgImage, overlayOpacity,
                                headline, subtext, textColor, fontFamily, fontScale, textAlign, textPos, logoVariant }) {
  const hs = Math.round(w * 0.075 * fontScale);
  const ss = Math.round(w * 0.038 * fontScale);
  const ff = `${fontFamily}, Arial, sans-serif`;

  // Background
  if (bgMode === "template1") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#6B9FCC"); g.addColorStop(0.4, "#3A6EA8"); g.addColorStop(1, "#000810");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "template2") {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image" && bgImage) {
    const img = bgImage, ir = img.width / img.height, cr = w / h;
    let sx, sy, sw, sh;
    if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
    else         { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`; ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
  }

  const yBase = textPos === "top" ? h * 0.12 : textPos === "center" ? h * 0.38 : h * 0.55;

  if (bgMode === "template2") {
    // Black: blue left bar + left-aligned text
    const barX = w * 0.07, barW = Math.max(4, w * 0.007);
    const textX = barX + barW + w * 0.04, maxW = w * 0.76;
    const lh1 = hs * 1.28, lh2 = ss * 1.4;

    ctx.font = `bold ${hs}px ${ff}`;
    const hLines = wrapLines(ctx, headline, maxW);
    ctx.font = `${ss}px ${ff}`;
    const sLines = subtext ? wrapLines(ctx, subtext, maxW) : [];
    const totalH = hLines.length * lh1 + (sLines.length ? ss * 0.8 + sLines.length * lh2 : 0);

    ctx.fillStyle = BAR;
    ctx.fillRect(barX, yBase - hs * 0.12, barW, totalH + hs * 0.15);

    ctx.font = `bold ${hs}px ${ff}`; ctx.fillStyle = textColor;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    hLines.forEach((l, i) => ctx.fillText(l, textX, yBase + i * lh1 + hs * 0.88));

    if (sLines.length) {
      ctx.font = `${ss}px ${ff}`; ctx.globalAlpha = 0.78;
      const sy2 = yBase + hLines.length * lh1 + ss * 1.1;
      sLines.forEach((l, i) => ctx.fillText(l, textX, sy2 + i * lh2));
      ctx.globalAlpha = 1;
    }
  } else {
    const pad = w * 0.08, maxW = w * 0.84;
    ctx.fillStyle = textColor; ctx.textBaseline = "alphabetic";
    const drawBlock = (text, size, bold, y) => {
      ctx.font = `${bold ? "bold " : ""}${size}px ${ff}`;
      const lines = wrapLines(ctx, text, maxW);
      const lh = size * (bold ? 1.28 : 1.4);
      lines.forEach((l, i) => {
        ctx.textAlign = textAlign;
        const x = textAlign === "center" ? w / 2 : textAlign === "right" ? pad + maxW : pad;
        ctx.fillText(l, x, y + i * lh + size * 0.88);
      });
      return lines.length * lh;
    };
    const h1h = drawBlock(headline, hs, true, yBase);
    ctx.globalAlpha = 0.82;
    drawBlock(subtext, ss, false, yBase + h1h + ss * 0.7);
    ctx.globalAlpha = 1;
  }
  drawLogo(ctx, w, h, logoVariant);
}

export default function App() {
  const [fmt, setFmt]               = useState(FORMATS[0]);
  const [headline, setHeadline]     = useState("Záchranáři ukončili pátrací akci");
  const [subtext, setSubtext]       = useState("Po třech dnech intenzivního hledání v Krkonoších byl nalezen ztracený turista živý a zdravý.");
  const [textColor, setTextColor]   = useState("#ffffff");
  const [textAlign, setTextAlign]   = useState("left");
  const [textPos, setTextPos]       = useState("bottom");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontScale, setFontScale]   = useState(1.0);
  const [bgMode, setBgMode]         = useState("template1");
  const [logoVariant, setLogoVariant] = useState("white");
  const [customSub, setCustomSub]   = useState("color");
  const [bgColor, setBgColor]       = useState("#1a3a6e");
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);

  // Load Inter from Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const effectiveBgMode = bgMode === "custom" ? (customSub === "image" ? "image" : "color") : bgMode;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const { w, h } = fmt;
    const s = Math.min(PREVIEW_MAX / w, PREVIEW_MAX / h);
    canvas.width  = Math.round(w * s);
    canvas.height = Math.round(h * s);
    const ctx = canvas.getContext("2d");
    ctx.save(); ctx.scale(s, s);
    drawPost(ctx, w, h, { bgMode: effectiveBgMode, bgColor, bgImage: imgRef.current,
      overlayOpacity, headline, subtext, textColor, fontFamily, fontScale, textAlign, textPos, logoVariant });
    ctx.restore();
  }, [fmt, effectiveBgMode, bgColor, overlayOpacity, headline, subtext, textColor, fontFamily, fontScale, textAlign, textPos, logoVariant]);

  useEffect(() => { redraw(); }, [redraw]);

  // Small delay after font load for first render
  useEffect(() => { setTimeout(redraw, 600); }, []);

  const handleBgImage = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; setCustomSub("image"); };
    img.src = URL.createObjectURL(file);
  };

  const exportAs = (type) => {
    const { w, h } = fmt;
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    drawPost(off.getContext("2d"), w, h, { bgMode: effectiveBgMode, bgColor,
      bgImage: imgRef.current, overlayOpacity, headline, subtext, textColor, fontFamily, fontScale, textAlign, textPos, logoVariant });
    const dataUrl = off.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.93);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `aktualne-${fmt.id}.${type}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Style helpers
  const inp = { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd",
    boxSizing: "border-box", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#555",
    marginBottom: 4, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" };
  const mkBtn = (active, color = UI) => ({
    padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all .15s",
    background: active ? color : "#f0f0f0", color: active ? "#fff" : "#444"
  });
  const tplBtn = (id) => ({
    ...mkBtn(bgMode === id),
    flex: 1, padding: "9px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", background: "#f4f5f7" }}>

      {/* Sidebar */}
      <div style={{ width: 268, background: "#fff", borderRight: "1px solid #e6e6e6", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: UI, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: UI, color: "#fff", borderRadius: "50%", width: 24, height: 24,
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>A</span>
          Post Generator
        </div>

        {/* Format */}
        <div style={lbl}>Formát</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setFmt(f)}
              style={{ ...mkBtn(fmt.id === f.id), display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "7px 4px" }}>
              <span style={{ fontSize: 12 }}>{f.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{f.sub}</span>
            </button>
          ))}
        </div>

        {/* Text */}
        <label style={lbl}>Nadpis</label>
        <textarea value={headline} onChange={e => setHeadline(e.target.value)} style={{ ...inp, height: 64, resize: "vertical" }} />
        <label style={lbl}>Perex</label>
        <textarea value={subtext} onChange={e => setSubtext(e.target.value)} style={{ ...inp, height: 68, resize: "vertical" }} />

        {/* Font */}
        <label style={lbl}>Font</label>
        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={inp}>
          {FONTS.map(f => <option key={f}>{f}</option>)}
        </select>

        {/* Font size */}
        <label style={lbl}>Velikost písma</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setFontScale(s => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}
            style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>−</button>
          <input type="range" min="0.5" max="2.0" step="0.05" value={fontScale}
            onChange={e => setFontScale(parseFloat(e.target.value))}
            style={{ flex: 1 }} />
          <button onClick={() => setFontScale(s => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}
            style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>+</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{Math.round(fontScale * 100)} %</span>
          <button onClick={() => setFontScale(1.0)}
            style={{ fontSize: 10, color: UI, background: "none", border: "none", cursor: "pointer", padding: 0 }}>reset</button>
        </div>

        {/* Alignment — hidden for template2 */}
        {bgMode !== "template2" && <>
          <label style={lbl}>Zarovnání</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[["left","⬅"],["center","⬛"],["right","➡"]].map(([v, ic]) => (
              <button key={v} onClick={() => setTextAlign(v)} style={{ ...mkBtn(textAlign === v), flex: 1, fontSize: 14 }}>{ic}</button>
            ))}
          </div>
        </>}

        {/* Text position */}
        <label style={lbl}>Pozice textu</label>
        <div style={{ display: "flex", gap: 6 }}>
          {[["top","Nahoře"],["center","Střed"],["bottom","Dole"]].map(([v, l]) => (
            <button key={v} onClick={() => setTextPos(v)} style={{ ...mkBtn(textPos === v), flex: 1, fontSize: 11 }}>{l}</button>
          ))}
        </div>

        {/* Text color */}
        <label style={lbl}>Barva textu</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
            style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
          <span style={{ fontSize: 12, color: "#888" }}>{textColor}</span>
        </div>

        {/* Logo variant */}
        <label style={lbl}>Logo</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {[
            ["white", "⬤", "#fff", "#2B5F9E", "Bílé"],
            ["black", "⬤", "#111", "#fff",    "Černé"],
            ["blue",  "⬤", UI,    "#fff",    "Modré"],
          ].map(([v, ic, bg, fg, label]) => (
            <button key={v} onClick={() => setLogoVariant(v)} style={{
              ...mkBtn(logoVariant === v), flex: 1, fontSize: 11,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px"
            }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: bg,
                border: "1.5px solid #ccc", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, color: fg, fontWeight: 700, lineHeight: 1 }}>A</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Background templates */}
        <label style={lbl}>Pozadí / šablona</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={() => setBgMode("template1")} style={tplBtn("template1")}>
            <span style={{ width: 28, height: 18, borderRadius: 3, background: "linear-gradient(to bottom,#6B9FCC,#000810)", display: "block" }} />
            <span style={{ fontSize: 10 }}>Modrá</span>
          </button>
          <button onClick={() => setBgMode("template2")} style={tplBtn("template2")}>
            <span style={{ width: 28, height: 18, borderRadius: 3, background: "#000", border: "2px solid #4A7FC1", display: "block" }} />
            <span style={{ fontSize: 10 }}>Černá</span>
          </button>
          <button onClick={() => setBgMode("custom")} style={tplBtn("custom")}>
            <span style={{ width: 28, height: 18, borderRadius: 3, background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", display: "block" }} />
            <span style={{ fontSize: 10 }}>Vlastní</span>
          </button>
        </div>

        {bgMode === "custom" && (
          <div style={{ background: "#f8f8f8", borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => setCustomSub("color")} style={{ ...mkBtn(customSub === "color"), flex: 1, fontSize: 11 }}>Barva</button>
              <button onClick={() => setCustomSub("image")} style={{ ...mkBtn(customSub === "image"), flex: 1, fontSize: 11 }}>Foto</button>
            </div>
            {customSub === "color" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#888" }}>{bgColor}</span>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", background: "#fff", border: "1px dashed #ccc", borderRadius: 6,
                  padding: "8px 12px", textAlign: "center", cursor: "pointer", fontSize: 12, color: "#555" }}>
                  📁 Nahrát fotku
                  <input type="file" accept="image/*" onChange={handleBgImage} style={{ display: "none" }} />
                </label>
                <label style={{ ...lbl, marginTop: 8 }}>Tmavý překryv</label>
                <input type="range" min="0" max="0.9" step="0.05" value={overlayOpacity}
                  onChange={e => setOverlayOpacity(parseFloat(e.target.value))} style={{ width: "100%" }} />
                <span style={{ fontSize: 11, color: "#888" }}>{Math.round(overlayOpacity * 100)} %</span>
              </div>
            )}
          </div>
        )}

        {/* Export */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
          <button onClick={() => exportAs("png")} style={{ ...mkBtn(true), flex: 1, fontSize: 13, padding: "9px 0" }}>⬇ PNG</button>
          <button onClick={() => exportAs("jpg")} style={{ ...mkBtn(true, "#374151"), flex: 1, fontSize: 13, padding: "9px 0" }}>⬇ JPG</button>
        </div>
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 5, textAlign: "center" }}>
          {fmt.w} × {fmt.h} px
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginBottom: 10,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Náhled — {fmt.label} ({fmt.w} × {fmt.h})
          </div>
          <canvas ref={canvasRef} style={{ borderRadius: 10, boxShadow: "0 6px 28px rgba(0,0,0,0.18)", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
