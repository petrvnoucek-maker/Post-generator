# Post Generator

Webová aplikace pro tvorbu vizuálních postů na sociální sítě. Umožňuje redakci rychle generovat branded grafiku ve všech klíčových formátech a stáhnout ji jako PNG nebo JPG.

## Funkce

- **4 formáty** – Instagram (1:1), Story/Reels (9:16), Facebook/LinkedIn (1.91:1), Twitter/X (16:9)
- **2 brandové šablony** – modrý gradient, černá s modrým barem
- **Vlastní pozadí** – plná barva nebo upload fotky s nastavitelným tmavým překryvem
- **Typografie** – výběr fontu (Inter, Arial, Georgia aj.), škálování velikosti písma, zarovnání a pozice textu
- **Logo** – přepínač mezi bílou, černou a modrou variantou
- **Export** – PNG a JPG v plném rozlišení (1080 nebo 1200 px)

## Technologie

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- Canvas API (generování a export grafiky)

## Lokální spuštění

```bash
# Instalace závislostí
npm install

# Spuštění vývojového serveru
npm run dev
```

Aplikace poběží na `http://localhost:5173`.

## Build a nasazení

```bash
npm run build
```

Výstup je ve složce `dist/`. Projekt je nakonfigurován pro automatické nasazení přes [Vercel](https://vercel.com) — každý commit do větve `main` spustí nový deploy automaticky.

## Struktura projektu

```
post-generator/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx
```

## Úpravy a rozvoj

Zdrojový kód v `src/App.jsx` je generován a udržován s pomocí [Claude](https://claude.ai). Pro úpravy doporučujeme:

1. Otevřít konverzaci v Claude s aktuální verzí `App.jsx`
2. Popsat požadovanou změnu
3. Zkopírovat aktualizovaný kód zpět do repozitáře
4. Vercel automaticky přenasadí aplikaci

## Licence

Interní nástroj autora. Není určeno pro veřejné šíření nebo komerční použití třetími stranami.
