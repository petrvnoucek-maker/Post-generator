import { useState, useRef, useEffect, useCallback, useReducer } from "react";

const ALLOWED_MIME        = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_BYTES      = 20 * 1024 * 1024;
const MAX_DPR             = 3;
const PREVIEW_MAX_DESKTOP = 570;
const PREVIEW_MAX_MOBILE  = 380;

const FORMATS = [
  { id: "social",  label: "IG / FB / X", sub: "4:5",  w: 1200, h: 1500 },
  { id: "square",  label: "Čtvercový",   sub: "1:1",  w: 1200, h: 1200 },
  { id: "story",   label: "Stories",     sub: "9:16", w: 1080, h: 1920 },
];
const FONTS = ["Inter", "Barlow", "Arial", "Georgia", "Times New Roman", "Verdana", "Impact", "Trebuchet MS"];
const UI   = "#1B69BF";
const BAR  = "#1B69BF";
const ZENA = "#7B3FAF";
const TEMPLATE_NAMES = { template1:"modra", template2:"cerna", template3:"rich", image:"foto", color:"vlastni", templateZena:"zena" };

const ZENA_LOGO_B64 = "data:image/png;base64,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";
const _zenaLogoImg = (() => { let img = null; return () => { if (!img) { img = new Image(); img.src = ZENA_LOGO_B64; } return img; }; })();

const DEFAULTS = {
  headline: "Sem patří text", subtext: "", supertitle: "", photoCredit: "", creditColor: "#ffffff",
  textColor: "#ffffff", textAlign: "left", textPos: "bottom",
  fontFamily: "Inter", fontScale: 1.0,
  bgMode: "template2", logoVariant: "blue",
  customSub: "image", bgColor: "#1B69BF", overlayOpacity: 0.45,
  richVariant: "light", richPhotoPos: "top", richPanelColor: "#1B69BF",
  zenaOverlay: "dark", zenaOverlayOpacity: 0.85,
  fmt: FORMATS[0], advancedOpen: false, cropRect: null,
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const LIGHT = {
  bgMain:"#f4f5f7", bgSidebar:"#ffffff", bgCard:"#f8f8f8", bgAdvanced:"#fafafa", bgInput:"#ffffff",
  border:"#e6e6e6", borderLight:"#eee", borderDashed:"#ccc",
  textPrimary:"#333", textSecondary:"#555", textMuted:"#888", textFaint:"#bbb",
  btnInactiveBg:"#f0f0f0", btnInactiveColor:"#444", advActiveBg:"#EFF6FF", uploadBg:"#fff",
};
const DARK = {
  bgMain:"#1a1a1a", bgSidebar:"#242424", bgCard:"#2e2e2e", bgAdvanced:"#2a2a2a", bgInput:"#333",
  border:"#383838", borderLight:"#333", borderDashed:"#555",
  textPrimary:"#e8e8e8", textSecondary:"#aaa", textMuted:"#777", textFaint:"#555",
  btnInactiveBg:"#363636", btnInactiveColor:"#ccc", advActiveBg:"#1a2a3a", uploadBg:"#2e2e2e",
};
function useDarkMode() {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = e => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return dark;
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  if (action.type === "RESET") return { ...DEFAULTS };
  if (action.type === "SET")   return { ...state, [action.key]: action.value };
  return state;
}

// ── Measurement canvas ────────────────────────────────────────────────────────
const getMeasureCtx = (() => {
  let ctx = null;
  return () => { if (!ctx) ctx = document.createElement("canvas").getContext("2d"); return ctx; };
})();
function wrapLines(fontStr, text, maxW) {
  const MX = getMeasureCtx(); MX.font = fontStr;
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

// ── Draw utilities ────────────────────────────────────────────────────────────
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
function drawCropped(ctx, img, x, y, w, h, cropRect) {
  if (cropRect) {
    ctx.drawImage(img, cropRect.sx, cropRect.sy, cropRect.srcW, cropRect.srcH, x, y, w, h);
  } else {
    const ir = img.width / img.height, cr = w / h;
    let sx, sy, sw, sh;
    if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
    else         { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
}
function drawPhotoPlaceholder(ctx, areaX, areaY, areaW, areaH, cyFrac = 0.5) {
  ctx.fillStyle = "#c8c8c8"; ctx.fillRect(areaX, areaY, areaW, areaH);
  const cx = areaX + areaW / 2, cy = areaY + areaH * cyFrac;
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
function drawPhotoCredit(ctx, w, h, credit, creditColor) {
  if (!credit || !credit.trim()) return;
  const text = `Foto: ${credit.trim()}`;
  const size = Math.round(w * 0.022);
  const pad  = Math.round(w * 0.025);
  ctx.save();
  ctx.font = `${size}px Inter, Arial`;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "right";
  ctx.globalAlpha = 0.75; ctx.fillStyle = creditColor || "#ffffff";
  ctx.fillText(text, w - pad, h - pad);
  ctx.restore();
}

// ── Žena logo ─────────────────────────────────────────────────────────────────
function drawZenaLogo(ctx, w, h) {
  const img    = _zenaLogoImg();
  const logoW  = w * 0.285;
  const logoH  = logoW * (60 / 138);
  const padX   = w * 0.052;
  const padY   = h * 0.038;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur  = w * 0.014;
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, padX, padY, logoW, logoH);
  }
  ctx.restore();
}

// ── Template draw functions ───────────────────────────────────────────────────
function drawTemplateRich(ctx, w, h, opts) {
  const { bgImage, headline, subtext, supertitle, fontFamily, fontScale,
          logoVariant, richVariant, richPhotoPos, richPanelColor, cropRect, photoCredit } = opts;
  const ff = `${fontFamily}, Arial, sans-serif`;
  const hs = Math.round(w * 0.075 * fontScale), ss = Math.round(w * 0.038 * fontScale);
  const pad = w * 0.08, maxW = w * 0.84;
  const photoH = Math.round(h * 0.55), panelH = h - photoH;
  const photoY = richPhotoPos === "top" ? 0 : panelH;
  const panelY = richPhotoPos === "top" ? photoH : 0;
  const panelBg = richVariant === "light" ? "#ffffff" : richVariant === "dark" ? "#111111" : richPanelColor;
  ctx.fillStyle = panelBg; ctx.fillRect(0, panelY, w, panelH);
  if (bgImage) drawCropped(ctx, bgImage, 0, photoY, w, photoH, cropRect);
  else drawPhotoPlaceholder(ctx, 0, photoY, w, photoH, 0.5);
  const textCol   = richVariant === "light" ? "#111111" : "#ffffff";
  const accentCol = richVariant === "light" ? UI : richVariant === "color" ? "#ffffff" : "#6AABF0";
  const stSize = Math.round(w * 0.034 * fontScale);
  const hasSuper = !!(supertitle && supertitle.trim());
  const hLines = wrapLines(`bold ${hs}px ${ff}`, headline, maxW);
  const sLines = subtext ? wrapLines(`${ss}px ${ff}`, subtext, maxW) : [];
  const blockH = (hasSuper ? stSize * 1.7 : 0) + hLines.length * hs * 1.28 + (sLines.length ? ss * 0.9 + sLines.length * ss * 1.4 : 0);
  let ty = panelY + Math.max(panelH * 0.13, (panelH - blockH) / 2);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  if (hasSuper) { ctx.font = `bold ${stSize}px ${ff}`; ctx.fillStyle = accentCol; ctx.fillText(supertitle, pad, ty + stSize * 0.88); ty += stSize * 1.7; }
  ctx.font = `bold ${hs}px ${ff}`; ctx.fillStyle = textCol;
  hLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * hs * 1.28 + hs * 0.88));
  ty += hLines.length * hs * 1.28;
  if (sLines.length) { ty += ss * 0.9; ctx.font = `${ss}px ${ff}`; ctx.globalAlpha = 0.72; sLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * ss * 1.4 + ss * 0.88)); ctx.globalAlpha = 1; }
  const creditH = richPhotoPos === "top" ? photoH : h;
  drawPhotoCredit(ctx, w, creditH, photoCredit, "#ffffff");
  drawLogo(ctx, w, h, logoVariant);
}
function drawTemplateBlack(ctx, w, h, opts) {
  const { headline, subtext, textColor, fontFamily, fontScale, textPos, logoVariant } = opts;
  const ff = `${fontFamily}, Arial, sans-serif`;
  const hs = Math.round(w * 0.075 * fontScale), ss = Math.round(w * 0.038 * fontScale);
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
          textAlign, textPos, logoVariant, cropRect, photoCredit } = opts;
  const ff = `${fontFamily}, Arial, sans-serif`;
  const hs = Math.round(w * 0.075 * fontScale), ss = Math.round(w * 0.038 * fontScale);
  const pad = w * 0.08, maxW = w * 0.84;
  if (bgMode === "template1") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#6B9FCC"); g.addColorStop(0.4, "#3A6EA8"); g.addColorStop(1, "#000810");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image" && bgImage) {
    drawCropped(ctx, bgImage, 0, 0, w, h, cropRect);
    ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`; ctx.fillRect(0, 0, w, h);
  } else if (bgMode === "image") {
    drawPhotoPlaceholder(ctx, 0, 0, w, h, 0.33);
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
  if (bgMode === "image") drawPhotoCredit(ctx, w, h, photoCredit, opts.creditColor || "#ffffff");
  drawLogo(ctx, w, h, logoVariant);
}
function drawTemplateZena(ctx, w, h, opts) {
  const { bgImage, headline, subtext, fontFamily, fontScale, cropRect, photoCredit, zenaOverlay, zenaOverlayOpacity } = opts;
  const op = zenaOverlayOpacity ?? 0.85;
  const ff = `${fontFamily}, Arial, sans-serif`;
  const hs = Math.round(w * 0.065 * fontScale);
  const ss = Math.round(w * 0.034 * fontScale);
  const pad  = w * 0.06;
  const maxW = w * 0.88;

  // 1. Full-bleed photo or placeholder
  if (bgImage) {
    drawCropped(ctx, bgImage, 0, 0, w, h, cropRect);
  } else {
    drawPhotoPlaceholder(ctx, 0, 0, w, h, 0.35);
  }

  // 2. Gradient overlay – tmavý nebo světlý fialový
  const gradY = h * 0.28;
  const g = ctx.createLinearGradient(0, gradY, 0, h);
  if (zenaOverlay === "light") {
    g.addColorStop(0,    `rgba(88, 42, 148, 0)`);
    g.addColorStop(0.38, `rgba(88, 42, 148, ${(op * 0.75).toFixed(2)})`);
    g.addColorStop(1,    `rgba(78, 36, 132, ${op.toFixed(2)})`);
  } else {
    g.addColorStop(0,    `rgba(8, 3, 18, 0)`);
    g.addColorStop(0.38, `rgba(8, 3, 18, ${(op * 0.80).toFixed(2)})`);
    g.addColorStop(1,    `rgba(5, 2, 12, ${op.toFixed(2)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, gradY, w, h - gradY);

  // 3. Text blok – bottom-up
  const lh1 = hs * 1.28;
  const lh2 = ss * 1.4;
  const hLines = wrapLines(`bold ${hs}px ${ff}`, headline, maxW);
  const sLines = subtext ? wrapLines(`${ss}px ${ff}`, subtext, maxW) : [];
  const blockH = hLines.length * lh1 + (sLines.length ? ss * 0.85 + sLines.length * lh2 : 0);
  const botPad = h * 0.062;
  let ty = h - botPad - blockH;

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // Titulek
  ctx.font      = `bold ${hs}px ${ff}`;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 1;
  hLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * lh1 + hs * 0.88));
  ty += hLines.length * lh1;

  // Perex
  if (sLines.length) {
    ty += ss * 0.85;
    ctx.font = `${ss}px ${ff}`;
    ctx.globalAlpha = 0.85;
    sLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * lh2 + ss * 0.88));
    ctx.globalAlpha = 1;
  }

  // 4. Kredit fotografa
  drawPhotoCredit(ctx, w, h, photoCredit, "#ffffff");

  // 5. Logo Žena
  drawZenaLogo(ctx, w, h);
}
function drawPost(ctx, w, h, opts) {
  if (opts.bgMode === "template3")    return drawTemplateRich(ctx, w, h, opts);
  if (opts.bgMode === "template2")    return drawTemplateBlack(ctx, w, h, opts);
  if (opts.bgMode === "templateZena") return drawTemplateZena(ctx, w, h, opts);
  return drawTemplateStandard(ctx, w, h, opts);
}
function renderToCanvas(canvas, fmt, opts, previewMax = PREVIEW_MAX_DESKTOP) {
  const { w, h } = fmt;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const s   = Math.min(previewMax / w, previewMax / h);
  canvas.width  = Math.round(w * s * dpr); canvas.height = Math.round(h * s * dpr);
  canvas.style.width  = Math.round(w * s) + "px"; canvas.style.height = Math.round(h * s) + "px";
  const ctx = canvas.getContext("2d");
  ctx.save(); ctx.scale(s * dpr, s * dpr);
  drawPost(ctx, w, h, opts);
  ctx.restore();
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const mkBtn   = (active, color = UI, t = LIGHT) => ({ padding:"6px 10px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, transition:"all .15s", background: active ? color : t.btnInactiveBg, color: active ? "#fff" : t.btnInactiveColor });
const tplBtn  = (bgMode, id, t) => ({ ...mkBtn(bgMode === id, UI, t), padding:"9px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:3 });
const mkInp   = (t, mobile) => ({ width:"100%", padding:"6px 8px", borderRadius:6, border:`1px solid ${t.border}`, boxSizing:"border-box", fontSize: mobile ? 16 : 13, fontFamily:"Inter, system-ui, sans-serif", background:t.bgInput, color:t.textPrimary });
const mkLbl   = t => ({ display:"block", fontSize:11, fontWeight:600, color:t.textSecondary, marginBottom:4, marginTop:12, textTransform:"uppercase", letterSpacing:"0.05em" });
const mkCard  = t => ({ background:t.bgCard, borderRadius:8, padding:10, marginBottom:4 });
const mkUpload= t => ({ display:"block", background:t.uploadBg, border:`1px dashed ${t.borderDashed}`, borderRadius:6, padding:"8px 12px", textAlign:"center", cursor:"pointer", fontSize:12, color:t.textSecondary });

// ── Sub-components ────────────────────────────────────────────────────────────
function AdvancedSettings({ st, dispatch, t, mobile }) {
  const open    = st.advancedOpen;
  const setOpen = val => dispatch({ type:"SET", key:"advancedOpen", value:val });
  const set     = (key, val) => dispatch({ type:"SET", key, value:val });
  const B       = active => mkBtn(active, UI, t);
  const isZena  = st.bgMode === "templateZena";
  return (
    <>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", marginTop:10, padding:"8px 10px", borderRadius:7, border:`1px solid ${open ? UI : t.border}`, background: open ? t.advActiveBg : t.bgAdvanced, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, fontWeight:600, color: open ? UI : t.textSecondary }}>
        <span>Pokročilé nastavení</span>
        <span style={{ fontSize:10, display:"inline-block", transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }}>▼</span>
      </button>
      {open && (
        <div style={{ marginTop:4, padding:"10px 10px 4px", background:t.bgAdvanced, borderRadius:7, border:`1px solid ${t.borderLight}` }}>
          {!isZena && (
            <>
              <div style={mkLbl(t)}>Logo</div>
              <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                {[["blue",UI,"#fff","Modré"],["white","#fff","#2B5F9E","Bílé"],["black","#111","#fff","Černé"]].map(([v,bg,fg,lab]) => (
                  <button key={v} onClick={() => set("logoVariant", v)} style={{ ...B(st.logoVariant===v), flex:1, fontSize:11, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 4px" }}>
                    <span style={{ width:20, height:20, borderRadius:"50%", background:bg, border:`1.5px solid ${t.borderDashed}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:fg, fontWeight:700 }}>A</span>
                    <span>{lab}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {st.bgMode !== "template2" && st.bgMode !== "template3" && !isZena && (
            <>
              <div style={mkLbl(t)}>Zarovnání</div>
              <div style={{ display:"flex", gap:6 }}>
                {[["left","⬅"],["center","⬛"],["right","➡"]].map(([v,ic]) => (
                  <button key={v} onClick={() => set("textAlign", v)} style={{ ...B(st.textAlign===v), flex:1, fontSize:14 }}>{ic}</button>
                ))}
              </div>
            </>
          )}
          {st.bgMode !== "template3" && !isZena && (
            <>
              <div style={mkLbl(t)}>Pozice textu</div>
              <div style={{ display:"flex", gap:6 }}>
                {[["bottom","Dole"],["center","Střed"],["top","Nahoře"]].map(([v,l]) => (
                  <button key={v} onClick={() => set("textPos", v)} style={{ ...B(st.textPos===v), flex:1, fontSize:11 }}>{l}</button>
                ))}
              </div>
            </>
          )}
          {(st.bgMode === "template3" || (st.bgMode === "custom" && st.customSub === "image")) && (
            <>
              <div style={mkLbl(t)}>Barva kreditu</div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => set("creditColor","#ffffff")} style={{ ...B(st.creditColor==="#ffffff"), flex:1, fontSize:11 }}>Bílá</button>
                <button onClick={() => set("creditColor","#111111")} style={{ ...B(st.creditColor==="#111111"), flex:1, fontSize:11 }}>Černá</button>
              </div>
            </>
          )}
          <div style={mkLbl(t)}>Font</div>
          <select value={st.fontFamily} onChange={e => set("fontFamily", e.target.value)} style={{ ...mkInp(t, mobile), marginBottom:4 }}>
            {FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
          <div style={mkLbl(t)}>Velikost písma</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => set("fontScale", Math.max(0.5, Math.round((st.fontScale-0.1)*10)/10))} style={{ ...B(false), width:30, padding:"4px 0", fontSize:16, textAlign:"center" }}>−</button>
            <input type="range" min="0.5" max="2.0" step="0.05" value={st.fontScale} onChange={e => set("fontScale", parseFloat(e.target.value))} style={{ flex:1 }} />
            <button onClick={() => set("fontScale", Math.min(2.0, Math.round((st.fontScale+0.1)*10)/10))} style={{ ...B(false), width:30, padding:"4px 0", fontSize:16, textAlign:"center" }}>+</button>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2, marginBottom:4 }}>
            <span style={{ fontSize:11, color:t.textMuted }}>{Math.round(st.fontScale*100)} %</span>
            <button onClick={() => set("fontScale", 1.0)} style={{ fontSize:10, color:UI, background:"none", border:"none", cursor:"pointer", padding:0 }}>reset</button>
          </div>
          {st.bgMode !== "template3" && !isZena && (
            <>
              <div style={mkLbl(t)}>Barva textu</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <input type="color" value={st.textColor} onChange={e => set("textColor", e.target.value)} style={{ width:34, height:28, padding:2, border:`1px solid ${t.border}`, borderRadius:4, cursor:"pointer" }} />
                <span style={{ fontSize:12, color:t.textMuted }}>{st.textColor}</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function RichControls({ st, dispatch, onImageUpload, t, mobile }) {
  const set = (key, val) => dispatch({ type:"SET", key, value:val });
  const B   = active => mkBtn(active, UI, t);
  return (
    <div style={mkCard(t)}>
      <label style={mkUpload(t)}>📁 Nahrát fotku<input type="file" accept="image/*" onChange={e => onImageUpload(e, true, false)} style={{ display:"none" }} /></label>
      <div style={mkLbl(t)}>Pozice fotky</div>
      <div style={{ display:"flex", gap:6 }}>
        {[["top","Nahoře"],["bottom","Dole"]].map(([v,l]) => (
          <button key={v} onClick={() => set("richPhotoPos", v)} style={{ ...B(st.richPhotoPos===v), flex:1, fontSize:11 }}>{l}</button>
        ))}
      </div>
      <div style={{ ...mkLbl(t), marginTop:10 }}>Varianta panelu</div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => { set("richVariant","light"); set("logoVariant","white"); }} style={{ ...B(st.richVariant==="light"), flex:1, fontSize:11 }}>Světlá</button>
        <button onClick={() => { set("richVariant","dark");  set("logoVariant","black"); }} style={{ ...B(st.richVariant==="dark"),  flex:1, fontSize:11 }}>Tmavá</button>
        <button onClick={() => { set("richVariant","color"); set("logoVariant","blue");  }} style={{ ...B(st.richVariant==="color"), flex:1, fontSize:11 }}>Barva</button>
      </div>
      {st.richVariant === "color" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
          <input type="color" value={st.richPanelColor} onChange={e => set("richPanelColor", e.target.value)} style={{ width:34, height:28, padding:2, border:`1px solid ${t.border}`, borderRadius:4, cursor:"pointer" }} />
          <span style={{ fontSize:12, color:t.textMuted }}>{st.richPanelColor}</span>
        </div>
      )}
    </div>
  );
}

function CustomControls({ st, dispatch, onImageUpload, t, mobile }) {
  const set = (key, val) => dispatch({ type:"SET", key, value:val });
  const B   = active => mkBtn(active, UI, t);
  return (
    <div style={mkCard(t)}>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        <button onClick={() => set("customSub","image")} style={{ ...B(st.customSub==="image"), flex:1, fontSize:11 }}>Foto</button>
        <button onClick={() => { set("customSub","color"); set("logoVariant","white"); }} style={{ ...B(st.customSub==="color"), flex:1, fontSize:11 }}>Barva</button>
      </div>
      {st.customSub === "image" ? (
        <>
          <label style={mkUpload(t)}>📁 Nahrát fotku<input type="file" accept="image/*" onChange={e => onImageUpload(e, false, false)} style={{ display:"none" }} /></label>
          <div style={mkLbl(t)}>Tmavý překryv</div>
          <input type="range" min="0" max="0.9" step="0.05" value={st.overlayOpacity} onChange={e => set("overlayOpacity", parseFloat(e.target.value))} style={{ width:"100%" }} />
          <span style={{ fontSize:11, color:t.textMuted }}>{Math.round(st.overlayOpacity*100)} %</span>
        </>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="color" value={st.bgColor} onChange={e => set("bgColor", e.target.value)} style={{ width:34, height:28, padding:2, border:`1px solid ${t.border}`, borderRadius:4, cursor:"pointer" }} />
          <span style={{ fontSize:12, color:t.textMuted }}>{st.bgColor}</span>
        </div>
      )}
    </div>
  );
}

function ZenaControls({ st, dispatch, onImageUpload, t }) {
  const set = (key, val) => dispatch({ type:"SET", key, value:val });
  const B   = active => mkBtn(active, ZENA, t);
  return (
    <div style={mkCard(t)}>
      <label style={mkUpload(t)}>📁 Nahrát fotku<input type="file" accept="image/*" onChange={e => onImageUpload(e, false, true)} style={{ display:"none" }} /></label>
      <div style={mkLbl(t)}>Tón překryvu</div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => set("zenaOverlay","dark")}  style={{ ...B(st.zenaOverlay==="dark"),  flex:1, fontSize:11 }}>Tmavý</button>
        <button onClick={() => set("zenaOverlay","light")} style={{ ...B(st.zenaOverlay==="light"), flex:1, fontSize:11 }}>Světlý (fialový)</button>
      </div>
      <div style={mkLbl(t)}>Intenzita překryvu</div>
      <input type="range" min="0" max="1" step="0.05" value={st.zenaOverlayOpacity} onChange={e => set("zenaOverlayOpacity", parseFloat(e.target.value))} style={{ width:"100%" }} />
      <span style={{ fontSize:11, color:t.textMuted }}>{Math.round(st.zenaOverlayOpacity * 100)} %</span>
    </div>
  );
}

function Controls({ st, dispatch, onImageUpload, autoResize, selectAll, t, mobile }) {
  const set = (key, val) => dispatch({ type:"SET", key, value:val });
  const B   = active => mkBtn(active, UI, t);
  const isPhotoMode = st.bgMode === "template3" || (st.bgMode === "custom" && st.customSub === "image") || st.bgMode === "templateZena";
  return (
    <>
      <div style={mkLbl(t)}>Formát</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {FORMATS.map(f => (
          <button key={f.id} onClick={() => { set("fmt", f); set("cropRect", null); }} style={{ ...B(st.fmt.id===f.id), display:"flex", flexDirection:"column", alignItems:"center", gap:1, padding:"7px 4px" }}>
            <span style={{ fontSize:11 }}>{f.label}</span>
            <span style={{ fontSize:10, opacity:0.7 }}>{f.sub}</span>
          </button>
        ))}
      </div>
      {st.bgMode === "template3" && (
        <>
          <label style={mkLbl(t)}>Nadtitulek</label>
          <textarea value={st.supertitle} onChange={e => { set("supertitle", e.target.value); autoResize(e); }} onFocus={selectAll} placeholder="Volitelný nadtitulek…" style={{ ...mkInp(t, mobile), height:36, resize:"none", overflow:"hidden" }} />
        </>
      )}
      <label style={mkLbl(t)}>Titulek</label>
      <textarea value={st.headline} onChange={e => { set("headline", e.target.value); autoResize(e); }} onFocus={selectAll} style={{ ...mkInp(t, mobile), height:44, resize:"none", overflow:"hidden" }} />
      <label style={mkLbl(t)}>Perex</label>
      <textarea value={st.subtext} onChange={e => { set("subtext", e.target.value); autoResize(e); }} onFocus={selectAll} placeholder="Volitelný perex…" style={{ ...mkInp(t, mobile), height:52, resize:"none", overflow:"hidden" }} />
      {isPhotoMode && (
        <>
          <label style={mkLbl(t)}>Credit fotografa</label>
          <input type="text" value={st.photoCredit} onChange={e => set("photoCredit", e.target.value)} placeholder="Jméno / agentura…" style={mkInp(t, mobile)} />
        </>
      )}
      <div style={{ ...mkLbl(t), marginTop:14 }}>Pozadí / šablona</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
        <button onClick={() => { set("bgMode","template2"); set("logoVariant","blue"); }} style={tplBtn(st.bgMode,"template2",t)}>
          <span style={{ width:48, height:28, borderRadius:3, background:"#000", border:"2px solid #1B69BF", display:"block" }} /><span style={{ fontSize:10 }}>Černá</span>
        </button>
        <button onClick={() => { set("bgMode","template1"); set("logoVariant","blue"); }} style={tplBtn(st.bgMode,"template1",t)}>
          <span style={{ width:48, height:28, borderRadius:3, background:"linear-gradient(to bottom,#6B9FCC,#000810)", display:"block" }} /><span style={{ fontSize:10 }}>Modrá</span>
        </button>
        <button onClick={() => { set("bgMode","template3"); set("logoVariant","white"); }} style={tplBtn(st.bgMode,"template3",t)}>
          <span style={{ width:48, height:28, borderRadius:3, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <span style={{ flex:"0 0 55%", background:"#aaa" }} /><span style={{ flex:"0 0 45%", background:"#1B69BF" }} />
          </span><span style={{ fontSize:10 }}>Rich</span>
        </button>
        <button onClick={() => { set("bgMode","custom"); set("customSub","image"); set("logoVariant","blue"); }} style={tplBtn(st.bgMode,"custom",t)}>
          <span style={{ width:48, height:28, borderRadius:3, background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", display:"block" }} /><span style={{ fontSize:10 }}>Vlastní</span>
        </button>
        <button onClick={() => set("bgMode","templateZena")} style={tplBtn(st.bgMode,"templateZena",t)}>
          <span style={{ width:48, height:28, borderRadius:3, position:"relative", overflow:"hidden", display:"block", background:"#888" }}>
            <span style={{ position:"absolute", bottom:0, left:0, right:0, height:"65%", background:"linear-gradient(to bottom, transparent, rgba(78,35,130,0.92))" }} />
            <img src={ZENA_LOGO_B64} alt="Žena" style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"80%", height:"auto", display:"block" }} />
          </span>
          <span style={{ fontSize:10 }}>Žena.cz</span>
        </button>
      </div>
      {st.bgMode === "template3"    && <RichControls   st={st} dispatch={dispatch} onImageUpload={onImageUpload} t={t} mobile={mobile} />}
      {st.bgMode === "custom"       && <CustomControls st={st} dispatch={dispatch} onImageUpload={onImageUpload} t={t} mobile={mobile} />}
      {st.bgMode === "templateZena" && <ZenaControls   st={st} dispatch={dispatch} onImageUpload={onImageUpload} t={t} />}
      <AdvancedSettings st={st} dispatch={dispatch} t={t} mobile={mobile} />
    </>
  );
}

function Preview({ canvasRef, fmt, t, onImageUpload, onOpenCrop, bgMode, customSub, hasImage }) {
  const fileInputRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const isPhotoMode = bgMode === "template3" || (bgMode === "custom" && customSub === "image") || bgMode === "templateZena";
  const isRich = bgMode === "template3";
  const isZena = bgMode === "templateZena";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ textAlign:"center", fontSize:11, color:t.textMuted, marginBottom:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
        Náhled — {fmt.label} ({fmt.w} × {fmt.h})
      </div>
      <div style={{ position:"relative", display:"inline-block" }} onMouseEnter={() => isPhotoMode && setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <canvas ref={canvasRef} style={{ borderRadius:10, boxShadow:"0 6px 28px rgba(0,0,0,0.25)", display:"block", maxWidth:"100%" }} />
        {isPhotoMode && (
          <>
            <div onClick={() => fileInputRef.current?.click()} style={{ position:"absolute", inset:0, borderRadius:10, background:"transparent", cursor:"pointer" }} />
            {hovered && (
              <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.72)", color:"#fff", fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:20, whiteSpace:"nowrap", pointerEvents:"none" }}>
                📁 Klikni pro nahrání fotky
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => onImageUpload(e, isRich, isZena)} />
          </>
        )}
      </div>
      {isPhotoMode && hasImage && (
        <button onClick={onOpenCrop} style={{ ...mkBtn(false, UI, t), marginTop:10, padding:"7px 18px", fontSize:12 }}>✂️ Upravit výřez</button>
      )}
    </div>
  );
}

function Actions({ fmt, onReset, onExport, mobile, t }) {
  const pad = `${mobile ? 12 : 10}px 0`, fz = mobile ? 14 : 13;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, ...(!mobile && { marginTop:16, paddingTop:14, borderTop:`1px solid ${t.borderLight}` }) }}>
      <button onClick={onReset}  style={{ ...mkBtn(false, UI, t), width:"100%", fontSize:fz, padding:pad }}>Začít znovu</button>
      <button onClick={onExport} style={{ ...mkBtn(true,  UI, t), width:"100%", fontSize:fz, padding:pad }}>⬇ Stáhnout</button>
      <div style={{ fontSize:10, color:t.textFaint, textAlign:"center" }}>{fmt.w} × {fmt.h} px</div>
    </div>
  );
}

function AppHeader({ logoCanvasRef, onLogoClick, t }) {
  return (
    <div onClick={onLogoClick} style={{ fontSize:15, fontWeight:700, color:UI, display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
      <canvas ref={logoCanvasRef} style={{ width:28, height:28, flexShrink:0 }} />
      Post Generator
    </div>
  );
}

// ── Crop Modal ────────────────────────────────────────────────────────────────
function CropModal({ img, cropW, cropH, initialCrop, onConfirm, onCancel }) {
  const MAX_PV     = Math.min(460, window.innerWidth - 32, window.innerHeight - 220);
  const pvScale    = Math.min(MAX_PV / cropW, MAX_PV / cropH);
  const pw         = Math.round(cropW * pvScale);
  const ph         = Math.round(cropH * pvScale);
  const coverScale = Math.max(pw / img.width, ph / img.height);

  const initCrop = () => {
    if (initialCrop) {
      const z  = pw / (initialCrop.srcW * coverScale);
      const ds = coverScale * z;
      const cx = initialCrop.sx + initialCrop.srcW / 2;
      const cy = initialCrop.sy + initialCrop.srcH / 2;
      return { zoom: z, panX: (cx - img.width / 2) * ds, panY: (cy - img.height / 2) * ds };
    }
    return { zoom: 1, panX: 0, panY: 0 };
  };

  const cropReducer = (s, a) => {
    if (a.type === "PAN")  return { ...s, panX: s.panX + a.dx, panY: s.panY + a.dy };
    if (a.type === "ZOOM") { const nz = Math.max(1, Math.min(5, s.zoom * a.delta)), ratio = nz / s.zoom; return { zoom: nz, panX: s.panX * ratio, panY: s.panY * ratio }; }
    return s;
  };

  const [crop, dispatchCrop] = useReducer(cropReducer, null, initCrop);
  const dragging      = useRef(false);
  const lastPos       = useRef({ x:0, y:0 });
  const lastPinchDist = useRef(null);
  const containerRef  = useRef(null);
  const pvCanvasRef   = useRef(null);

  const ds      = coverScale * crop.zoom;
  const maxPX   = Math.max(0, (img.width  * ds - pw) / 2);
  const maxPY   = Math.max(0, (img.height * ds - ph) / 2);
  const cpx     = Math.max(-maxPX, Math.min(maxPX, crop.panX));
  const cpy     = Math.max(-maxPY, Math.min(maxPY, crop.panY));
  const scaledW = img.width  * ds;
  const scaledH = img.height * ds;

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onWheel = e => { e.preventDefault(); e.stopPropagation(); dispatchCrop({ type:"ZOOM", delta: e.deltaY > 0 ? 0.92 : 1.08 }); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const c = pvCanvasRef.current; if (!c) return;
    c.width = pw; c.height = ph;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(img, 0, 0, img.width, img.height, pw/2 - cpx - scaledW/2, ph/2 - cpy - scaledH/2, scaledW, scaledH);
  }, [cpx, cpy, scaledW, scaledH, pw, ph, img]);

  const onMouseDown = e => { dragging.current = true; lastPos.current = { x:e.clientX, y:e.clientY }; e.preventDefault(); };
  const onMouseMove = e => {
    if (!dragging.current) return;
    dispatchCrop({ type:"PAN", dx: -(e.clientX - lastPos.current.x), dy: -(e.clientY - lastPos.current.y) });
    lastPos.current = { x:e.clientX, y:e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };
  const onTouchStart = e => {
    if (e.touches.length === 1) lastPos.current = { x:e.touches[0].clientX, y:e.touches[0].clientY };
    else if (e.touches.length === 2) lastPinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    e.preventDefault();
  };
  const onTouchMove = e => {
    if (e.touches.length === 1) {
      dispatchCrop({ type:"PAN", dx: -(e.touches[0].clientX - lastPos.current.x), dy: -(e.touches[0].clientY - lastPos.current.y) });
      lastPos.current = { x:e.touches[0].clientX, y:e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastPinchDist.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      dispatchCrop({ type:"ZOOM", delta: dist / lastPinchDist.current });
      lastPinchDist.current = dist;
    }
    e.preventDefault();
  };

  const handleConfirm = () => {
    const cx = img.width / 2 + cpx / ds, cy = img.height / 2 + cpy / ds;
    const srcW = pw / ds, srcH = ph / ds;
    onConfirm({ sx: Math.max(0, Math.min(img.width - srcW, cx - srcW/2)), sy: Math.max(0, Math.min(img.height - srcH, cy - srcH/2)), srcW: Math.min(srcW, img.width), srcH: Math.min(srcH, img.height) });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2000, gap:14, padding:16 }}>
      <div style={{ color:"#fff", fontSize:14, fontWeight:600 }}>Upravit výřez</div>
      <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginTop:-8 }}>Táhni pro posun · scroll / pinch pro přiblížení</div>
      <div ref={containerRef} style={{ width:pw, height:ph, overflow:"hidden", position:"relative", borderRadius:8, border:"2px solid rgba(255,255,255,0.35)", cursor:"grab", userSelect:"none", flexShrink:0, touchAction:"none" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { lastPinchDist.current = null; }}>
        <canvas ref={pvCanvasRef} style={{ display:"block", width:pw, height:ph }} />
      </div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Zoom: {Math.round(crop.zoom * 100)} %</div>
      <div style={{ display:"flex", gap:12 }}>
        <button onClick={onCancel}      style={{ ...mkBtn(false, UI, DARK), padding:"10px 28px", fontSize:13 }}>Zrušit</button>
        <button onClick={handleConfirm} style={{ ...mkBtn(true,  UI, DARK), padding:"10px 28px", fontSize:13 }}>Potvrdit výřez</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [st, dispatch]                  = useReducer(reducer, DEFAULTS);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [cropOpen, setCropOpen]         = useState(false);
  const dark = useDarkMode();
  const t    = dark ? DARK : LIGHT;

  const canvasRef     = useRef(null);
  const imgRef        = useRef(null);
  const logoCanvasRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.margin = "0"; document.documentElement.style.padding = "0"; document.documentElement.style.background = t.bgMain;
    document.body.style.margin = "0"; document.body.style.padding = "0"; document.body.style.background = t.bgMain;
  }, [t.bgMain]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (document.querySelector('link[href*="googleapis.com/css2?family=Inter"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Barlow:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const effectiveBgMode = st.bgMode === "custom" ? (st.customSub === "image" ? "image" : "color") : st.bgMode;

  const buildOpts = useCallback((overrides = {}) => ({
    bgMode: effectiveBgMode, bgColor: st.bgColor, bgImage: imgRef.current,
    overlayOpacity: st.overlayOpacity, headline: st.headline, subtext: st.subtext,
    supertitle: st.supertitle, textColor: st.textColor, fontFamily: st.fontFamily,
    fontScale: st.fontScale, textAlign: st.textAlign, textPos: st.textPos,
    logoVariant: st.logoVariant, richVariant: st.richVariant,
    richPhotoPos: st.richPhotoPos, richPanelColor: st.richPanelColor,
    cropRect: st.cropRect, photoCredit: st.photoCredit, creditColor: st.creditColor,
    zenaOverlay: st.zenaOverlay, zenaOverlayOpacity: st.zenaOverlayOpacity,
    ...overrides,
  }), [st, effectiveBgMode]);

  const previewMax = isMobile ? PREVIEW_MAX_MOBILE : PREVIEW_MAX_DESKTOP;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    renderToCanvas(canvas, st.fmt, buildOpts(), previewMax);
  }, [st.fmt, buildOpts, previewMax]);

  const drawSidebarLogo = useCallback(() => {
    const c = logoCanvasRef.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), size = 28;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + "px"; c.style.height = size + "px";
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    drawLogoOnCanvas(ctx, size/2, size/2, size/2 - 1, "blue");
  }, []);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { redraw(); drawSidebarLogo(); }, [isMobile]);
  useEffect(() => {
    document.fonts.load("bold 40px Inter").then(() => {
      document.fonts.load("bold 40px Barlow").then(() => {
        const MX = getMeasureCtx(); MX.font = "bold 40px Inter"; MX.measureText("A");
        const zi = _zenaLogoImg();
        if (zi.complete) { redraw(); drawSidebarLogo(); }
        else { zi.onload = () => { redraw(); drawSidebarLogo(); }; redraw(); drawSidebarLogo(); }
      });
    });
  }, []);

  const autoResize = e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; };
  const selectAll  = e => { const el = e.target; setTimeout(() => el.select(), 0); };

  const handleImageUpload = useCallback((e, isRich = false, isZena = false) => {
    const file = e.target.files?.[0]; if (!file) return;
    const input = e.target;
    if (!ALLOWED_MIME.includes(file.type)) { alert("Nepodporovaný formát souboru.\nPovolené typy: JPEG, PNG, WebP, GIF."); input.value = ""; return; }
    if (file.size > MAX_FILE_BYTES) { alert("Soubor je příliš velký (max 20 MB)."); input.value = ""; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      if (!ALLOWED_MIME.some(m => dataUrl.startsWith(`data:${m};base64,`))) { console.warn("Blocked suspicious data URL"); input.value = ""; return; }
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        dispatch({ type:"SET", key:"cropRect", value:null });
        const canvas = canvasRef.current; if (!canvas) return;
        let overrides;
        if (isRich) {
          overrides = { bgMode:"template3", bgImage:img };
        } else if (isZena) {
          overrides = { bgMode:"templateZena", bgImage:img };
        } else {
          overrides = { bgMode:"image", bgImage:img };
          dispatch({ type:"SET", key:"bgMode", value:"custom" });
          dispatch({ type:"SET", key:"customSub", value:"image" });
        }
        renderToCanvas(canvas, st.fmt, { ...buildOpts(), ...overrides, cropRect:null }, previewMax);
      };
      img.onerror = () => { alert("Obrázek se nepodařilo načíst. Zkuste jiný soubor."); input.value = ""; };
      img.src = dataUrl;
    };
    reader.onerror = () => { alert("Chyba při čtení souboru. Zkuste to znovu."); input.value = ""; };
    reader.readAsDataURL(file);
  }, [st.fmt, buildOpts, previewMax]);

  const getCropDimensions = () => {
    const { w, h } = st.fmt;
    if (st.bgMode === "template3") return { cropW: w, cropH: Math.round(h * 0.55) };
    return { cropW: w, cropH: h };
  };

  const handleCropConfirm = cropRect => {
    dispatch({ type:"SET", key:"cropRect", value:cropRect });
    setCropOpen(false);
    const canvas = canvasRef.current;
    if (canvas) renderToCanvas(canvas, st.fmt, { ...buildOpts(), cropRect }, previewMax);
  };

  const doReset = () => { imgRef.current = null; dispatch({ type:"RESET" }); setConfirmReset(false); };

  const exportAs = () => {
    const { w, h } = st.fmt;
    const off = document.createElement("canvas"); off.width = w; off.height = h;
    drawPost(off.getContext("2d"), w, h, buildOpts());
    const tplName  = TEMPLATE_NAMES[effectiveBgMode] || "vlastni";
    const randomId = Math.floor(100000 + Math.random() * 900000);
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png", 0.93);
    a.download = `aktualne-${tplName}-${st.fmt.id}-${randomId}.png`;
    a.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true, view:window }));
  };

  const hasImage      = !!imgRef.current;
  const controlsProps = { st, dispatch, onImageUpload: handleImageUpload, autoResize, selectAll, t, mobile: isMobile };
  const previewProps  = { canvasRef, fmt: st.fmt, t, onImageUpload: handleImageUpload, onOpenCrop: () => setCropOpen(true), bgMode: st.bgMode, customSub: st.customSub, hasImage };
  const actionsProps  = { fmt: st.fmt, onReset: () => setConfirmReset(true), onExport: exportAs, t };

  return (
    <div style={{ fontFamily:"Inter, system-ui, sans-serif", background:t.bgMain, minHeight:"100vh", color:t.textPrimary }}>

      {confirmReset && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:t.bgSidebar, borderRadius:12, padding:"28px 32px", width:300, textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:16, fontWeight:700, color:t.textPrimary, marginBottom:8 }}>Začít znovu?</div>
            <div style={{ fontSize:13, color:t.textSecondary, marginBottom:24 }}>Skutečně chcete smazat dosavadní práci?</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmReset(false)} style={{ ...mkBtn(false, UI, t), flex:1, padding:"9px 0", fontSize:13 }}>Ne</button>
              <button onClick={doReset}                      style={{ ...mkBtn(true,  UI, t), flex:1, padding:"9px 0", fontSize:13 }}>Ano</button>
            </div>
          </div>
        </div>
      )}

      {cropOpen && imgRef.current && (
        <CropModal img={imgRef.current} {...getCropDimensions()} initialCrop={st.cropRect} onConfirm={handleCropConfirm} onCancel={() => setCropOpen(false)} />
      )}

      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column" }}>
          <div style={{ background:t.bgSidebar, borderBottom:`1px solid ${t.border}`, padding:"14px 16px", position:"sticky", top:0, zIndex:10 }}>
            <AppHeader logoCanvasRef={logoCanvasRef} onLogoClick={() => setConfirmReset(true)} t={t} />
          </div>
          <div style={{ background:t.bgSidebar, padding:"16px 16px 8px", borderBottom:`1px solid ${t.border}` }}>
            <Controls {...controlsProps} />
          </div>
          <div style={{ background:t.bgMain, padding:"24px 16px 8px" }}>
            <Preview {...previewProps} />
          </div>
          <div style={{ position:"sticky", bottom:0, background:t.bgSidebar, borderTop:`1px solid ${t.borderLight}`, padding:"12px 16px" }}>
            <Actions {...actionsProps} mobile />
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", minHeight:"100vh" }}>
          <div style={{ width:300, background:t.bgSidebar, borderRight:`1px solid ${t.border}`, padding:"20px 18px", overflowY:"auto", flexShrink:0 }}>
            <div style={{ marginBottom:16 }}>
              <AppHeader logoCanvasRef={logoCanvasRef} onLogoClick={() => setConfirmReset(true)} t={t} />
            </div>
            <Controls {...controlsProps} />
            <Actions {...actionsProps} />
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
            <Preview {...previewProps} />
          </div>
        </div>
      )}
    </div>
  );
}
