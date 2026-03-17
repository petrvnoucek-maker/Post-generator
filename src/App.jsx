import { useState, useRef, useEffect, useCallback } from "react";

const FORMATS = [
  { id: "social",  label: "IG / FB / X", sub: "4:5",  w: 1200, h: 1500 },
  { id: "square",  label: "Čtvercový",   sub: "1:1",  w: 1200, h: 1200 },
  { id: "story",   label: "Stories",     sub: "9:16", w: 1080, h: 1920 },
];
const FONTS = ["Inter", "Arial", "Georgia", "Times New Roman", "Verdana", "Impact", "Trebuchet MS"];
const UI  = "#1B69BF";
const BAR = "#1B69BF";
const PREVIEW_MAX = 380;

// ── Measurement canvas — no transforms, pure 1:1 ──────────────────────────
const MC = document.createElement("canvas");
const MX = MC.getContext("2d");
function wrapLines(fontStr, text, maxW) {
  MX.font = fontStr;
  const words = (text || "").split(" ").filter(Boolean);
  const lines = []; let line = "";
  for (const word of words) {
    const test = line + word + " ";
    if (MX.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + " "; }
    else line = test;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// ── Logo ──────────────────────────────────────────────────────────────────
function drawLogoOnCanvas(ctx, cx, cy, r, variant) {
  const circleFill = variant === "black" ? "#111111" : variant === "blue" ? "#1B69BF" : "#ffffff";
  const aFill = variant === "white" ? "#2B5F9E" : "#ffffff";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)"; ctx.shadowBlur = r * 0.4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = circleFill; ctx.fill(); ctx.shadowBlur = 0;
  const fs = r * 1.32;
  ctx.font = `bold ${fs}px Inter, Arial`;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center"; ctx.fillStyle = aFill;
  const m = ctx.measureText("A");
  const capH = m.actualBoundingBoxAscent, descH = m.actualBoundingBoxDescent;
  const barW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const gap = r * 0.10, barH = Math.max(2, r * 0.18);
  const totalH = capH + descH + gap + barH;
  const baselineY = cy - totalH / 2 + capH;
  ctx.fillText("A", cx, baselineY);
  ctx.fillRect(cx - m.actualBoundingBoxLeft, baselineY + descH + gap, barW, barH);
  ctx.restore();
}
function drawLogo(ctx, w, h, variant) {
  const r = w * 0.055;
  drawLogoOnCanvas(ctx, w - w * 0.07 - r, h * 0.055 + r, r, variant);
}

// ── Photo placeholder ─────────────────────────────────────────────────────
function drawPhotoPlaceholder(ctx, areaX, areaY, areaW, areaH) {
  ctx.fillStyle = "#c8c8c8"; ctx.fillRect(areaX, areaY, areaW, areaH);
  const cx = areaX + areaW / 2, cy = areaY + areaH * 0.5;
  const ic = Math.min(areaW, areaH) * 0.18;
  ctx.save(); ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#222"; ctx.fillStyle = "#222";
  ctx.lineWidth = ic * 0.07; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const rw = ic*1.1, rh = ic*0.85, rx = cx-rw/2, ry = cy-rh/2-ic*0.1, rad = ic*0.08;
  ctx.beginPath();
  ctx.moveTo(rx+rad,ry); ctx.lineTo(rx+rw-rad,ry); ctx.arcTo(rx+rw,ry,rx+rw,ry+rad,rad);
  ctx.lineTo(rx+rw,ry+rh-rad); ctx.arcTo(rx+rw,ry+rh,rx+rw-rad,ry+rh,rad);
  ctx.lineTo(rx+rad,ry+rh); ctx.arcTo(rx,ry+rh,rx,ry+rh-rad,rad);
  ctx.lineTo(rx,ry+rad); ctx.arcTo(rx,ry,rx+rad,ry,rad);
  ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, ry+rh*0.75); ctx.lineTo(cx, ry+rh*0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-ic*0.18, ry+rh*0.44); ctx.lineTo(cx, ry+rh*0.25); ctx.lineTo(cx+ic*0.18, ry+rh*0.44); ctx.stroke();
  ctx.font = `bold ${areaW * 0.032}px Inter, Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Nahrát fotku", cx, cy + ic * 0.65);
  ctx.restore();
}

// ── Crop-fit image ────────────────────────────────────────────────────────
function drawCropped(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width-sw)/2; sy = 0; }
  else { sw = img.width; sh = sw/cr; sx = 0; sy = (img.height-sh)/2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ── Main draw ─────────────────────────────────────────────────────────────
function drawPost(ctx, w, h, opts) {
  const { bgMode, bgColor, bgImage, overlayOpacity,
          headline, subtext, supertitle, textColor, fontFamily, fontScale,
          textAlign, textPos, logoVariant,
          richVariant, richPhotoPos, richPanelColor } = opts;
  const ff  = `${fontFamily}, Arial, sans-serif`;
  const hs  = Math.round(w * 0.075 * fontScale);
  const ss  = Math.round(w * 0.038 * fontScale);
  const pad = w * 0.08;
  const maxW = w * 0.84;

  // ── RICH ────────────────────────────────────────────────────────────────
  if (bgMode === "template3") {
    const photoFrac = 0.55;
    const photoH = Math.round(h * photoFrac);
    const panelH = h - photoH;
    const photoY = richPhotoPos === "top" ? 0 : panelH;
    const panelY = richPhotoPos === "top" ? photoH : 0;
    const panelBg = richVariant === "light" ? "#ffffff"
                  : richVariant === "dark"  ? "#111111"
                  : richPanelColor;
    ctx.fillStyle = panelBg; ctx.fillRect(0, panelY, w, panelH);
    if (bgImage) drawCropped(ctx, bgImage, 0, photoY, w, photoH);
    else drawPhotoPlaceholder(ctx, 0, photoY, w, photoH);

    const textCol   = richVariant === "light" ? "#111111" : "#ffffff";
    const accentCol = richVariant === "light" ? "#1B69BF"
                    : richVariant === "color" ? "#ffffff"
                    :                           "#6AABF0";
    const stSize = Math.round(w * 0.034 * fontScale);
    const hasSuper = !!(supertitle && supertitle.trim());
    const hFont = `bold ${hs}px ${ff}`;
    const sFont = `${ss}px ${ff}`;
    const stFont = `bold ${stSize}px ${ff}`;
    const hLines = wrapLines(hFont, headline, maxW);
    const sLines = subtext ? wrapLines(sFont, subtext, maxW) : [];
    const blockH = (hasSuper ? stSize * 1.7 : 0)
                 + hLines.length * hs * 1.28
                 + (sLines.length ? ss * 0.9 + sLines.length * ss * 1.4 : 0);
    const panelPad = panelH * 0.13;
    let ty = panelY + Math.max(panelPad, (panelH - blockH) / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    if (hasSuper) {
      ctx.font = stFont; ctx.fillStyle = accentCol;
      ctx.fillText(supertitle, pad, ty + stSize * 0.88);
      ty += stSize * 1.7;
    }
    ctx.font = hFont; ctx.fillStyle = textCol;
    hLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * hs * 1.28 + hs * 0.88));
    ty += hLines.length * hs * 1.28;
    if (sLines.length) {
      ty += ss * 0.9; ctx.font = sFont; ctx.globalAlpha = 0.72;
      sLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * ss * 1.4 + ss * 0.88));
      ctx.globalAlpha = 1;
    }
    drawLogo(ctx, w, h, logoVariant);
    return;
  }

  // ── BACKGROUNDS ─────────────────────────────────────────────────────────
  if (bgMode === "template1") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#6B9FCC"); g.addColorStop(0.4, "#3A6EA8"); g.addColorStop(1, "#000810");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "template2") {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image" && bgImage) {
    drawCropped(ctx, bgImage, 0, 0, w, h);
    ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image") {
    drawPhotoPlaceholder(ctx, 0, 0, w, h);
  } else {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
  }

  // ── TEXT ────────────────────────────────────────────────────────────────
  const yBase = textPos === "top" ? h*0.12 : textPos === "center" ? h*0.38 : h*0.55;

  if (bgMode === "template2") {
    const bx = w*0.07, bw2 = Math.max(4, w*0.007);
    const textX = bx + bw2 + w*0.04;
    const tMaxW = w * 0.76;
    const lh1 = hs*1.28, lh2 = ss*1.4;
    const hLines = wrapLines(`bold ${hs}px ${ff}`, headline, tMaxW);
    const sLines = subtext ? wrapLines(`${ss}px ${ff}`, subtext, tMaxW) : [];
    const totalTextH = hLines.length*lh1 + (sLines.length ? ss*0.8+sLines.length*lh2 : 0);
    ctx.fillStyle = BAR; ctx.fillRect(bx, yBase-hs*0.12, bw2, totalTextH+hs*0.15);
    ctx.font = `bold ${hs}px ${ff}`; ctx.fillStyle = textColor;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    hLines.forEach((l, i) => ctx.fillText(l, textX, yBase+i*lh1+hs*0.88));
    if (sLines.length) {
      ctx.font = `${ss}px ${ff}`; ctx.globalAlpha = 0.78;
      const sy2 = yBase + hLines.length*lh1 + ss*1.1;
      sLines.forEach((l, i) => ctx.fillText(l, textX, sy2+i*lh2));
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = textColor; ctx.textBaseline = "alphabetic";
    const drawBlock = (text, size, bold, y) => {
      const fStr = `${bold ? "bold " : ""}${size}px ${ff}`;
      ctx.font = fStr;
      const lines = wrapLines(fStr, text, maxW);
      const lh = size * (bold ? 1.28 : 1.4);
      lines.forEach((l, i) => {
        ctx.textAlign = textAlign;
        const x = textAlign==="center" ? w/2 : textAlign==="right" ? pad+maxW : pad;
        ctx.fillText(l, x, y + i*lh + size*0.88);
      });
      return lines.length * lh;
    };
    const h1h = drawBlock(headline, hs, true, yBase);
    ctx.globalAlpha = 0.82;
    drawBlock(subtext, ss, false, yBase + h1h + ss*0.7);
    ctx.globalAlpha = 1;
  }

  drawLogo(ctx, w, h, logoVariant);
}

// ── Render to canvas with DPR ─────────────────────────────────────────────
function renderToCanvas(canvas, fmt, opts) {
  const { w, h } = fmt;
  const dpr = window.devicePixelRatio || 1;
  const s   = Math.min(PREVIEW_MAX / w, PREVIEW_MAX / h);
  canvas.width  = Math.round(w * s * dpr);
  canvas.height = Math.round(h * s * dpr);
  canvas.style.width  = Math.round(w * s) + "px";
  canvas.style.height = Math.round(h * s) + "px";
  const ctx = canvas.getContext("2d");
  ctx.save(); ctx.scale(s * dpr, s * dpr);
  drawPost(ctx, w, h, opts);
  ctx.restore();
}

// ── Defaults ──────────────────────────────────────────────────────────────
const DEFAULTS = {
  headline: "Sem patří text", subtext: "", supertitle: "",
  textColor: "#ffffff", textAlign: "left", textPos: "bottom",
  fontFamily: "Inter", fontScale: 1.0,
  bgMode: "template2", logoVariant: "blue",
  customSub: "image", bgColor: "#1B69BF", overlayOpacity: 0.45,
  richVariant: "light", richPhotoPos: "top", richPanelColor: "#1B69BF",
};

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [fmt, setFmt]                   = useState(FORMATS[0]);
  const [headline, setHeadline]         = useState(DEFAULTS.headline);
  const [subtext, setSubtext]           = useState(DEFAULTS.subtext);
  const [supertitle, setSupertitle]     = useState(DEFAULTS.supertitle);
  const [textColor, setTextColor]       = useState(DEFAULTS.textColor);
  const [textAlign, setTextAlign]       = useState(DEFAULTS.textAlign);
  const [textPos, setTextPos]           = useState(DEFAULTS.textPos);
  const [fontFamily, setFontFamily]     = useState(DEFAULTS.fontFamily);
  const [fontScale, setFontScale]       = useState(DEFAULTS.fontScale);
  const [advOpen, setAdvOpen]           = useState(false);
  const [bgMode, setBgMode]             = useState(DEFAULTS.bgMode);
  const [logoVariant, setLogoVariant]   = useState(DEFAULTS.logoVariant);
  const [customSub, setCustomSub]       = useState(DEFAULTS.customSub);
  const [bgColor, setBgColor]           = useState(DEFAULTS.bgColor);
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULTS.overlayOpacity);
  const [richVariant, setRichVariant]   = useState(DEFAULTS.richVariant);
  const [richPhotoPos, setRichPhotoPos] = useState(DEFAULTS.richPhotoPos);
  const [richPanelColor, setRichPanelColor] = useState(DEFAULTS.richPanelColor);
  const [confirmReset, setConfirmReset] = useState(false);

  const canvasRef     = useRef(null);
  const imgRef        = useRef(null);
  const logoCanvasRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const effectiveBgMode = bgMode === "custom"
    ? (customSub === "image" ? "image" : "color") : bgMode;

  const currentOpts = useCallback(() => ({
    bgMode: effectiveBgMode, bgColor, bgImage: imgRef.current,
    overlayOpacity, headline, subtext, supertitle, textColor,
    fontFamily, fontScale, textAlign, textPos, logoVariant,
    richVariant, richPhotoPos, richPanelColor,
  }), [effectiveBgMode, bgColor, overlayOpacity, headline, subtext, supertitle,
       textColor, fontFamily, fontScale, textAlign, textPos, logoVariant,
       richVariant, richPhotoPos, richPanelColor]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    renderToCanvas(canvas, fmt, currentOpts());
  }, [fmt, currentOpts]);

  const drawSidebarLogo = useCallback(() => {
    const c = logoCanvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 28;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + "px"; c.style.height = size + "px";
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    drawLogoOnCanvas(ctx, size/2, size/2, size/2 - 1, "blue");
  }, []);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => {
    document.fonts.load("bold 40px Inter").then(() => {
      // Also prime measurement ctx with Inter
      MX.font = "bold 40px Inter";
      MX.measureText("A");
      redraw(); drawSidebarLogo();
    });
  }, []);

  const doReset = () => {
    setHeadline(DEFAULTS.headline); setSubtext(DEFAULTS.subtext); setSupertitle(DEFAULTS.supertitle);
    setTextColor(DEFAULTS.textColor); setTextAlign(DEFAULTS.textAlign); setTextPos(DEFAULTS.textPos);
    setFontFamily(DEFAULTS.fontFamily); setFontScale(DEFAULTS.fontScale);
    setBgMode(DEFAULTS.bgMode); setLogoVariant(DEFAULTS.logoVariant);
    setCustomSub(DEFAULTS.customSub); setBgColor(DEFAULTS.bgColor); setOverlayOpacity(DEFAULTS.overlayOpacity);
    setRichVariant(DEFAULTS.richVariant); setRichPhotoPos(DEFAULTS.richPhotoPos); setRichPanelColor(DEFAULTS.richPanelColor);
    setFmt(FORMATS[0]); imgRef.current = null; setConfirmReset(false);
  };

  const autoResize = e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; };

  const handleImageUpload = (e, isRich = false) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current; if (!canvas) return;
        const drawBgMode = isRich ? "template3" : "image";
        if (!isRich) { setBgMode("custom"); setCustomSub("image"); }
        renderToCanvas(canvas, fmt, { ...currentOpts(), bgMode: drawBgMode, bgImage: img });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const exportAs = type => {
    const { w, h } = fmt;
    const off = document.createElement("canvas"); off.width = w; off.height = h;
    drawPost(off.getContext("2d"), w, h, currentOpts());
    const a = document.createElement("a");
    a.href = off.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.93);
    a.download = `aktualne-${fmt.id}.${type}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const inp = { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", boxSizing: "border-box", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" };
  const mkBtn = (active, color = UI) => ({ padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .15s", background: active ? color : "#f0f0f0", color: active ? "#fff" : "#444" });
  const tplBtn = id => ({ ...mkBtn(bgMode === id), padding: "9px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 });

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", background: "#f4f5f7" }}>

      {confirmReset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", width: 300, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#222", marginBottom: 8 }}>Začít znovu?</div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>Skutečně chcete smazat dosavadní práci?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmReset(false)} style={{ ...mkBtn(false), flex: 1, padding: "9px 0", fontSize: 13 }}>Ne</button>
              <button onClick={doReset} style={{ ...mkBtn(true), flex: 1, padding: "9px 0", fontSize: 13 }}>Ano</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: 268, background: "#fff", borderRight: "1px solid #e6e6e6", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }}>

        <div style={{ fontSize: 15, fontWeight: 700, color: UI, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <canvas ref={logoCanvasRef} style={{ width: 28, height: 28, flexShrink: 0 }} />
          Post Generator
        </div>

        <div style={lbl}>Formát</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setFmt(f)} style={{ ...mkBtn(fmt.id === f.id), display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "7px 4px" }}>
              <span style={{ fontSize: 11 }}>{f.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{f.sub}</span>
            </button>
          ))}
        </div>

        {bgMode === "template3" && (
          <>
            <label style={lbl}>Nadtitulek</label>
            <textarea value={supertitle} onChange={e => { setSupertitle(e.target.value); autoResize(e); }}
              onFocus={e => e.target.select()} placeholder="Volitelný nadtitulek…"
              style={{ ...inp, height: 36, resize: "none", overflow: "hidden" }} />
          </>
        )}

        <label style={lbl}>Nadpis</label>
        <textarea value={headline} onChange={e => { setHeadline(e.target.value); autoResize(e); }}
          onFocus={e => e.target.select()}
          style={{ ...inp, height: 64, resize: "none", overflow: "hidden" }} />

        <label style={lbl}>Perex</label>
        <textarea value={subtext} onChange={e => { setSubtext(e.target.value); autoResize(e); }}
          onFocus={e => e.target.select()} placeholder="Volitelný perex…"
          style={{ ...inp, height: 52, resize: "none", overflow: "hidden" }} />

        <label style={{ ...lbl, marginTop: 14 }}>Pozadí / šablona</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <button onClick={() => setBgMode("template2")} style={tplBtn("template2")}>
            <span style={{ width: 48, height: 28, borderRadius: 3, background: "#000", border: "2px solid #1B69BF", display: "block" }} />
            <span style={{ fontSize: 10 }}>Černá</span>
          </button>
          <button onClick={() => setBgMode("template1")} style={tplBtn("template1")}>
            <span style={{ width: 48, height: 28, borderRadius: 3, background: "linear-gradient(to bottom,#6B9FCC,#000810)", display: "block" }} />
            <span style={{ fontSize: 10 }}>Modrá</span>
          </button>
          <button onClick={() => setBgMode("template3")} style={tplBtn("template3")}>
            <span style={{ width: 48, height: 28, borderRadius: 3, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <span style={{ flex: "0 0 55%", background: "#aaa" }} />
              <span style={{ flex: "0 0 45%", background: "#1B69BF" }} />
            </span>
            <span style={{ fontSize: 10 }}>Rich</span>
          </button>
          <button onClick={() => { setBgMode("custom"); setCustomSub("image"); }} style={tplBtn("custom")}>
            <span style={{ width: 48, height: 28, borderRadius: 3, background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", display: "block" }} />
            <span style={{ fontSize: 10 }}>Vlastní</span>
          </button>
        </div>

        {bgMode === "template3" && (
          <div style={{ background: "#f8f8f8", borderRadius: 8, padding: 10, marginBottom: 4 }}>
            <label style={{ display: "block", background: "#fff", border: "1px dashed #ccc", borderRadius: 6, padding: "8px 12px", textAlign: "center", cursor: "pointer", fontSize: 12, color: "#555" }}>
              📁 Nahrát fotku
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, true)} style={{ display: "none" }} />
            </label>
            <label style={{ ...lbl, marginTop: 10 }}>Pozice fotky</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["top","Nahoře"],["bottom","Dole"]].map(([v, l]) => (
                <button key={v} onClick={() => setRichPhotoPos(v)} style={{ ...mkBtn(richPhotoPos === v), flex: 1, fontSize: 11 }}>{l}</button>
              ))}
            </div>
            <label style={{ ...lbl, marginTop: 10 }}>Varianta panelu</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["light","Světlá"],["dark","Tmavá"],["color","Barva"]].map(([v, l]) => (
                <button key={v} onClick={() => setRichVariant(v)} style={{ ...mkBtn(richVariant === v), flex: 1, fontSize: 11 }}>{l}</button>
              ))}
            </div>
            {richVariant === "color" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input type="color" value={richPanelColor} onChange={e => setRichPanelColor(e.target.value)}
                  style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#888" }}>{richPanelColor}</span>
              </div>
            )}
          </div>
        )}

        {bgMode === "custom" && (
          <div style={{ background: "#f8f8f8", borderRadius: 8, padding: 10, marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => setCustomSub("image")} style={{ ...mkBtn(customSub === "image"), flex: 1, fontSize: 11 }}>Foto</button>
              <button onClick={() => { setCustomSub("color"); setLogoVariant("white"); }} style={{ ...mkBtn(customSub === "color"), flex: 1, fontSize: 11 }}>Barva</button>
            </div>
            {customSub === "image" ? (
              <>
                <label style={{ display: "block", background: "#fff", border: "1px dashed #ccc", borderRadius: 6, padding: "8px 12px", textAlign: "center", cursor: "pointer", fontSize: 12, color: "#555" }}>
                  📁 Nahrát fotku
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, false)} style={{ display: "none" }} />
                </label>
                <label style={{ ...lbl, marginTop: 8 }}>Tmavý překryv</label>
                <input type="range" min="0" max="0.9" step="0.05" value={overlayOpacity}
                  onChange={e => setOverlayOpacity(parseFloat(e.target.value))} style={{ width: "100%" }} />
                <span style={{ fontSize: 11, color: "#888" }}>{Math.round(overlayOpacity * 100)} %</span>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#888" }}>{bgColor}</span>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setAdvOpen(o => !o)} style={{ width: "100%", marginTop: 10, padding: "8px 10px", borderRadius: 7, border: `1px solid ${advOpen ? UI : "#ddd"}`, background: advOpen ? "#EFF6FF" : "#fafafa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: advOpen ? UI : "#555" }}>
          <span>Pokročilé nastavení</span>
          <span style={{ fontSize: 10, display: "inline-block", transform: advOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
        </button>

        {advOpen && (
          <div style={{ marginTop: 4, padding: "10px 10px 4px", background: "#fafafa", borderRadius: 7, border: "1px solid #eee" }}>
            <label style={lbl}>Logo</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {[["blue",UI,"#fff","Modré"],["white","#fff","#2B5F9E","Bílé"],["black","#111","#fff","Černé"]].map(([v, bg, fg, lab]) => (
                <button key={v} onClick={() => setLogoVariant(v)} style={{ ...mkBtn(logoVariant === v), flex: 1, fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: bg, border: "1.5px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: fg, fontWeight: 700 }}>A</span>
                  <span>{lab}</span>
                </button>
              ))}
            </div>

            {bgMode !== "template2" && bgMode !== "template3" && (
              <>
                <label style={lbl}>Zarovnání</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["left","⬅"],["center","⬛"],["right","➡"]].map(([v, ic]) => (
                    <button key={v} onClick={() => setTextAlign(v)} style={{ ...mkBtn(textAlign === v), flex: 1, fontSize: 14 }}>{ic}</button>
                  ))}
                </div>
              </>
            )}

            {bgMode !== "template3" && (
              <>
                <label style={lbl}>Pozice textu</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["bottom","Dole"],["center","Střed"],["top","Nahoře"]].map(([v, l]) => (
                    <button key={v} onClick={() => setTextPos(v)} style={{ ...mkBtn(textPos === v), flex: 1, fontSize: 11 }}>{l}</button>
                  ))}
                </div>
              </>
            )}

            <label style={lbl}>Font</label>
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={inp}>
              {FONTS.map(f => <option key={f}>{f}</option>)}
            </select>

            <label style={lbl}>Velikost písma</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setFontScale(s => Math.max(0.5, Math.round((s-0.1)*10)/10))} style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>−</button>
              <input type="range" min="0.5" max="2.0" step="0.05" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <button onClick={() => setFontScale(s => Math.min(2.0, Math.round((s+0.1)*10)/10))} style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>+</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#888" }}>{Math.round(fontScale * 100)} %</span>
              <button onClick={() => setFontScale(1.0)} style={{ fontSize: 10, color: UI, background: "none", border: "none", cursor: "pointer", padding: 0 }}>reset</button>
            </div>

            {bgMode !== "template3" && (
              <>
                <label style={lbl}>Barva textu</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{textColor}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setConfirmReset(true)} style={{ ...mkBtn(false), width: "100%", fontSize: 13, padding: "10px 0" }}>Začít znovu</button>
          <button onClick={() => exportAs("png")} style={{ ...mkBtn(true), width: "100%", fontSize: 13, padding: "10px 0" }}>⬇ Stáhnout</button>
        </div>
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 8, textAlign: "center" }}>{fmt.w} × {fmt.h} px</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Náhled — {fmt.label} ({fmt.w} × {fmt.h})
          </div>
          <canvas ref={canvasRef} style={{ borderRadius: 10, boxShadow: "0 6px 28px rgba(0,0,0,0.18)", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
