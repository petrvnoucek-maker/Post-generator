import { useState, useRef, useEffect, useCallback, useReducer } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_MIME   = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_DPR        = 3;                // cap devicePixelRatio
const FORMATS = [
  { id: "social",  label: "IG / FB / X", sub: "4:5",  w: 1200, h: 1500 },
  { id: "square",  label: "Čtvercový",   sub: "1:1",  w: 1200, h: 1200 },
  { id: "story",   label: "Stories",     sub: "9:16", w: 1080, h: 1920 },
];
const FONTS    = ["Inter", "Arial", "Georgia", "Times New Roman", "Verdana", "Impact", "Trebuchet MS"];
const UI       = "#1B69BF";
const BAR      = "#1B69BF";
const PREVIEW_MAX = 380;
const DEFAULTS = {
  headline: "Sem patří text", subtext: "", supertitle: "",
  textColor: "#ffffff", textAlign: "left", textPos: "bottom",
  fontFamily: "Inter", fontScale: 1.0,
  bgMode: "template2", logoVariant: "blue",
  customSub: "image", bgColor: "#1B69BF", overlayOpacity: 0.45,
  richVariant: "light", richPhotoPos: "top", richPanelColor: "#1B69BF",
  fmt: FORMATS[0],
  advancedOpen: false, // Fix #1: track panel state in reducer so reset closes it
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE REDUCER  (replaces 15× useState)
// ─────────────────────────────────────────────────────────────────────────────
function reducer(state, action) {
  if (action.type === "RESET") return { ...DEFAULTS };
  if (action.type === "SET")   return { ...state, [action.key]: action.value };
  return state;
}
function useField(dispatch, key) {
  return useCallback(v => dispatch({ type: "SET", key, value: v }), [key]);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT CANVAS — intentional module-level singleton, shared across renders
// ─────────────────────────────────────────────────────────────────────────────
const getMeasureCtx = (() => {
  let ctx = null;
  return () => {
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    return ctx;
  };
})();
function wrapLines(fontStr, text, maxW) {
  const MX = getMeasureCtx();
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

// ─────────────────────────────────────────────────────────────────────────────
// DRAW UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function drawLogoOnCanvas(ctx, cx, cy, r, variant) {
  const circleFill = variant === "black" ? "#111111" : variant === "blue" ? UI : "#ffffff";
  const aFill      = variant === "white" ? "#2B5F9E" : "#ffffff";
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
  const baselineY = cy - (capH + descH + gap + barH) / 2 + capH;
  ctx.fillText("A", cx, baselineY);
  ctx.fillRect(cx - m.actualBoundingBoxLeft, baselineY + descH + gap, barW, barH);
  ctx.restore();
}
function drawLogo(ctx, w, h, variant) {
  const r = w * 0.055;
  drawLogoOnCanvas(ctx, w - w * 0.07 - r, h * 0.055 + r, r, variant);
}
function drawCropped(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else         { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
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

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE DRAW FUNCTIONS  (🟡 split from monolithic drawPost)
// ─────────────────────────────────────────────────────────────────────────────
function drawTemplateRich(ctx, w, h, opts) {
  const { bgImage, headline, subtext, supertitle, fontFamily, fontScale,
          logoVariant, richVariant, richPhotoPos, richPanelColor } = opts;
  const ff   = `${fontFamily}, Arial, sans-serif`;
  const hs   = Math.round(w * 0.075 * fontScale);
  const ss   = Math.round(w * 0.038 * fontScale);
  const pad  = w * 0.08;
  const maxW = w * 0.84;
  const photoH = Math.round(h * 0.55), panelH = h - photoH;
  const photoY = richPhotoPos === "top" ? 0 : panelH;
  const panelY = richPhotoPos === "top" ? photoH : 0;
  const panelBg = richVariant === "light" ? "#ffffff" : richVariant === "dark" ? "#111111" : richPanelColor;
  ctx.fillStyle = panelBg; ctx.fillRect(0, panelY, w, panelH);
  if (bgImage) drawCropped(ctx, bgImage, 0, photoY, w, photoH);
  else drawPhotoPlaceholder(ctx, 0, photoY, w, photoH);
  const textCol   = richVariant === "light" ? "#111111" : "#ffffff";
  const accentCol = richVariant === "light" ? UI : richVariant === "color" ? "#ffffff" : "#6AABF0";
  const stSize  = Math.round(w * 0.034 * fontScale);
  const hasSuper = !!(supertitle && supertitle.trim());
  const hLines  = wrapLines(`bold ${hs}px ${ff}`, headline, maxW);
  const sLines  = subtext ? wrapLines(`${ss}px ${ff}`, subtext, maxW) : [];
  const blockH  = (hasSuper ? stSize * 1.7 : 0) + hLines.length * hs * 1.28 + (sLines.length ? ss * 0.9 + sLines.length * ss * 1.4 : 0);
  let ty = panelY + Math.max(panelH * 0.13, (panelH - blockH) / 2);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  if (hasSuper) { ctx.font = `bold ${stSize}px ${ff}`; ctx.fillStyle = accentCol; ctx.fillText(supertitle, pad, ty + stSize * 0.88); ty += stSize * 1.7; }
  ctx.font = `bold ${hs}px ${ff}`; ctx.fillStyle = textCol;
  hLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * hs * 1.28 + hs * 0.88));
  ty += hLines.length * hs * 1.28;
  if (sLines.length) { ty += ss * 0.9; ctx.font = `${ss}px ${ff}`; ctx.globalAlpha = 0.72; sLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * ss * 1.4 + ss * 0.88)); ctx.globalAlpha = 1; }
  drawLogo(ctx, w, h, logoVariant);
}

function drawTemplateBlack(ctx, w, h, opts) {
  const { headline, subtext, textColor, fontFamily, fontScale, textPos, logoVariant } = opts;
  const ff   = `${fontFamily}, Arial, sans-serif`;
  const hs   = Math.round(w * 0.075 * fontScale);
  const ss   = Math.round(w * 0.038 * fontScale);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  const bx = w*0.07, bw2 = Math.max(4, w*0.007), textX = bx+bw2+w*0.04, tMaxW = w*0.76;
  const lh1 = hs*1.28, lh2 = ss*1.4;
  const yBase = textPos === "top" ? h*0.12 : textPos === "center" ? h*0.38 : h*0.55;
  const hLines = wrapLines(`bold ${hs}px ${ff}`, headline, tMaxW);
  const sLines = subtext ? wrapLines(`${ss}px ${ff}`, subtext, tMaxW) : [];
  const totalH = hLines.length*lh1 + (sLines.length ? ss*0.8+sLines.length*lh2 : 0);
  ctx.fillStyle = BAR; ctx.fillRect(bx, yBase-hs*0.12, bw2, totalH+hs*0.15);
  ctx.font = `bold ${hs}px ${ff}`; ctx.fillStyle = textColor;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  hLines.forEach((l, i) => ctx.fillText(l, textX, yBase+i*lh1+hs*0.88));
  if (sLines.length) { ctx.font = `${ss}px ${ff}`; ctx.globalAlpha = 0.78; const sy2 = yBase+hLines.length*lh1+ss*1.1; sLines.forEach((l, i) => ctx.fillText(l, textX, sy2+i*lh2)); ctx.globalAlpha = 1; }
  drawLogo(ctx, w, h, logoVariant);
}

function drawTemplateStandard(ctx, w, h, opts) {
  const { bgMode, bgColor, bgImage, overlayOpacity,
          headline, subtext, textColor, fontFamily, fontScale,
          textAlign, textPos, logoVariant } = opts;
  const ff   = `${fontFamily}, Arial, sans-serif`;
  const hs   = Math.round(w * 0.075 * fontScale);
  const ss   = Math.round(w * 0.038 * fontScale);
  const pad  = w * 0.08;
  const maxW = w * 0.84;
  if (bgMode === "template1") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#6B9FCC"); g.addColorStop(0.4, "#3A6EA8"); g.addColorStop(1, "#000810");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image" && bgImage) {
    drawCropped(ctx, bgImage, 0, 0, w, h);
    ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image") {
    drawPhotoPlaceholder(ctx, 0, 0, w, h);
  } else {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
  }
  const yBase = textPos === "top" ? h*0.12 : textPos === "center" ? h*0.38 : h*0.55;
  ctx.fillStyle = textColor; ctx.textBaseline = "alphabetic";
  const drawBlock = (text, size, bold, y) => {
    const fStr = `${bold ? "bold " : ""}${size}px ${ff}`; ctx.font = fStr;
    const lines = wrapLines(fStr, text, maxW); const lh = size * (bold ? 1.28 : 1.4);
    lines.forEach((l, i) => { ctx.textAlign = textAlign; const x = textAlign==="center" ? w/2 : textAlign==="right" ? pad+maxW : pad; ctx.fillText(l, x, y+i*lh+size*0.88); });
    return lines.length * lh;
  };
  const h1h = drawBlock(headline, hs, true, yBase);
  ctx.globalAlpha = 0.82; drawBlock(subtext, ss, false, yBase+h1h+ss*0.7); ctx.globalAlpha = 1;
  drawLogo(ctx, w, h, logoVariant);
}

function drawPost(ctx, w, h, opts) {
  if (opts.bgMode === "template3") return drawTemplateRich(ctx, w, h, opts);
  if (opts.bgMode === "template2") return drawTemplateBlack(ctx, w, h, opts);
  return drawTemplateStandard(ctx, w, h, opts);
}

function renderToCanvas(canvas, fmt, opts) {
  const { w, h } = fmt;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR); // 🟡 fix: cap DPR
  const s = Math.min(PREVIEW_MAX / w, PREVIEW_MAX / h);
  canvas.width  = Math.round(w * s * dpr); canvas.height = Math.round(h * s * dpr);
  canvas.style.width  = Math.round(w * s) + "px"; canvas.style.height = Math.round(h * s) + "px";
  const ctx = canvas.getContext("2d");
  ctx.save(); ctx.scale(s * dpr, s * dpr);
  drawPost(ctx, w, h, opts);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS  (🟡 extracted from inline)
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  inp: { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", boxSizing: "border-box", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" },
  lbl: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
  uploadLabel: { display: "block", background: "#fff", border: "1px dashed #ccc", borderRadius: 6, padding: "8px 12px", textAlign: "center", cursor: "pointer", fontSize: 12, color: "#555" },
  card: { background: "#f8f8f8", borderRadius: 8, padding: 10, marginBottom: 4 },
};
const mkBtn = (active, color = UI) => ({ padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .15s", background: active ? color : "#f0f0f0", color: active ? "#fff" : "#444" });
const tplBtn = (bgMode, id) => ({ ...mkBtn(bgMode === id), padding: "9px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 });

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS  (🔴 fix: Controls extracted from App)
// ─────────────────────────────────────────────────────────────────────────────
function AdvancedSettings({ st, dispatch }) {
  const open = st.advancedOpen;
  const setOpen = val => dispatch({ type: "SET", key: "advancedOpen", value: val });
  const set = (key, val) => dispatch({ type: "SET", key, value: val });
  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", marginTop: 10, padding: "8px 10px", borderRadius: 7, border: `1px solid ${open ? UI : "#ddd"}`, background: open ? "#EFF6FF" : "#fafafa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: open ? UI : "#555" }}>
        <span>Pokročilé nastavení</span>
        <span style={{ fontSize: 10, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
      </button>
      {open && (
        <div style={{ marginTop: 4, padding: "10px 10px 4px", background: "#fafafa", borderRadius: 7, border: "1px solid #eee" }}>
          <div style={S.lbl}>Logo</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {[["blue",UI,"#fff","Modré"],["white","#fff","#2B5F9E","Bílé"],["black","#111","#fff","Černé"]].map(([v, bg, fg, lab]) => (
              <button key={v} onClick={() => set("logoVariant", v)} style={{ ...mkBtn(st.logoVariant === v), flex: 1, fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: bg, border: "1.5px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: fg, fontWeight: 700 }}>A</span>
                <span>{lab}</span>
              </button>
            ))}
          </div>
          {st.bgMode !== "template2" && st.bgMode !== "template3" && (
            <>
              <div style={S.lbl}>Zarovnání</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["left","⬅"],["center","⬛"],["right","➡"]].map(([v, ic]) => (
                  <button key={v} onClick={() => set("textAlign", v)} style={{ ...mkBtn(st.textAlign === v), flex: 1, fontSize: 14 }}>{ic}</button>
                ))}
              </div>
            </>
          )}
          {st.bgMode !== "template3" && (
            <>
              <div style={S.lbl}>Pozice textu</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["bottom","Dole"],["center","Střed"],["top","Nahoře"]].map(([v, l]) => (
                  <button key={v} onClick={() => set("textPos", v)} style={{ ...mkBtn(st.textPos === v), flex: 1, fontSize: 11 }}>{l}</button>
                ))}
              </div>
            </>
          )}
          <div style={S.lbl}>Font</div>
          <select value={st.fontFamily} onChange={e => set("fontFamily", e.target.value)} style={S.inp}>
            {FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
          <div style={S.lbl}>Velikost písma</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => set("fontScale", Math.max(0.5, Math.round((st.fontScale-0.1)*10)/10))} style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>−</button>
            <input type="range" min="0.5" max="2.0" step="0.05" value={st.fontScale} onChange={e => set("fontScale", parseFloat(e.target.value))} style={{ flex: 1 }} />
            <button onClick={() => set("fontScale", Math.min(2.0, Math.round((st.fontScale+0.1)*10)/10))} style={{ ...mkBtn(false), width: 30, padding: "4px 0", fontSize: 16, textAlign: "center" }}>+</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#888" }}>{Math.round(st.fontScale * 100)} %</span>
            <button onClick={() => set("fontScale", 1.0)} style={{ fontSize: 10, color: UI, background: "none", border: "none", cursor: "pointer", padding: 0 }}>reset</button>
          </div>
          {st.bgMode !== "template3" && (
            <>
              <div style={S.lbl}>Barva textu</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <input type="color" value={st.textColor} onChange={e => set("textColor", e.target.value)} style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#888" }}>{st.textColor}</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function RichControls({ st, dispatch, onImageUpload }) {
  const set = (key, val) => dispatch({ type: "SET", key, value: val });
  return (
    <div style={S.card}>
      <label style={S.uploadLabel}>📁 Nahrát fotku<input type="file" accept="image/*" onChange={e => onImageUpload(e, true)} style={{ display: "none" }} /></label>
      <div style={S.lbl}>Pozice fotky</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["top","Nahoře"],["bottom","Dole"]].map(([v, l]) => (
          <button key={v} onClick={() => set("richPhotoPos", v)} style={{ ...mkBtn(st.richPhotoPos === v), flex: 1, fontSize: 11 }}>{l}</button>
        ))}
      </div>
      <div style={{ ...S.lbl, marginTop: 10 }}>Varianta panelu</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["light","Světlá"],["dark","Tmavá"],["color","Barva"]].map(([v, l]) => (
          <button key={v} onClick={() => set("richVariant", v)} style={{ ...mkBtn(st.richVariant === v), flex: 1, fontSize: 11 }}>{l}</button>
        ))}
      </div>
      {st.richVariant === "color" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <input type="color" value={st.richPanelColor} onChange={e => set("richPanelColor", e.target.value)} style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
          <span style={{ fontSize: 12, color: "#888" }}>{st.richPanelColor}</span>
        </div>
      )}
    </div>
  );
}

function CustomControls({ st, dispatch, onImageUpload }) {
  const set = (key, val) => dispatch({ type: "SET", key, value: val });
  return (
    <div style={S.card}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button onClick={() => set("customSub", "image")} style={{ ...mkBtn(st.customSub === "image"), flex: 1, fontSize: 11 }}>Foto</button>
        <button onClick={() => { set("customSub", "color"); set("logoVariant", "white"); }} style={{ ...mkBtn(st.customSub === "color"), flex: 1, fontSize: 11 }}>Barva</button>
      </div>
      {st.customSub === "image" ? (
        <>
          <label style={S.uploadLabel}>📁 Nahrát fotku<input type="file" accept="image/*" onChange={e => onImageUpload(e, false)} style={{ display: "none" }} /></label>
          <div style={S.lbl}>Tmavý překryv</div>
          <input type="range" min="0" max="0.9" step="0.05" value={st.overlayOpacity} onChange={e => set("overlayOpacity", parseFloat(e.target.value))} style={{ width: "100%" }} />
          <span style={{ fontSize: 11, color: "#888" }}>{Math.round(st.overlayOpacity * 100)} %</span>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="color" value={st.bgColor} onChange={e => set("bgColor", e.target.value)} style={{ width: 34, height: 28, padding: 2, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
          <span style={{ fontSize: 12, color: "#888" }}>{st.bgColor}</span>
        </div>
      )}
    </div>
  );
}

function Controls({ st, dispatch, onImageUpload, autoResize }) {
  const set = (key, val) => dispatch({ type: "SET", key, value: val });
  return (
    <>
      <div style={S.lbl}>Formát</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {FORMATS.map(f => (
          <button key={f.id} onClick={() => set("fmt", f)} style={{ ...mkBtn(st.fmt.id === f.id), display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "7px 4px" }}>
            <span style={{ fontSize: 11 }}>{f.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{f.sub}</span>
          </button>
        ))}
      </div>

      {st.bgMode === "template3" && (
        <>
          <label style={S.lbl}>Nadtitulek</label>
          <textarea value={st.supertitle} onChange={e => { set("supertitle", e.target.value); autoResize(e); }}
            onFocus={e => e.target.select()} placeholder="Volitelný nadtitulek…"
            style={{ ...S.inp, height: 36, resize: "none", overflow: "hidden" }} />
        </>
      )}

      <label style={S.lbl}>Nadpis</label>
      <textarea value={st.headline} onChange={e => { set("headline", e.target.value); autoResize(e); }}
        onFocus={e => e.target.select()}
        style={{ ...S.inp, height: 64, resize: "none", overflow: "hidden" }} />

      <label style={S.lbl}>Perex</label>
      <textarea value={st.subtext} onChange={e => { set("subtext", e.target.value); autoResize(e); }}
        onFocus={e => e.target.select()} placeholder="Volitelný perex…"
        style={{ ...S.inp, height: 52, resize: "none", overflow: "hidden" }} />

      <div style={{ ...S.lbl, marginTop: 14 }}>Pozadí / šablona</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
        <button onClick={() => set("bgMode", "template2")} style={tplBtn(st.bgMode, "template2")}>
          <span style={{ width: 48, height: 28, borderRadius: 3, background: "#000", border: "2px solid #1B69BF", display: "block" }} />
          <span style={{ fontSize: 10 }}>Černá</span>
        </button>
        <button onClick={() => set("bgMode", "template1")} style={tplBtn(st.bgMode, "template1")}>
          <span style={{ width: 48, height: 28, borderRadius: 3, background: "linear-gradient(to bottom,#6B9FCC,#000810)", display: "block" }} />
          <span style={{ fontSize: 10 }}>Modrá</span>
        </button>
        <button onClick={() => set("bgMode", "template3")} style={tplBtn(st.bgMode, "template3")}>
          <span style={{ width: 48, height: 28, borderRadius: 3, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <span style={{ flex: "0 0 55%", background: "#aaa" }} />
            <span style={{ flex: "0 0 45%", background: "#1B69BF" }} />
          </span>
          <span style={{ fontSize: 10 }}>Rich</span>
        </button>
        <button onClick={() => { set("bgMode", "custom"); set("customSub", "image"); }} style={tplBtn(st.bgMode, "custom")}>
          <span style={{ width: 48, height: 28, borderRadius: 3, background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", display: "block" }} />
          <span style={{ fontSize: 10 }}>Vlastní</span>
        </button>
      </div>

      {st.bgMode === "template3" && <RichControls st={st} dispatch={dispatch} onImageUpload={onImageUpload} />}
      {st.bgMode === "custom"     && <CustomControls st={st} dispatch={dispatch} onImageUpload={onImageUpload} />}

      <AdvancedSettings st={st} dispatch={dispatch} />
    </>
  );
}

function Preview({ canvasRef, fmt }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Náhled — {fmt.label} ({fmt.w} × {fmt.h})
      </div>
      <canvas ref={canvasRef} style={{ borderRadius: 10, boxShadow: "0 6px 28px rgba(0,0,0,0.18)", display: "block", maxWidth: "100%" }} />
    </div>
  );
}

function Actions({ fmt, onReset, onExport, mobile = false }) {
  const pad = `${mobile ? 12 : 10}px 0`;
  const fz  = mobile ? 14 : 13;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...(!mobile && { marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee" }) }}>
      <button onClick={onReset}  style={{ ...mkBtn(false), width: "100%", fontSize: fz, padding: pad }}>Začít znovu</button>
      <button onClick={onExport} style={{ ...mkBtn(true),  width: "100%", fontSize: fz, padding: pad }}>⬇ Stáhnout</button>
      <div style={{ fontSize: 10, color: "#bbb", textAlign: "center" }}>{fmt.w} × {fmt.h} px</div>
    </div>
  );
}

function AppHeader({ logoCanvasRef }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: UI, display: "flex", alignItems: "center", gap: 8 }}>
      <canvas ref={logoCanvasRef} style={{ width: 28, height: 28, flexShrink: 0 }} />
      Post Generator
    </div>
  );
}
export default function App() {
  const [st, dispatch]        = useReducer(reducer, DEFAULTS);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isMobile, setIsMobile]         = useState(false);

  const canvasRef     = useRef(null);
  const imgRef        = useRef(null);
  const logoCanvasRef = useRef(null);
  const stRef         = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fix #4: guard against duplicate font link in React StrictMode
  useEffect(() => {
    if (document.querySelector('link[href*="Inter"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // buildOpts reads from stRef — stable reference, no recreate on every state change
  const buildOpts = useCallback((overrides = {}) => {
    const s = stRef.current;
    const effectiveBgMode = s.bgMode === "custom"
      ? (s.customSub === "image" ? "image" : "color") : s.bgMode;
    return {
      bgMode: effectiveBgMode, bgColor: s.bgColor, bgImage: imgRef.current,
      overlayOpacity: s.overlayOpacity, headline: s.headline, subtext: s.subtext,
      supertitle: s.supertitle, textColor: s.textColor, fontFamily: s.fontFamily,
      fontScale: s.fontScale, textAlign: s.textAlign, textPos: s.textPos,
      logoVariant: s.logoVariant, richVariant: s.richVariant,
      richPhotoPos: s.richPhotoPos, richPanelColor: s.richPanelColor,
      ...overrides,
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    renderToCanvas(canvas, stRef.current.fmt, buildOpts());
  }, [buildOpts]);

  const drawSidebarLogo = useCallback(() => {
    const c = logoCanvasRef.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR); // 🟡 fix: cap DPR
    const size = 28;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + "px"; c.style.height = size + "px";
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    drawLogoOnCanvas(ctx, size/2, size/2, size/2 - 1, "blue");
  }, []);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => {
    document.fonts.load("bold 40px Inter").then(() => {
      const MX = getMeasureCtx();
      MX.font = "bold 40px Inter"; MX.measureText("A");
      redraw(); drawSidebarLogo();
    });
  }, []);

  const autoResize = e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; };

  // 🔴 fix: MIME validation + 🟡 fix: file size limit + 🟡 fix: no DOM injection
  const handleImageUpload = useCallback((e, isRich = false) => {
    const file = e.target.files?.[0]; if (!file) return;

    // Fix #2: capture input ref before async operations — avoids null e.target
    const input = e.target;

    if (!ALLOWED_MIME.includes(file.type)) {
      alert(`Nepodporovaný formát souboru.\nPovolené typy: JPEG, PNG, WebP, GIF.`);
      input.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      alert(`Soubor je příliš velký (max 20 MB).`);
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const allowedPrefixes = ALLOWED_MIME.map(m => `data:${m};base64,`);
      if (!allowedPrefixes.some(p => dataUrl.startsWith(p))) {
        console.warn("Blocked suspicious data URL");
        input.value = "";
        return;
      }
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current; if (!canvas) return;
        const overrides = isRich
          ? { bgMode: "template3", bgImage: img }
          : { bgMode: "image",     bgImage: img };
        if (!isRich) {
          dispatch({ type: "SET", key: "bgMode",    value: "custom" });
          dispatch({ type: "SET", key: "customSub", value: "image"  });
        }
        renderToCanvas(canvas, stRef.current.fmt, buildOpts(overrides));
      };
      // Fix #5: user-visible error feedback on image load failure
      img.onerror = () => {
        alert("Obrázek se nepodařilo načíst. Zkuste jiný soubor.");
        input.value = "";
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      alert("Chyba při čtení souboru. Zkuste to znovu.");
      input.value = "";
    };
    reader.readAsDataURL(file);
  }, [buildOpts]);

  // Fix #6: synchronous stRef update prevents export race window after reset
  const doReset = () => {
    dispatch({ type: "RESET" });
    stRef.current = DEFAULTS;
    imgRef.current = null;
    setConfirmReset(false);
  };

  const exportAs = () => {
    const { w, h } = st.fmt;
    const off = document.createElement("canvas"); off.width = w; off.height = h;
    drawPost(off.getContext("2d"), w, h, buildOpts());
    // 🟡 fix: dispatchEvent without appendChild — avoids DOM injection vector
    const a = document.createElement("a");
    a.href     = off.toDataURL("image/png", 0.93);
    a.download = `aktualne-${st.fmt.id}.png`;
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  };

  const controlsProps = { st, dispatch, onImageUpload: handleImageUpload, autoResize };
  const actionsProps  = { fmt: st.fmt, onReset: () => setConfirmReset(true), onExport: exportAs };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f4f5f7", minHeight: "100vh" }}>

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

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#fff", borderBottom: "1px solid #e6e6e6", padding: "14px 16px", position: "sticky", top: 0, zIndex: 10 }}>
            <AppHeader logoCanvasRef={logoCanvasRef} />
          </div>
          <div style={{ background: "#fff", padding: "16px 16px 8px", borderBottom: "1px solid #e6e6e6" }}>
            <Controls {...controlsProps} />
          </div>
          <div style={{ background: "#f4f5f7", padding: "24px 16px 8px" }}>
            <Preview canvasRef={canvasRef} fmt={st.fmt} />
          </div>
          <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #eee", padding: "12px 16px" }}>
            <Actions {...actionsProps} mobile />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <div style={{ width: 268, background: "#fff", borderRight: "1px solid #e6e6e6", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ marginBottom: 16 }}><AppHeader logoCanvasRef={logoCanvasRef} /></div>
            <Controls {...controlsProps} />
            <Actions {...actionsProps} />
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Preview canvasRef={canvasRef} fmt={st.fmt} />
          </div>
        </div>
      )}
    </div>
  );
}
