"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid, BarChart, Bar } from "recharts";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";

/* ═══════════ SUBSCRIPTION PLANS (defaults) ═══════════ */
const ALL_FEATURES = [
  { key: "wishlistMax", label: "Wishlist tracking limit", type: "number", freeDefault: 5, proDefault: 50, ultDefault: 999 },
  { key: "regionsMax", label: "Region comparison", type: "number", freeDefault: 1, proDefault: 3, ultDefault: 7 },
  { key: "priceHistoryMonths", label: "Price history (months)", type: "number", freeDefault: 3, proDefault: 12, ultDefault: 36 },
  { key: "perGameAlerts", label: "Per-game custom alerts", type: "bool" },
  { key: "emailNotifs", label: "Email notifications", type: "bool" },
  { key: "telegramNotifs", label: "Telegram notifications", type: "bool" },
  { key: "noAds", label: "Ad-free experience", type: "bool" },
  { key: "priceStats", label: "Price stats & analysis", type: "bool" },
  { key: "desiredPrice", label: "Desired price targets", type: "bool" },
  { key: "multiRegionNotifs", label: "Multi-region notifications", type: "bool" },
  { key: "priorityAlerts", label: "Priority deal alerts", type: "bool" },
  { key: "dlcTracking", label: "DLC & add-on tracking", type: "bool" },
  { key: "exportData", label: "Data export (CSV/JSON)", type: "bool" },
];

const DEFAULT_PLANS = {
  free: {
    id: "free", name: "Free", price: 0, period: "",
    color: "#8892a4", icon: "🎮",
    limits: { wishlistMax: 5, regionsMax: 1, priceHistoryMonths: 3, perGameAlerts: false, telegramNotifs: false, emailNotifs: false, noAds: false, priceStats: false, desiredPrice: false, multiRegionNotifs: false, priorityAlerts: false, dlcTracking: false, exportData: false },
    features: ["Track up to 5 games", "1 region", "3-month price history", "Push notifications", "Basic deal alerts", "Browse & search all games"],
    notIncluded: ["Per-game custom alerts", "Email & Telegram alerts", "Full price history", "Multi-region comparison", "Price stats & analysis", "Ad-free experience"],
  },
  pro: {
    id: "pro", name: "Pro", monthlyPrice: 3.99, yearlyPrice: 29.99, lifetimePrice: null,
    color: "#00d4ff", icon: "⚡",
    limits: { wishlistMax: 50, regionsMax: 3, priceHistoryMonths: 12, perGameAlerts: true, telegramNotifs: false, emailNotifs: true, noAds: true, priceStats: true, desiredPrice: true, multiRegionNotifs: false, priorityAlerts: false, dlcTracking: true, exportData: false },
    features: ["Track up to 50 games", "3 regions", "12-month price history", "Push + Email notifications", "Per-game custom alerts", "Desired price targets", "Price stats & analysis", "DLC & add-on tracking", "Ad-free experience"],
    notIncluded: ["Unlimited game tracking", "All 7 regions", "Telegram notifications", "Priority deal alerts", "Data export"],
  },
  ultimate: {
    id: "ultimate", name: "Ultimate", monthlyPrice: 7.99, yearlyPrice: 59.99, lifetimePrice: 99.99,
    color: "#ffd600", icon: "👑",
    limits: { wishlistMax: Infinity, regionsMax: 7, priceHistoryMonths: 36, perGameAlerts: true, telegramNotifs: true, emailNotifs: true, noAds: true, priceStats: true, desiredPrice: true, multiRegionNotifs: true, priorityAlerts: true, dlcTracking: true, exportData: true },
    features: ["Unlimited game tracking", "All 7 regions", "36-month price history", "Push + Email + Telegram", "Per-game custom alerts", "Multi-region notifications", "Priority deal alerts", "Full price stats", "DLC & add-on tracking", "Data export (CSV/JSON)", "Ad-free experience"],
    notIncluded: [],
  },
};

/* ═══════════ MOCK DATA ═══════════ */
const REGIONS = [
  { code: "US", name: "United States", currency: "$", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "£", flag: "🇬🇧" },
  { code: "EU", name: "Europe", currency: "€", flag: "🇪🇺" },
  { code: "JP", name: "Japan", currency: "¥", flag: "🇯🇵" },
  { code: "AU", name: "Australia", currency: "A$", flag: "🇦🇺" },
  { code: "CA", name: "Canada", currency: "C$", flag: "🇨🇦" },
  { code: "BR", name: "Brazil", currency: "R$", flag: "🇧🇷" },
];
const PS_PLUS_TIERS = ["Essential", "Extra", "Premium"];

const genHistory = (base, months = 36) => {
  const d = [];
  const now = new Date();
  for (let i = months; i >= 0; i--) {
    const dt = new Date(now); dt.setMonth(dt.getMonth() - i);
    const onSale = Math.random() > 0.55;
    const disc = onSale ? base * (0.3 + Math.random() * 0.5) : base;
    d.push({ date: dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), price: +disc.toFixed(2), fullPrice: base, month: i });
  }
  return d;
};

const genRegionPrices = (baseUSD) => REGIONS.map(r => {
  const mult = { US: 1, GB: 0.82, EU: 0.92, JP: 145, AU: 1.55, CA: 1.36, BR: 5.1 }[r.code];
  const price = +(baseUSD * mult * (0.9 + Math.random() * 0.2)).toFixed(2);
  const sale = Math.random() > 0.4 ? +(price * (0.3 + Math.random() * 0.5)).toFixed(2) : null;
  return { ...r, price, salePrice: sale, discount: sale ? Math.round((1 - sale / price) * 100) : 0 };
});

const GAMES = [
  { id: 1, title: "God of War Ragnarök", originalPrice: 69.99, salePrice: 29.99, discount: 57, image: "https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png", platform: ["PS5", "PS4"], rating: 4.9, metacritic: 94, endDate: "2026-04-05", genre: "Action RPG", developer: "Santa Monica Studio", releaseDate: "2022-11-09", psPlusTier: null, size: "118 GB", players: "1", onlinePlay: false },
  { id: 2, title: "Spider-Man 2", originalPrice: 69.99, salePrice: 34.99, discount: 50, image: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1301/9395013eab08120240ad3e5cbc44bd5f1eb151018baea084.png", platform: ["PS5"], rating: 4.8, metacritic: 90, endDate: "2026-04-02", genre: "Action", developer: "Insomniac Games", releaseDate: "2023-10-20", psPlusTier: "Extra", size: "98 GB", players: "1", onlinePlay: false },
  { id: 3, title: "Horizon Forbidden West", originalPrice: 59.99, salePrice: 19.99, discount: 67, image: "https://image.api.playstation.com/vulcan/ap/rnd/202107/3100/HO8vkO9pfXhwbHi5WHECQJdN.png", platform: ["PS5", "PS4"], rating: 4.7, metacritic: 88, endDate: "2026-04-10", genre: "Open World", developer: "Guerrilla Games", releaseDate: "2022-02-18", psPlusTier: "Extra", size: "96 GB", players: "1", onlinePlay: false },
  { id: 4, title: "The Last of Us Part I", originalPrice: 69.99, salePrice: 27.99, discount: 60, image: "https://image.api.playstation.com/vulcan/ap/rnd/202206/0720/eEczyEMDd2BLa3dtkGJVE9Id.png", platform: ["PS5"], rating: 4.9, metacritic: 88, endDate: "2026-03-30", genre: "Action Adventure", developer: "Naughty Dog", releaseDate: "2022-09-02", psPlusTier: "Premium", size: "79 GB", players: "1", onlinePlay: false },
  { id: 5, title: "Returnal", originalPrice: 69.99, salePrice: 24.99, discount: 64, image: "https://image.api.playstation.com/vulcan/ap/rnd/202101/0503/sJnhPJpXHCEyFBZTnDPFe5LO.png", platform: ["PS5"], rating: 4.5, metacritic: 86, endDate: "2026-04-08", genre: "Roguelike", developer: "Housemarque", releaseDate: "2021-04-30", psPlusTier: "Extra", size: "56 GB", players: "1-2", onlinePlay: true },
  { id: 6, title: "Gran Turismo 7", originalPrice: 69.99, salePrice: 29.99, discount: 57, image: "https://image.api.playstation.com/vulcan/ap/rnd/202109/1321/yZ7dpmjtmkMM5bkYOLHRVjCI.png", platform: ["PS5", "PS4"], rating: 4.6, metacritic: 87, endDate: "2026-04-12", genre: "Racing", developer: "Polyphony Digital", releaseDate: "2022-03-04", psPlusTier: "Extra", size: "110 GB", players: "1-20", onlinePlay: true },
  { id: 7, title: "Ratchet & Clank: Rift Apart", originalPrice: 69.99, salePrice: 19.99, discount: 71, image: "https://image.api.playstation.com/vulcan/ap/rnd/202101/2921/CnYdTpGaLMBVcsM88yJi1MrB.png", platform: ["PS5"], rating: 4.8, metacritic: 88, endDate: "2026-04-01", genre: "Platformer", developer: "Insomniac Games", releaseDate: "2021-06-11", psPlusTier: "Extra", size: "33 GB", players: "1", onlinePlay: false },
  { id: 8, title: "Demon's Souls", originalPrice: 69.99, salePrice: 29.99, discount: 57, image: "https://image.api.playstation.com/vulcan/ap/rnd/202011/1217/F01mhCMEbcOuJl8GcMBQi74E.png", platform: ["PS5"], rating: 4.7, metacritic: 92, endDate: "2026-04-15", genre: "Souls-like", developer: "Bluepoint Games", releaseDate: "2020-11-12", psPlusTier: "Premium", size: "66 GB", players: "1-6", onlinePlay: true },
  { id: 9, title: "Ghostwire: Tokyo", originalPrice: 59.99, salePrice: 14.99, discount: 75, image: "https://image.api.playstation.com/vulcan/ap/rnd/202203/1205/YDbhbVCOh6pnadSMQBEjCExG.png", platform: ["PS5"], rating: 4.2, metacritic: 73, endDate: "2026-04-03", genre: "Action", developer: "Tango Gameworks", releaseDate: "2022-03-25", psPlusTier: "Extra", size: "20 GB", players: "1", onlinePlay: false },
  { id: 10, title: "Stray", originalPrice: 29.99, salePrice: 9.99, discount: 67, image: "https://image.api.playstation.com/vulcan/ap/rnd/202206/0300/WNGDmyhPRgVoVGIEwEeDIFE0.png", platform: ["PS5", "PS4"], rating: 4.6, metacritic: 83, endDate: "2026-04-06", genre: "Adventure", developer: "BlueTwelve Studio", releaseDate: "2022-07-19", psPlusTier: "Extra", size: "7.5 GB", players: "1", onlinePlay: false },
  { id: 11, title: "Final Fantasy XVI", originalPrice: 69.99, salePrice: 34.99, discount: 50, image: "https://image.api.playstation.com/vulcan/ap/rnd/202211/2222/l05YBHK8ijwGKECPjRFHv4ls.png", platform: ["PS5"], rating: 4.5, metacritic: 87, endDate: "2026-04-09", genre: "Action RPG", developer: "Square Enix", releaseDate: "2023-06-22", psPlusTier: null, size: "91 GB", players: "1", onlinePlay: false },
  { id: 12, title: "Stellar Blade", originalPrice: 69.99, salePrice: 44.99, discount: 36, image: "https://image.api.playstation.com/vulcan/ap/rnd/202311/2711/59217789ccaea8e498cbcaecf11eeb6d6957b498faaeec60.png", platform: ["PS5"], rating: 4.4, metacritic: 80, endDate: "2026-04-11", genre: "Action", developer: "Shift Up", releaseDate: "2024-04-26", psPlusTier: null, size: "45 GB", players: "1", onlinePlay: false },
  { id: 13, title: "Astro Bot", originalPrice: 59.99, salePrice: 39.99, discount: 33, image: "https://image.api.playstation.com/vulcan/ap/rnd/202406/0501/70506b79ad6c3b8e5dc1b847a4b96c0c2acaa1c5e3f7e9e3.png", platform: ["PS5"], rating: 4.9, metacritic: 94, endDate: "2026-04-14", genre: "Platformer", developer: "Team Asobi", releaseDate: "2024-09-06", psPlusTier: null, size: "22 GB", players: "1", onlinePlay: false },
  { id: 14, title: "Sackboy: A Big Adventure", originalPrice: 59.99, salePrice: 14.99, discount: 75, image: "https://image.api.playstation.com/vulcan/ap/rnd/202008/1318/Pp4FPTxbAuWqpmTjGCPmobIR.png", platform: ["PS5", "PS4"], rating: 4.5, metacritic: 79, endDate: "2026-04-07", genre: "Platformer", developer: "Sumo Digital", releaseDate: "2020-11-12", psPlusTier: "Extra", size: "52 GB", players: "1-4", onlinePlay: true },
  { id: 15, title: "Death Stranding DC", originalPrice: 49.99, salePrice: 19.99, discount: 60, image: "https://image.api.playstation.com/vulcan/ap/rnd/202106/2520/m7mhEVk1pYOeMPmMDQveCPa5.png", platform: ["PS5"], rating: 4.3, metacritic: 85, endDate: "2026-04-04", genre: "Action", developer: "Kojima Productions", releaseDate: "2021-09-24", psPlusTier: "Extra", size: "75 GB", players: "1", onlinePlay: false },
  { id: 16, title: "Uncharted: Legacy of Thieves", originalPrice: 49.99, salePrice: 24.99, discount: 50, image: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2019/CBMnpwWFz7OTAOT4DVkpK3lR.png", platform: ["PS5"], rating: 4.7, metacritic: 87, endDate: "2026-04-13", genre: "Action Adventure", developer: "Naughty Dog", releaseDate: "2022-01-28", psPlusTier: "Extra", size: "126 GB", players: "1", onlinePlay: false },
  { id: 17, title: "MLB The Show 25", originalPrice: 69.99, salePrice: 49.99, discount: 29, image: "https://image.api.playstation.com/vulcan/ap/rnd/202502/1023/46ef0cfb5e2b5287f989acf20df7ee6b0c98ac88d2b63c5a.png", platform: ["PS5"], rating: 4.1, metacritic: 78, endDate: "2026-04-16", genre: "Sports", developer: "San Diego Studio", releaseDate: "2025-03-18", psPlusTier: null, size: "68 GB", players: "1-8", onlinePlay: true },
  { id: 18, title: "It Takes Two", originalPrice: 39.99, salePrice: 9.99, discount: 75, image: "https://image.api.playstation.com/vulcan/ap/rnd/202012/0815/rmjVhJYKfPOVyghZprJXFaNa.png", platform: ["PS5", "PS4"], rating: 4.8, metacritic: 88, endDate: "2026-04-02", genre: "Co-op", developer: "Hazelight Studios", releaseDate: "2021-03-26", psPlusTier: "Extra", size: "35 GB", players: "2", onlinePlay: true },
].map(g => ({ ...g, priceHistory: genHistory(g.originalPrice), regionPrices: genRegionPrices(g.originalPrice), lowestEver: +(g.originalPrice * 0.2).toFixed(2), avgPrice: +(g.originalPrice * 0.65).toFixed(2), saleCount: Math.floor(Math.random() * 12) + 3 }));

const GENRES = [...new Set(GAMES.map(g => g.genre))];

/* ═══════════ ICONS ═══════════ */
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const p = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
    chart: <><path d="M18 20V10M12 20V4M6 20v-6"/></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    trophy: <><path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2"/><path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/><path d="M6 3h12v7a6 6 0 01-12 0V3z"/><path d="M9 21h6"/><path d="M12 16v5"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    crown: <><path d="M2 20h20"/><path d="M4 20V10l4 4 4-8 4 8 4-4v10"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    credit: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
};

/* ═══════════ STYLES ═══════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Barlow:wght@300;400;500;600;700;800&display=swap');
:root {
  --bg: #060610; --surface: #0c0c1a; --surface2: #12122a; --border: rgba(255,255,255,0.06);
  --blue: #006fff; --cyan: #00d4ff; --green: #00e676; --red: #ff2d55; --orange: #ff9500;
  --yellow: #ffd600; --gold: #ffc940; --text: #e8eaed; --text2: #8892a4; --text3: #4a5568;
  --grad1: linear-gradient(135deg, #006fff, #00d4ff);
  --grad-gold: linear-gradient(135deg, #ffd600, #ff9500);
  --grad-pro: linear-gradient(135deg, #00d4ff, #006fff);
  --grad-ult: linear-gradient(135deg, #ffd600, #ff6b00);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: 'Barlow', sans-serif; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::placeholder { color: var(--text3); }
input[type="range"] { -webkit-appearance: none; background: rgba(255,255,255,0.08); height: 4px; border-radius: 2px; outline: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--cyan); cursor: pointer; box-shadow: 0 0 10px rgba(0,212,255,0.4); }
@keyframes fadeIn { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
@keyframes slideIn { from { opacity:0; transform: translateX(-12px); } to { opacity:1; transform: translateX(0); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes glow { 0%,100% { box-shadow: 0 0 15px rgba(0,212,255,0.2); } 50% { box-shadow: 0 0 30px rgba(0,212,255,0.4); } }
@keyframes goldGlow { 0%,100% { box-shadow: 0 0 15px rgba(255,214,0,0.2); } 50% { box-shadow: 0 0 30px rgba(255,214,0,0.4); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.badge { display:inline-flex; align-items:center; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
`;

/* ═══════════ SHARED COMPONENTS ═══════════ */
const Pill = ({ children, active, onClick, count }) => (
  <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 10, border: active ? "1px solid rgba(0,212,255,0.4)" : "1px solid transparent", background: active ? "rgba(0,111,255,0.15)" : "rgba(255,255,255,0.04)", color: active ? "#00d4ff" : "#8892a4", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Barlow'", transition: "all 0.25s", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
    {children}{count !== undefined && <span style={{ background: active ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 6, fontSize: 10 }}>{count}</span>}
  </button>
);

const Toggle = ({ on, onToggle, label, disabled }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }} onClick={disabled ? undefined : onToggle}>
    <div style={{ width: 38, height: 20, borderRadius: 10, background: on ? "var(--cyan)" : "rgba(255,255,255,0.1)", transition: "0.3s", position: "relative", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 20 : 2, transition: "0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </div>
    {label && <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>}
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", animation: "fadeIn 0.4s both" }}>
    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Rajdhani'" }}>{label}</div>
    <div style={{ fontFamily: "'Rajdhani'", fontSize: 26, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(12,12,26,0.95)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
      {payload.map((pp, i) => <div key={i} style={{ fontSize: 13, fontWeight: 600, color: pp.color }}>{pp.name}: ${pp.value}</div>)}
    </div>
  );
};

const UpgradePrompt = ({ feature, requiredPlan, onUpgrade, compact }) => {
  if (compact) return (
    <button onClick={onUpgrade} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(255,214,0,0.3)", background: "rgba(255,214,0,0.08)", color: "var(--gold)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Rajdhani'", letterSpacing: 0.5 }}>
      <Icon name="lock" size={10} color="var(--gold)" /> {requiredPlan.toUpperCase()}
    </button>
  );
  return (
    <div style={{ padding: 20, background: "linear-gradient(135deg, rgba(255,214,0,0.04), rgba(255,107,0,0.04))", border: "1px solid rgba(255,214,0,0.15)", borderRadius: 16, textAlign: "center", animation: "fadeIn 0.3s both" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
      <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{feature}</div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Requires <strong style={{ color: requiredPlan === "pro" ? "var(--cyan)" : "var(--gold)" }}>{requiredPlan === "pro" ? "Pro" : "Ultimate"}</strong></div>
      <button onClick={onUpgrade} style={{ background: requiredPlan === "pro" ? "var(--grad-pro)" : "var(--grad-ult)", border: "none", borderRadius: 10, padding: "10px 24px", color: requiredPlan === "ultimate" ? "#000" : "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Upgrade →</button>
    </div>
  );
};

const AdBanner = ({ onUpgrade }) => (
  <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--text3)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>AD</span>
      <span style={{ fontSize: 12, color: "var(--text3)" }}>Upgrade to remove ads and unlock premium features</span>
    </div>
    <button onClick={onUpgrade} style={{ background: "var(--grad1)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Go Pro</button>
  </div>
);

/* ═══════════ MAIN APP ═══════════ */
export default function App() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [subscription, setSubscription] = useState({ plan: "free", billing: "monthly", startDate: null, paymentMethod: null });
  const [showPayment, setShowPayment] = useState(null);
  const [paymentStep, setPaymentStep] = useState("select");
  const [paymentForm, setPaymentForm] = useState({ cardNumber: "", expiry: "", cvc: "", name: "", billingCycle: "monthly" });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [psnLinked, setPsnLinked] = useState(false);
  const [psnUsername, setPsnUsername] = useState("");
  const [psnInput, setPsnInput] = useState("");
  const [wishlist, setWishlist] = useState(new Set([1, 3, 5, 7, 10]));
  const [owned, setOwned] = useState(new Set([2, 6]));
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [notifToast, setNotifToast] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [filters, setFilters] = useState({ platforms: [], genres: [], minDiscount: 0, maxPrice: 100, psPlusTier: [], onSaleOnly: true, sortBy: "discount" });
  const [globalAlert, setGlobalAlert] = useState({ enabled: true, type: "both", minDiscount: 50, maxPrice: 30 });
  const [gameAlerts, setGameAlerts] = useState({});
  const [notifPrefs, setNotifPrefs] = useState({ email: false, push: true, telegram: false, telegramId: "", emailAddr: "" });

  const plan = plans[subscription.plan] || plans.free;
  const limits = plan.limits || plans.free.limits;
  const isPro = subscription.plan === "pro" || subscription.plan === "ultimate";

  const showToast = (msg) => { setNotifToast(msg); setTimeout(() => setNotifToast(null), 3500); };

  // Sync subscription from Supabase profile
  useEffect(() => {
    if (profile) {
      setSubscription(s => ({
        ...s,
        plan: profile.plan || "free",
        billing: profile.billing_cycle || "monthly",
        startDate: profile.subscription_start,
        paymentMethod: profile.stripe_subscription_id ? "Active" : null,
      }));
      if (profile.psn_username) { setPsnLinked(true); setPsnUsername(profile.psn_username); }
      if (profile.default_region) setSelectedRegion(profile.default_region);
      if (profile.notification_push !== undefined) setNotifPrefs(p => ({ ...p, push: profile.notification_push, email: profile.notification_email, telegram: profile.notification_telegram, telegramId: profile.telegram_chat_id || "", emailAddr: profile.email || "" }));
    }
  }, [profile]);

  // Helper: require login before action
  const requireAuth = (action) => {
    if (!user) { setShowAuthModal(true); return false; }
    return true;
  };

  const canAddWishlist = wishlist.size < limits.wishlistMax;
  const toggleWishlist = async (id) => {
    if (!requireAuth()) return;
    if (!wishlist.has(id) && !canAddWishlist) { showToast("Wishlist limit reached! Upgrade for more."); return; }
    // Update locally immediately
    setWishlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    showToast(wishlist.has(id) ? "Removed from wishlist" : "Added to wishlist ❤️");
    // Save to database
    if (user) {
      try {
        await fetch("/api/wishlist", {
          method: wishlist.has(id) ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, gameId: id }),
        });
      } catch {}
    }
  };
  const toggleOwned = async (id) => {
    if (!requireAuth()) return;
    setOwned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (user) {
      try {
        await fetch("/api/owned", {
          method: owned.has(id) ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, gameId: id }),
        });
      } catch {}
    }
  };

  const isAlerted = (game) => {
    const ga = gameAlerts[game.id];
    if (ga?.enabled && limits.perGameAlerts) {
      if (ga.type === "discount" || ga.type === "both") if (game.discount >= ga.minDiscount) return true;
      if (ga.type === "price" || ga.type === "both") if (game.salePrice <= ga.maxPrice) return true;
      return false;
    }
    if (globalAlert.enabled) {
      if (globalAlert.type === "discount" || globalAlert.type === "both") if (game.discount >= globalAlert.minDiscount) return true;
      if (globalAlert.type === "price" || globalAlert.type === "both") if (game.salePrice <= globalAlert.maxPrice) return true;
    }
    return false;
  };
  const alertedGames = GAMES.filter(isAlerted);

  const filteredGames = useMemo(() => {
    let list = [...GAMES];
    if (searchTerm) list = list.filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()) || g.genre.toLowerCase().includes(searchTerm.toLowerCase()) || g.developer.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filters.platforms.length) list = list.filter(g => g.platform.some(p => filters.platforms.includes(p)));
    if (filters.genres.length) list = list.filter(g => filters.genres.includes(g.genre));
    if (filters.minDiscount) list = list.filter(g => g.discount >= filters.minDiscount);
    if (filters.maxPrice < 100) list = list.filter(g => g.salePrice <= filters.maxPrice);
    if (filters.psPlusTier.length) list = list.filter(g => g.psPlusTier && filters.psPlusTier.includes(g.psPlusTier));
    if (filters.onSaleOnly) list = list.filter(g => g.discount > 0);
    list.sort((a, b) => { const s = filters.sortBy; if (s === "discount") return b.discount - a.discount; if (s === "price") return a.salePrice - b.salePrice; if (s === "rating") return b.rating - a.rating; if (s === "metacritic") return b.metacritic - a.metacritic; if (s === "ending") return new Date(a.endDate) - new Date(b.endDate); if (s === "newest") return new Date(b.releaseDate) - new Date(a.releaseDate); return 0; });
    return list;
  }, [searchTerm, filters]);

  const linkPSN = async () => {
    if (!requireAuth()) return;
    if (!psnInput.trim()) return;
    try {
      await fetch("/api/psn/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, psnUsername: psnInput.trim() }),
      });
      setPsnUsername(psnInput.trim()); setPsnLinked(true);
      showToast('PSN "' + psnInput.trim() + '" linked!');
      setPsnInput("");
      refreshProfile();
    } catch { showToast("Failed to link PSN account"); }
  };
  const setGameAlert = (id, alert) => setGameAlerts(prev => ({ ...prev, [id]: alert }));
  const openUpgrade = (planId) => { setShowPayment(planId || "pro"); setPaymentStep("select"); setPaymentForm({ cardNumber: "", expiry: "", cvc: "", name: "", billingCycle: "monthly" }); };
  const processPayment = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setPaymentProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: showPayment, cycle: paymentForm.billingCycle, userId: user.id }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { showToast(data.error || "Checkout failed"); setPaymentProcessing(false); }
    } catch (err) {
      showToast("Payment error. Please try again.");
      setPaymentProcessing(false);
    }
  };

  const cancelSubscription = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setSubscription({ plan: "free", billing: "", startDate: null, paymentMethod: null }); showToast("Subscription cancelled."); }
    } catch { showToast("Error opening billing portal."); }
  };
  const visibleHistory = (hist) => hist.filter(h => h.month <= limits.priceHistoryMonths);

  /* ═══════════ PAYMENT MODAL ═══════════ */
  const PaymentModal = () => {
    if (!showPayment) return null;
    const tp = plans[showPayment]; if (!tp) return null;
    const price = paymentForm.billingCycle === "yearly" ? tp.yearlyPrice : paymentForm.billingCycle === "lifetime" ? tp.lifetimePrice : tp.monthlyPrice;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(10px)" }} onClick={() => !paymentProcessing && setShowPayment(null)}>
        <div style={{ background: "var(--surface)", border: "1px solid " + (showPayment === "ultimate" ? "rgba(255,214,0,0.2)" : "rgba(0,212,255,0.2)"), borderRadius: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", animation: "fadeIn 0.3s both" }} onClick={e => e.stopPropagation()}>
          {paymentProcessing ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, border: "3px solid var(--border)", borderTopColor: tp.color, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
              <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Processing Payment...</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Securely processing with Stripe</div>
            </div>
          ) : paymentStep === "select" ? (
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div><h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22 }}>Choose Your Plan</h2><p style={{ fontSize: 12, color: "var(--text3)" }}>Unlock premium features</p></div>
                <button onClick={() => setShowPayment(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}><Icon name="x" size={16} /></button>
              </div>
              {["pro", "ultimate"].map(pid => { const pl = plans[pid]; const sel = showPayment === pid; return (
                <div key={pid} onClick={() => setShowPayment(pid)} style={{ padding: 20, borderRadius: 18, marginBottom: 12, cursor: "pointer", transition: "0.3s", border: sel ? "2px solid " + pl.color : "2px solid var(--border)", background: sel ? (pid === "ultimate" ? "rgba(255,214,0,0.06)" : "rgba(0,212,255,0.06)") : "var(--surface2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 24 }}>{pl.icon}</span><div><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 18, color: pl.color }}>{pl.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>From ${pl.monthlyPrice}/mo</div></div></div>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid " + (sel ? pl.color : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", background: sel ? pl.color : "transparent" }}>{sel && <Icon name="check" size={12} color={pid === "ultimate" ? "#000" : "#fff"} />}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{pl.features.slice(0, 4).map((f, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.04)", color: "var(--text2)" }}>✓ {f}</span>)}{pl.features.length > 4 && <span style={{ fontSize: 10, color: "var(--text3)" }}>+{pl.features.length - 4} more</span>}</div>
                </div>
              ); })}
              <button onClick={() => setPaymentStep("billing")} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, background: showPayment === "ultimate" ? "var(--grad-ult)" : "var(--grad-pro)", color: showPayment === "ultimate" ? "#000" : "#fff", marginTop: 8 }}>Continue with {plans[showPayment]?.name} →</button>
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>Cancel anytime · 7-day money-back guarantee</p>
            </div>
          ) : paymentStep === "billing" ? (
            <div style={{ padding: 28 }}>
              <button onClick={() => setPaymentStep("select")} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 12, marginBottom: 16 }}>← Back</button>
              <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{tp.icon} {tp.name} — Billing Cycle</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {[{ key: "monthly", label: "Monthly", p: tp.monthlyPrice, sub: "Billed monthly" },
                  { key: "yearly", label: "Yearly", p: tp.yearlyPrice, sub: "Save " + Math.round((1 - tp.yearlyPrice / (tp.monthlyPrice * 12)) * 100) + "%", badge: "BEST VALUE" },
                  ...(tp.lifetimePrice ? [{ key: "lifetime", label: "Lifetime", p: tp.lifetimePrice, sub: "One-time, forever", badge: "FOREVER" }] : [])
                ].map(opt => (
                  <div key={opt.key} onClick={() => setPaymentForm(f => ({ ...f, billingCycle: opt.key }))} style={{ padding: "16px 18px", borderRadius: 14, cursor: "pointer", border: paymentForm.billingCycle === opt.key ? "2px solid " + tp.color : "2px solid var(--border)", background: paymentForm.billingCycle === opt.key ? (showPayment === "ultimate" ? "rgba(255,214,0,0.06)" : "rgba(0,212,255,0.06)") : "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{opt.label}{opt.badge && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: showPayment === "ultimate" ? "rgba(255,214,0,0.15)" : "rgba(0,212,255,0.15)", color: tp.color, fontWeight: 700 }}>{opt.badge}</span>}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{opt.sub}</div></div>
                    <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, color: tp.color }}>${opt.p}{opt.key !== "lifetime" && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text3)" }}>/{opt.key === "yearly" ? "yr" : "mo"}</span>}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setPaymentStep("card")} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, background: showPayment === "ultimate" ? "var(--grad-ult)" : "var(--grad-pro)", color: showPayment === "ultimate" ? "#000" : "#fff" }}>Continue to Payment →</button>
            </div>
          ) : (
            <div style={{ padding: 28 }}>
              <button onClick={() => setPaymentStep("billing")} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 12, marginBottom: 16 }}>← Back</button>
              <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 20, marginBottom: 20 }}>💳 Payment Details</h2>
              <div style={{ padding: "14px 18px", background: "var(--surface2)", borderRadius: 12, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{tp.icon} {tp.name} — {paymentForm.billingCycle}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{paymentForm.billingCycle === "lifetime" ? "One-time" : "Billed " + paymentForm.billingCycle}</div></div>
                <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, color: tp.color }}>${price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>CARDHOLDER NAME</label><input placeholder="John Doe" value={paymentForm.name} onChange={e => setPaymentForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>CARD NUMBER</label><input placeholder="4242 4242 4242 4242" value={paymentForm.cardNumber} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setPaymentForm(f => ({ ...f, cardNumber: v.replace(/(.{4})/g, "$1 ").trim() })); }} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 13, outline: "none", letterSpacing: 2 }} /></div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>EXPIRY</label><input placeholder="MM / YY" value={paymentForm.expiry} onChange={e => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + " / " + v.slice(2); setPaymentForm(f => ({ ...f, expiry: v })); }} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>CVC</label><input placeholder="123" value={paymentForm.cvc} type="password" onChange={e => setPaymentForm(f => ({ ...f, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                </div>
              </div>
              <button onClick={processPayment} disabled={!paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvc || !paymentForm.name} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: paymentForm.cardNumber && paymentForm.name ? "pointer" : "default", fontWeight: 700, fontSize: 15, marginTop: 20, background: paymentForm.cardNumber && paymentForm.name ? (showPayment === "ultimate" ? "var(--grad-ult)" : "var(--grad-pro)") : "var(--surface2)", color: paymentForm.cardNumber && paymentForm.name ? (showPayment === "ultimate" ? "#000" : "#fff") : "var(--text3)" }}>
                🔒 Pay ${price} {paymentForm.billingCycle !== "lifetime" && ("/ " + (paymentForm.billingCycle === "yearly" ? "year" : "month"))}
              </button>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}>{["🔒 SSL Secured", "💳 Stripe", "🛡️ 7-Day Refund"].map(t => <span key={t} style={{ fontSize: 10, color: "var(--text3)" }}>{t}</span>)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════ GAME DETAIL ═══════════ */
  const GameDetail = ({ game, onClose }) => {
    const [tab, setTab] = useState("overview");
    const ga = gameAlerts[game.id] || { enabled: false, type: "both", minDiscount: 50, maxPrice: 30 };
    const days = Math.ceil((new Date(game.endDate) - new Date()) / 86400000);
    const visH = visibleHistory(game.priceHistory);
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }} onClick={onClose}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "auto", animation: "fadeIn 0.3s both" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "22px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: "var(--surface2)", overflow: "hidden", flexShrink: 0 }}><img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 20, margin: "0 0 4px" }}>{game.title}</h2>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>{game.platform.map(pp => <span key={pp} className="badge" style={{ background: "rgba(0,111,255,0.15)", color: "var(--blue)" }}>{pp}</span>)}<span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text2)" }}>{game.genre}</span>{game.psPlusTier && <span className="badge" style={{ background: "rgba(255,214,0,0.15)", color: "var(--yellow)" }}>PS+ {game.psPlusTier}</span>}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{game.developer} · {game.size}</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0 }}><Icon name="x" size={16} /></button>
          </div>
          <div style={{ padding: "12px 22px", background: "rgba(0,111,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 30, color: "var(--green)" }}>${game.salePrice}</span><span style={{ fontSize: 14, color: "var(--text3)", textDecoration: "line-through" }}>${game.originalPrice}</span><span style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15, color: game.discount >= 60 ? "var(--red)" : "var(--orange)", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 8 }}>-{game.discount}%</span></div>
            {limits.priceStats ? (
              <div style={{ display: "flex", gap: 6 }}>{[{ l: "LOWEST", v: "$" + game.lowestEver, c: "var(--cyan)" }, { l: "AVG", v: "$" + game.avgPrice }, { l: "SALES", v: game.saleCount + "x" }].map(s => <div key={s.l} style={{ textAlign: "center", padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}><div style={{ fontSize: 8, color: "var(--text3)", letterSpacing: 1, fontFamily: "'Rajdhani'", fontWeight: 600 }}>{s.l}</div><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 13, color: s.c || "var(--text2)" }}>{s.v}</div></div>)}</div>
            ) : <UpgradePrompt compact requiredPlan="pro" onUpgrade={() => openUpgrade("pro")} />}
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 22px" }}>{["overview", "price history", "regions", "alerts"].map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 12px", background: "none", border: "none", borderBottom: tab === t ? "2px solid var(--cyan)" : "2px solid transparent", color: tab === t ? "var(--cyan)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>)}</div>
          <div style={{ padding: 22 }}>
            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 8, fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'" }}>RATINGS</div><div style={{ display: "flex", gap: 16 }}><div><div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: "var(--yellow)" }}>⭐{game.rating}</div><div style={{ fontSize: 10, color: "var(--text3)" }}>Users</div></div><div><div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: game.metacritic >= 85 ? "var(--green)" : "var(--orange)" }}>{game.metacritic}</div><div style={{ fontSize: 10, color: "var(--text3)" }}>Metacritic</div></div></div></div>
                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 8, fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'" }}>INFO</div><div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>Players: {game.players}<br/>Online: {game.onlinePlay ? "Yes" : "No"}<br/>Size: {game.size}</div></div>
                <div style={{ gridColumn: "1/-1", background: "var(--surface2)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon name="clock" size={14} color={days <= 3 ? "var(--red)" : "var(--text3)"} /><span style={{ fontSize: 12, color: days <= 3 ? "var(--red)" : "var(--text2)", fontWeight: days <= 3 ? 700 : 400 }}>{days <= 3 ? "⚡ " + days + "d left!" : days + " days remaining"}</span></div>
              </div>
            )}
            {tab === "price history" && (<div><div style={{ height: 200 }}><ResponsiveContainer><AreaChart data={visH}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/><stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" /><XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a5568" }} /><YAxis tick={{ fontSize: 9, fill: "#4a5568" }} domain={[0, "auto"]} /><Tooltip content={<CustomTooltip />} /><Area type="stepAfter" dataKey="price" stroke="#00d4ff" fill="url(#cg)" strokeWidth={2} name="Price" /></AreaChart></ResponsiveContainer></div>{limits.priceHistoryMonths < 36 && <div style={{ padding: "10px 14px", background: "rgba(255,214,0,0.05)", border: "1px solid rgba(255,214,0,0.12)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}><span style={{ fontSize: 12, color: "var(--text2)" }}>Showing {limits.priceHistoryMonths}mo. Upgrade for full history.</span><button onClick={() => openUpgrade(subscription.plan === "free" ? "pro" : "ultimate")} style={{ background: "var(--grad-gold)", border: "none", borderRadius: 8, padding: "5px 12px", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Upgrade</button></div>}</div>)}
            {tab === "regions" && (limits.regionsMax > 1 ? (<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{game.regionPrices.slice(0, limits.regionsMax).map(r => <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface2)", borderRadius: 10 }}><span style={{ fontSize: 18 }}>{r.flag}</span><span style={{ flex: 1, fontSize: 12 }}>{r.name}</span>{r.salePrice ? <><span style={{ fontSize: 10, color: "var(--text3)", textDecoration: "line-through" }}>{r.currency}{r.price}</span><span style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 14, color: "var(--green)" }}>{r.currency}{r.salePrice}</span><span className="badge" style={{ background: "rgba(255,45,85,0.1)", color: "var(--red)" }}>-{r.discount}%</span></> : <span style={{ fontFamily: "'Rajdhani'", fontWeight: 600, color: "var(--text2)" }}>{r.currency}{r.price}</span>}</div>)}{limits.regionsMax < 7 && <UpgradePrompt feature={"All " + REGIONS.length + " regions"} requiredPlan="ultimate" onUpgrade={() => openUpgrade("ultimate")} />}</div>) : <UpgradePrompt feature="Multi-Region Comparison" requiredPlan="pro" onUpgrade={() => openUpgrade("pro")} />)}
            {tab === "alerts" && (limits.perGameAlerts ? (<div style={{ background: "var(--surface2)", borderRadius: 14, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><div><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 14 }}>Custom Alert</div><div style={{ fontSize: 11, color: "var(--text3)" }}>Override global settings</div></div><Toggle on={ga.enabled} onToggle={() => setGameAlert(game.id, { ...ga, enabled: !ga.enabled })} /></div>{ga.enabled && <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.3s both" }}><div style={{ display: "flex", gap: 6 }}>{[{ key: "discount", label: "Discount %" }, { key: "price", label: "Max Price" }, { key: "both", label: "Either" }].map(o => <Pill key={o.key} active={ga.type === o.key} onClick={() => setGameAlert(game.id, { ...ga, type: o.key })}>{o.label}</Pill>)}</div>{(ga.type === "discount" || ga.type === "both") && <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Min Discount: <strong style={{ color: "var(--green)" }}>{ga.minDiscount}%</strong></div><input type="range" min={10} max={90} step={5} value={ga.minDiscount} onChange={e => setGameAlert(game.id, { ...ga, minDiscount: +e.target.value })} style={{ width: "100%" }} /></div>}{(ga.type === "price" || ga.type === "both") && <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Max Price: <strong style={{ color: "var(--green)" }}>${ga.maxPrice}</strong></div><input type="range" min={5} max={60} step={1} value={ga.maxPrice} onChange={e => setGameAlert(game.id, { ...ga, maxPrice: +e.target.value })} style={{ width: "100%" }} /></div>}</div>}</div>) : <UpgradePrompt feature="Per-Game Custom Alerts" requiredPlan="pro" onUpgrade={() => openUpgrade("pro")} />)}
          </div>
          <div style={{ padding: "12px 22px 18px", display: "flex", gap: 8, borderTop: "1px solid var(--border)" }}>
            <button onClick={() => toggleWishlist(game.id)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: wishlist.has(game.id) ? "rgba(255,45,85,0.12)" : "var(--surface2)", color: wishlist.has(game.id) ? "var(--red)" : "var(--text)" }}>{wishlist.has(game.id) ? "❤️ Wishlisted" : "🤍 Wishlist"}</button>
            <button onClick={() => toggleOwned(game.id)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: owned.has(game.id) ? "rgba(0,230,118,0.12)" : "var(--surface2)", color: owned.has(game.id) ? "var(--green)" : "var(--text)" }}>{owned.has(game.id) ? "✅ Owned" : "📥 Owned"}</button>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════ GAME CARDS ═══════════ */
  const GameCard = ({ game, idx }) => { const al = isAlerted(game), days = Math.ceil((new Date(game.endDate) - new Date()) / 86400000); return (
    <div onClick={() => setSelectedGame(game)} style={{ background: al ? "linear-gradient(160deg, rgba(0,111,255,0.06), rgba(0,212,255,0.03))" : "var(--surface)", border: al ? "1px solid rgba(0,212,255,0.2)" : "1px solid var(--border)", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", animation: "fadeIn 0.4s " + (idx * 0.03) + "s both", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.3)"; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      {al && <div style={{ position: "absolute", zIndex: 2, top: 8, left: 8, background: "var(--grad1)", color: "#fff", padding: "2px 7px", borderRadius: 5, fontSize: 8, fontWeight: 700, fontFamily: "'Rajdhani'", letterSpacing: 1.5 }}>🔔 ALERT</div>}
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, " + (al ? "rgba(0,60,140,0.3)" : "rgba(20,20,40,0.5)") + ", rgba(0,0,0,0.1))", position: "relative", overflow: "hidden" }}><img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", top: 7, right: 7, background: game.discount >= 60 ? "var(--red)" : game.discount >= 50 ? "var(--orange)" : "rgba(255,255,255,0.12)", color: "#fff", padding: "3px 6px", borderRadius: 6, fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 11 }}>-{game.discount}%</div></div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}><h3 style={{ fontWeight: 700, fontSize: 12, margin: 0, lineHeight: 1.3, flex: 1, marginRight: 4 }}>{game.title}</h3><button onClick={e => { e.stopPropagation(); toggleWishlist(game.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}>{wishlist.has(game.id) ? "❤️" : "🤍"}</button></div>
        <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>{game.platform.map(pp => <span key={pp} className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text3)", fontSize: 8 }}>{pp}</span>)}<span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text3)", fontSize: 8 }}>⭐{game.rating}</span></div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 17, color: "var(--green)" }}>${game.salePrice}</span><span style={{ fontSize: 10, color: "var(--text3)", textDecoration: "line-through" }}>${game.originalPrice}</span></div>
        <div style={{ fontSize: 9, color: days <= 3 ? "var(--red)" : "var(--text3)", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}><Icon name="clock" size={9} /> {days <= 3 ? "⚡" + days + "d" : days + "d left"}</div>
      </div>
    </div>
  ); };

  const GameRow = ({ game, idx }) => { const al = isAlerted(game); return (
    <div onClick={() => setSelectedGame(game)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: al ? "rgba(0,111,255,0.04)" : "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", transition: "0.2s", animation: "slideIn 0.3s " + (idx * 0.03) + "s both" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = al ? "rgba(0,111,255,0.04)" : "var(--surface)"}>
      <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}><img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 12 }}>{game.title}{al && " 🔔"}</div><div style={{ fontSize: 10, color: "var(--text3)" }}>{game.platform.join("/")} · {game.genre}</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>${game.salePrice}</div><div style={{ fontSize: 9, color: "var(--text3)" }}><span style={{ textDecoration: "line-through" }}>${game.originalPrice}</span> <span style={{ color: "var(--red)" }}>-{game.discount}%</span></div></div>
      <button onClick={e => { e.stopPropagation(); toggleWishlist(game.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{wishlist.has(game.id) ? "❤️" : "🤍"}</button>
    </div>
  ); };

  /* ═══════════ PAGES ═══════════ */
  const DashboardPage = () => (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      {!isPro && <AdBanner onUpgrade={() => openUpgrade("pro")} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div><h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, marginBottom: 4 }}>{psnLinked ? "Welcome, " + psnUsername : "PS Game Deals Radar"}</h2><p style={{ fontSize: 12, color: "var(--text3)" }}>v1.0.0 · {GAMES.length} games · {alertedGames.length} alerts · {wishlist.size}/{limits.wishlistMax === Infinity ? "∞" : limits.wishlistMax} wishlisted</p></div>
        <span className="badge" style={{ background: (plan.color || "#888") + "20", color: plan.color, fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 6 }}>{plan.icon} {(plan.name || "FREE").toUpperCase()}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 22 }}>
        <StatCard label="Alerts" value={alertedGames.length} color="var(--cyan)" /><StatCard label="Avg Discount" value={Math.round(GAMES.filter(g => g.discount > 0).reduce((s, g) => s + g.discount, 0) / GAMES.filter(g => g.discount > 0).length) + "%"} color="var(--orange)" /><StatCard label="Best Deal" value={Math.max(...GAMES.map(g => g.discount)) + "%"} color="var(--red)" /><StatCard label="Lowest" value={"$" + Math.min(...GAMES.map(g => g.salePrice))} color="var(--green)" />
      </div>
      {limits.priceStats && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 22 }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", marginBottom: 10 }}>DISCOUNT DISTRIBUTION</div><div style={{ height: 130 }}><ResponsiveContainer><BarChart data={[{ r: "0-25%", c: GAMES.filter(g => g.discount < 25).length }, { r: "25-50%", c: GAMES.filter(g => g.discount >= 25 && g.discount < 50).length }, { r: "50-75%", c: GAMES.filter(g => g.discount >= 50 && g.discount < 75).length }, { r: "75%+", c: GAMES.filter(g => g.discount >= 75).length }]}><XAxis dataKey="r" tick={{ fontSize: 9, fill: "#4a5568" }} /><YAxis tick={{ fontSize: 9, fill: "#4a5568" }} allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="c" fill="url(#bg)" radius={[6, 6, 0, 0]} name="Games" /><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" /><stop offset="100%" stopColor="#006fff" /></linearGradient></defs></BarChart></ResponsiveContainer></div></div>}
      <h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 600, fontSize: 13, color: "var(--text2)", marginBottom: 10, letterSpacing: 1 }}>🔥 HOT DEALS</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 22 }}>{alertedGames.slice(0, 6).map((g, i) => <GameCard key={g.id} game={g} idx={i} />)}</div>
      <h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 600, fontSize: 13, color: "var(--text2)", marginBottom: 10, letterSpacing: 1 }}>⏰ ENDING SOON</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[...GAMES].sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).slice(0, 4).map((g, i) => <GameRow key={g.id} game={g} idx={i} />)}</div>
    </div>
  );

  const BrowsePage = () => (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      {!isPro && <AdBanner onUpgrade={() => openUpgrade("pro")} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22 }}>Browse</h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px", color: "var(--text)", fontSize: 12, width: 180, outline: "none" }} />
          <button onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? "rgba(0,212,255,0.1)" : "var(--surface)", border: "1px solid " + (showFilters ? "rgba(0,212,255,0.3)" : "var(--border)"), borderRadius: 10, padding: "7px 10px", cursor: "pointer", color: showFilters ? "var(--cyan)" : "var(--text2)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}><Icon name="filter" size={14} /></button>
          <div style={{ display: "flex", gap: 2, background: "var(--surface)", borderRadius: 8, padding: 2 }}>{[["grid", "grid"], ["list", "list"]].map(([k, ic]) => <button key={k} onClick={() => setViewMode(k)} style={{ background: viewMode === k ? "var(--surface2)" : "transparent", border: "none", borderRadius: 6, padding: 5, cursor: "pointer", color: viewMode === k ? "var(--cyan)" : "var(--text3)" }}><Icon name={ic} size={14} /></button>)}</div>
        </div>
      </div>
      {showFilters && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 16, animation: "fadeIn 0.2s both" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}><div><div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5, fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'" }}>PLATFORM</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{["PS5", "PS4"].map(pp => <Pill key={pp} active={filters.platforms.includes(pp)} onClick={() => setFilters(f => ({ ...f, platforms: f.platforms.includes(pp) ? f.platforms.filter(x => x !== pp) : [...f.platforms, pp] }))}>{pp}</Pill>)}</div></div><div><div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5, fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'" }}>GENRE</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{GENRES.map(g => <Pill key={g} active={filters.genres.includes(g)} onClick={() => setFilters(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }))}>{g}</Pill>)}</div></div><div><div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5 }}>Min Discount: <strong style={{ color: "var(--green)" }}>{filters.minDiscount}%</strong></div><input type="range" min={0} max={90} step={5} value={filters.minDiscount} onChange={e => setFilters(f => ({ ...f, minDiscount: +e.target.value }))} style={{ width: "100%" }} /></div><div><div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5 }}>Max Price: <strong style={{ color: "var(--green)" }}>${filters.maxPrice}</strong></div><input type="range" min={5} max={100} step={5} value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: +e.target.value }))} style={{ width: "100%" }} /></div><div><div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5, fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'" }}>SORT</div><select value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 8px", color: "var(--text)", fontSize: 11, width: "100%", outline: "none" }}>{[["discount", "Discount"], ["price", "Price"], ["rating", "Rating"], ["metacritic", "Metacritic"], ["ending", "Ending Soon"], ["newest", "Newest"]].map(([v, l]) => <option key={v} value={v} style={{ background: "#0c0c1a" }}>{l}</option>)}</select></div></div></div>}
      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>{filteredGames.length} games</div>
      {viewMode === "grid" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>{filteredGames.map((g, i) => <GameCard key={g.id} game={g} idx={i} />)}</div> : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{filteredGames.map((g, i) => <GameRow key={g.id} game={g} idx={i} />)}</div>}
    </div>
  );

  const WishlistPage = () => { const wG = GAMES.filter(g => wishlist.has(g.id)), oG = GAMES.filter(g => owned.has(g.id)); const [wT, setWT] = useState("w"); return (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22 }}>My Library</h2>{psnLinked && <div style={{ fontSize: 11, color: "var(--cyan)" }}>🔗 {psnUsername}</div>}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{wishlist.size}/{limits.wishlistMax === Infinity ? "∞" : limits.wishlistMax}</div></div>
      {!canAddWishlist && <div style={{ padding: "10px 14px", background: "rgba(255,214,0,0.06)", border: "1px solid rgba(255,214,0,0.15)", borderRadius: 10, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: "var(--gold)" }}>⚠️ Wishlist full</span><button onClick={() => openUpgrade(subscription.plan === "free" ? "pro" : "ultimate")} style={{ background: "var(--grad-gold)", border: "none", borderRadius: 8, padding: "5px 12px", color: "#000", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Upgrade</button></div>}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3, width: "fit-content" }}><Pill active={wT === "w"} onClick={() => setWT("w")} count={wG.length}>❤️ Wishlist</Pill><Pill active={wT === "o"} onClick={() => setWT("o")} count={oG.length}>✅ Owned</Pill></div>
      {wT === "w" ? (wG.length ? <div><div style={{ background: "rgba(0,230,118,0.06)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--green)" }}>💰 Save <strong>${wG.reduce((s, g) => s + (g.originalPrice - g.salePrice), 0).toFixed(2)}</strong></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>{wG.map((g, i) => <GameCard key={g.id} game={g} idx={i} />)}</div></div> : <div style={{ textAlign: "center", padding: "50px 20px" }}><div style={{ fontSize: 40, marginBottom: 10 }}>🤍</div><p style={{ fontSize: 14, color: "var(--text3)", fontFamily: "'Rajdhani'" }}>Wishlist empty</p></div>) : (oG.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>{oG.map((g, i) => <GameCard key={g.id} game={g} idx={i} />)}</div> : <div style={{ textAlign: "center", padding: "50px 20px" }}><div style={{ fontSize: 40, marginBottom: 10 }}>📚</div><p style={{ fontSize: 14, color: "var(--text3)", fontFamily: "'Rajdhani'" }}>No owned games</p></div>)}
    </div>
  ); };

  const AlertsPage = () => (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Alerts</h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15 }}>🌐 Global Rules</h3></div><Toggle on={globalAlert.enabled} onToggle={() => setGlobalAlert(a => ({ ...a, enabled: !a.enabled }))} /></div>
        {globalAlert.enabled && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div style={{ display: "flex", gap: 6 }}>{[{ k: "discount", l: "Discount %" }, { k: "price", l: "Max Price" }, { k: "both", l: "Either" }].map(o => <Pill key={o.k} active={globalAlert.type === o.k} onClick={() => setGlobalAlert(a => ({ ...a, type: o.k }))}>{o.l}</Pill>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{(globalAlert.type === "discount" || globalAlert.type === "both") && <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Min Discount: <strong style={{ color: "var(--green)" }}>{globalAlert.minDiscount}%</strong></div><input type="range" min={10} max={90} step={5} value={globalAlert.minDiscount} onChange={e => setGlobalAlert(a => ({ ...a, minDiscount: +e.target.value }))} style={{ width: "100%" }} /></div>}{(globalAlert.type === "price" || globalAlert.type === "both") && <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Max Price: <strong style={{ color: "var(--green)" }}>${globalAlert.maxPrice}</strong></div><input type="range" min={5} max={60} step={1} value={globalAlert.maxPrice} onChange={e => setGlobalAlert(a => ({ ...a, maxPrice: +e.target.value }))} style={{ width: "100%" }} /></div>}</div><div style={{ padding: "8px 12px", background: "rgba(0,111,255,0.06)", borderRadius: 8, fontSize: 11, color: "var(--text2)" }}>Matching <strong style={{ color: "var(--cyan)" }}>{alertedGames.length}</strong> games</div></div>}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📬 Channels</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--surface2)", borderRadius: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="bell" size={14} /><span style={{ fontSize: 12, fontWeight: 600 }}>Push</span></div><Toggle on={notifPrefs.push} onToggle={() => setNotifPrefs(p => ({ ...p, push: !p.push }))} /></div>
          <div style={{ padding: "9px 12px", background: "var(--surface2)", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="mail" size={14} /><span style={{ fontSize: 12, fontWeight: 600 }}>Email</span>{!limits.emailNotifs && <UpgradePrompt compact requiredPlan="pro" onUpgrade={() => openUpgrade("pro")} />}</div><Toggle on={notifPrefs.email && limits.emailNotifs} onToggle={() => limits.emailNotifs && setNotifPrefs(p => ({ ...p, email: !p.email }))} disabled={!limits.emailNotifs} /></div>{notifPrefs.email && limits.emailNotifs && <input placeholder="your@email.com" value={notifPrefs.emailAddr} onChange={e => setNotifPrefs(p => ({ ...p, emailAddr: e.target.value }))} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontSize: 11, width: "100%", outline: "none", marginTop: 8 }} />}</div>
          <div style={{ padding: "9px 12px", background: "var(--surface2)", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14 }}>💬</span><span style={{ fontSize: 12, fontWeight: 600 }}>Telegram</span>{!limits.telegramNotifs && <UpgradePrompt compact requiredPlan="ultimate" onUpgrade={() => openUpgrade("ultimate")} />}</div><Toggle on={notifPrefs.telegram && limits.telegramNotifs} onToggle={() => limits.telegramNotifs && setNotifPrefs(p => ({ ...p, telegram: !p.telegram }))} disabled={!limits.telegramNotifs} /></div>{notifPrefs.telegram && limits.telegramNotifs && <input placeholder="@id" value={notifPrefs.telegramId} onChange={e => setNotifPrefs(p => ({ ...p, telegramId: e.target.value }))} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontSize: 11, width: "100%", outline: "none", marginTop: 8 }} />}</div>
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>🎯 Per-Game Alerts {!limits.perGameAlerts && <UpgradePrompt compact requiredPlan="pro" onUpgrade={() => openUpgrade("pro")} />}</h3>
        {limits.perGameAlerts ? (Object.entries(gameAlerts).filter(([, a]) => a.enabled).length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{Object.entries(gameAlerts).filter(([, a]) => a.enabled).map(([id, a]) => { const g = GAMES.find(gm => gm.id === +id); if (!g) return null; return <div key={id} onClick={() => setSelectedGame(g)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface2)", borderRadius: 8, cursor: "pointer" }}><div style={{ width: 24, height: 24, borderRadius: 5, overflow: "hidden", flexShrink: 0 }}><img src={g.image} alt={g.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div><div style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{g.title}</div><div style={{ fontSize: 9, color: "var(--cyan)" }}>{(a.type === "discount" || a.type === "both") && <div>≥{a.minDiscount}%</div>}{(a.type === "price" || a.type === "both") && <div>≤${a.maxPrice}</div>}</div></div>; })}</div> : <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>No per-game alerts. Open any game → Alerts tab.</p>) : <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>Upgrade to Pro for per-game alerts.</p>}
      </div>
    </div>
  );

  const PricingPage = () => (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}><h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 26, marginBottom: 4 }}>Choose Your Plan</h2><p style={{ fontSize: 13, color: "var(--text3)" }}>PS Game Deals Radar v1.0.0 — Save more with premium features</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 860, margin: "0 auto" }}>
        {Object.values(plans).map(pl => { const active = subscription.plan === pl.id; return (
          <div key={pl.id} style={{ background: "var(--surface)", borderRadius: 20, overflow: "hidden", border: active ? "2px solid " + pl.color : pl.id === "pro" ? "2px solid rgba(0,212,255,0.3)" : "1px solid var(--border)", animation: pl.id === "ultimate" ? "goldGlow 3s infinite" : pl.id === "pro" ? "glow 3s infinite" : "none" }}>
            {pl.id === "pro" && <div style={{ background: "var(--grad-pro)", padding: 4, textAlign: "center", fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: 1.5, fontFamily: "'Rajdhani'" }}>MOST POPULAR</div>}
            {pl.id === "ultimate" && <div style={{ background: "var(--grad-ult)", padding: 4, textAlign: "center", fontSize: 9, fontWeight: 700, color: "#000", letterSpacing: 1.5, fontFamily: "'Rajdhani'" }}>BEST VALUE</div>}
            <div style={{ padding: "22px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 26 }}>{pl.icon}</span><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 20, color: pl.color }}>{pl.name}</div></div>
              <div style={{ marginBottom: 18 }}>{pl.id === "free" ? <div style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 32 }}>Free</div> : <div><span style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 32, color: pl.color }}>${pl.monthlyPrice}</span><span style={{ fontSize: 13, color: "var(--text3)" }}>/mo</span>{pl.yearlyPrice && <div style={{ fontSize: 11, color: "var(--text3)" }}>${pl.yearlyPrice}/yr (save {Math.round((1 - pl.yearlyPrice / (pl.monthlyPrice * 12)) * 100)}%)</div>}{pl.lifetimePrice && <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>Lifetime: ${pl.lifetimePrice}</div>}</div>}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>{pl.features.map((f, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "var(--text2)" }}><span style={{ color: "var(--green)", flexShrink: 0 }}>✓</span>{f}</div>)}{pl.notIncluded.map((f, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "var(--text3)", opacity: 0.4 }}><span>✗</span>{f}</div>)}</div>
              {active ? <div style={{ padding: 10, borderRadius: 10, border: "1px solid " + pl.color, textAlign: "center", fontSize: 12, fontWeight: 700, color: pl.color }}>✓ Current Plan</div> : pl.id !== "free" ? <button onClick={() => openUpgrade(pl.id)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: pl.id === "ultimate" ? "var(--grad-ult)" : "var(--grad-pro)", color: pl.id === "ultimate" ? "#000" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{subscription.plan === "free" ? "Get Started" : "Upgrade"} →</button> : null}
            </div>
          </div>
        ); })}
      </div>
      <div style={{ textAlign: "center", marginTop: 22, display: "flex", justifyContent: "center", gap: 14 }}>{["🔒 SSL Secure", "💳 Stripe", "🛡️ 7-Day Refund", "🚫 Cancel Anytime"].map(t => <span key={t} style={{ fontSize: 10, color: "var(--text3)" }}>{t}</span>)}</div>
    </div>
  );

  const AccountPage = () => (
    <div style={{ animation: "fadeIn 0.4s both" }}>
      <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Account</h2>
      <div style={{ background: "var(--surface)", border: "1px solid " + (subscription.plan !== "free" ? plan.color + "33" : "var(--border)"), borderRadius: 16, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: (plan.color || "#888") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "2px solid " + (plan.color || "var(--border)") }}>{plan.icon}</div>
          <div><div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 17, color: plan.color }}>{plan.name} Plan</div>{subscription.plan !== "free" ? <div style={{ fontSize: 11, color: "var(--text3)" }}>Billed {subscription.billing} · {subscription.paymentMethod} · Since {new Date(subscription.startDate).toLocaleDateString()}</div> : <div style={{ fontSize: 11, color: "var(--text3)" }}>Free tier</div>}</div>
        </div>
        {subscription.plan !== "free" ? <div style={{ display: "flex", gap: 8 }}>{subscription.plan === "pro" && <button onClick={() => openUpgrade("ultimate")} style={{ flex: 1, padding: 9, borderRadius: 10, border: "none", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>⬆️ Upgrade to Ultimate</button>}<button onClick={cancelSubscription} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,45,85,0.2)", background: "rgba(255,45,85,0.06)", color: "var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancel</button></div> : <button onClick={() => setPage("pricing")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: "var(--grad-pro)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>⚡ Upgrade →</button>}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ width: 46, height: 46, borderRadius: 12, background: psnLinked ? "rgba(0,112,209,0.2)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎮</div><div><h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 16 }}>PSN</h3>{psnLinked ? <div style={{ fontSize: 11, color: "var(--green)" }}>● {psnUsername}</div> : <div style={{ fontSize: 11, color: "var(--text3)" }}>Link to sync</div>}</div></div>
        {!psnLinked ? <div><div style={{ padding: 14, background: "rgba(0,112,209,0.06)", borderRadius: 10, marginBottom: 12, fontSize: 11, color: "var(--text2)", lineHeight: 1.8 }}>✅ Auto-import wishlist · ✅ Track drops · ✅ Owned games · ✅ PS+ pricing</div><div style={{ display: "flex", gap: 8 }}><input placeholder="PSN ID" value={psnInput} onChange={e => setPsnInput(e.target.value)} onKeyDown={e => e.key === "Enter" && linkPSN()} style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: 12, outline: "none" }} /><button onClick={linkPSN} disabled={!psnInput.trim()} style={{ background: psnInput.trim() ? "var(--grad1)" : "var(--surface2)", border: "none", borderRadius: 10, padding: "9px 18px", color: psnInput.trim() ? "#fff" : "var(--text3)", fontWeight: 700, cursor: psnInput.trim() ? "pointer" : "default", fontSize: 12 }}>Link</button></div></div> : <div style={{ display: "flex", gap: 8 }}><button onClick={() => showToast("Re-synced ✅")} style={{ flex: 1, padding: 9, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🔄 Re-sync</button><button onClick={() => { setPsnLinked(false); setPsnUsername(""); showToast("Unlinked"); }} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,45,85,0.2)", background: "rgba(255,45,85,0.06)", color: "var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Unlink</button></div>}
      </div>
      {limits.exportData && <button onClick={() => showToast("Data exported! 📊")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📥 Export Data (CSV)</button>}
    </div>
  );

  /* ═══════════ ADMIN SETTINGS PAGE ═══════════ */
  const AdminSettingsPage = () => {
    const [editPlans, setEditPlans] = useState(JSON.parse(JSON.stringify(plans)));
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);

    const updatePlan = (planId, field, value) => {
      setEditPlans(prev => {
        const next = { ...prev, [planId]: { ...prev[planId], [field]: value } };
        setHasChanges(true); setSaved(false);
        return next;
      });
    };

    const updateLimit = (planId, key, value) => {
      setEditPlans(prev => {
        const next = { ...prev, [planId]: { ...prev[planId], limits: { ...prev[planId].limits, [key]: value } } };
        setHasChanges(true); setSaved(false);
        return next;
      });
    };

    const rebuildFeatureList = (planObj) => {
      const l = planObj.limits;
      const feats = [];
      if (l.wishlistMax >= 999) feats.push("Unlimited game tracking");
      else feats.push("Track up to " + l.wishlistMax + " games");
      feats.push(l.regionsMax === 1 ? "1 region" : l.regionsMax + " regions");
      feats.push(l.priceHistoryMonths + "-month price history");
      const notifs = ["Push"];
      if (l.emailNotifs) notifs.push("Email");
      if (l.telegramNotifs) notifs.push("Telegram");
      feats.push(notifs.join(" + ") + " notifications");
      if (l.perGameAlerts) feats.push("Per-game custom alerts");
      if (l.desiredPrice) feats.push("Desired price targets");
      if (l.priceStats) feats.push("Price stats & analysis");
      if (l.dlcTracking) feats.push("DLC & add-on tracking");
      if (l.multiRegionNotifs) feats.push("Multi-region notifications");
      if (l.priorityAlerts) feats.push("Priority deal alerts");
      if (l.exportData) feats.push("Data export (CSV/JSON)");
      if (l.noAds) feats.push("Ad-free experience");
      return feats;
    };

    const saveAll = () => {
      const finalized = {};
      for (const [pid, pl] of Object.entries(editPlans)) {
        const feats = rebuildFeatureList(pl);
        const allFeatureKeys = ALL_FEATURES.filter(f => f.type === "bool").map(f => f.key);
        const notInc = allFeatureKeys.filter(k => !pl.limits[k]).map(k => ALL_FEATURES.find(f => f.key === k)?.label).filter(Boolean);
        finalized[pid] = { ...pl, features: feats, notIncluded: pid === "free" ? notInc : (pid === "pro" ? allFeatureKeys.filter(k => !pl.limits[k]).map(k => ALL_FEATURES.find(f => f.key === k)?.label).filter(Boolean) : []) };
      }
      setPlans(finalized);
      setHasChanges(false);
      setSaved(true);
      showToast("Subscription plans updated! ✅");
    };

    const resetAll = () => { setEditPlans(JSON.parse(JSON.stringify(DEFAULT_PLANS))); setHasChanges(true); setSaved(false); };

    const ICONS = ["🎮","⚡","👑","🔥","💎","🚀","⭐","🏆","💰","🎯","🛡️","✨"];
    const COLORS = ["#8892a4","#00d4ff","#ffd600","#ff2d55","#00e676","#ff9500","#006fff","#9c27b0","#e91e63","#00bcd4"];

    return (
      <div style={{ animation: "fadeIn 0.4s both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Admin — Subscription Plans</h2>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>Customize tier names, prices, and features. Changes apply instantly.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetAll} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text3)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Reset Defaults</button>
            <button onClick={saveAll} disabled={!hasChanges} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: hasChanges ? "var(--grad1)" : "var(--surface2)", color: hasChanges ? "#fff" : "var(--text3)", cursor: hasChanges ? "pointer" : "default", fontSize: 12, fontWeight: 700 }}>
              {saved ? "✅ Saved!" : "💾 Save Changes"}
            </button>
          </div>
        </div>

        {["free", "pro", "ultimate"].map((pid, tierIdx) => {
          const pl = editPlans[pid]; if (!pl) return null;
          return (
            <div key={pid} style={{ background: "var(--surface)", border: "1px solid " + (pl.color || "var(--border)") + "33", borderRadius: 20, padding: 24, marginBottom: 20, animation: "fadeIn 0.4s " + (tierIdx * 0.1) + "s both" }}>

              {/* ── TIER HEADER ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: (pl.color || "#888") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid " + (pl.color || "#888") + "40" }}>{pl.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 20, color: pl.color || "var(--text)" }}>{pl.name} Tier</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {pid === "free" ? "Free forever" : pl.monthlyPrice ? "$" + pl.monthlyPrice + "/mo · $" + pl.yearlyPrice + "/yr" + (pl.lifetimePrice ? " · $" + pl.lifetimePrice + " lifetime" : "") : "Configure pricing below"}
                  </div>
                </div>
              </div>

              {/* ── NAME & ICON/COLOR ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 6 }}>TIER NAME</label>
                  <input value={pl.name} onChange={e => updatePlan(pid, "name", e.target.value)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, fontWeight: 600, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 6 }}>ICON</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ICONS.map(ic => (
                      <button key={ic} onClick={() => updatePlan(pid, "icon", ic)} style={{ width: 34, height: 34, borderRadius: 8, border: pl.icon === ic ? "2px solid " + (pl.color || "var(--cyan)") : "1px solid var(--border)", background: pl.icon === ic ? (pl.color || "var(--cyan)") + "20" : "var(--surface2)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── COLOR ── */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 6 }}>TIER COLOR</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => updatePlan(pid, "color", c)} style={{ width: 28, height: 28, borderRadius: "50%", border: pl.color === c ? "3px solid #fff" : "2px solid transparent", background: c, cursor: "pointer", boxShadow: pl.color === c ? "0 0 12px " + c + "80" : "none", transition: "0.2s" }} />
                  ))}
                </div>
              </div>

              {/* ── PRICING ── */}
              {pid !== "free" && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 10 }}>PRICING</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>Monthly ($)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14, fontWeight: 600 }}>$</span>
                        <input type="number" step="0.01" min="0" value={pl.monthlyPrice || ""} onChange={e => updatePlan(pid, "monthlyPrice", parseFloat(e.target.value) || 0)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 28px", color: "var(--green)", fontSize: 16, fontWeight: 700, fontFamily: "'Rajdhani'", outline: "none" }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>Yearly ($)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14, fontWeight: 600 }}>$</span>
                        <input type="number" step="0.01" min="0" value={pl.yearlyPrice || ""} onChange={e => updatePlan(pid, "yearlyPrice", parseFloat(e.target.value) || 0)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 28px", color: "var(--green)", fontSize: 16, fontWeight: 700, fontFamily: "'Rajdhani'", outline: "none" }} />
                      </div>
                      {pl.monthlyPrice > 0 && pl.yearlyPrice > 0 && <div style={{ fontSize: 10, color: "var(--cyan)", marginTop: 4 }}>Saves {Math.round((1 - pl.yearlyPrice / (pl.monthlyPrice * 12)) * 100)}% vs monthly</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>Lifetime ($) <span style={{ color: "var(--text3)", fontStyle: "italic" }}>optional</span></label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14, fontWeight: 600 }}>$</span>
                        <input type="number" step="0.01" min="0" value={pl.lifetimePrice || ""} placeholder="—" onChange={e => updatePlan(pid, "lifetimePrice", parseFloat(e.target.value) || null)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 28px", color: pl.lifetimePrice ? "var(--gold)" : "var(--text3)", fontSize: 16, fontWeight: 700, fontFamily: "'Rajdhani'", outline: "none" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FEATURE LIMITS (numbers) ── */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 10 }}>LIMITS</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {ALL_FEATURES.filter(f => f.type === "number").map(feat => (
                    <div key={feat.key} style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px" }}>
                      <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>{feat.label}</label>
                      <input type="number" min="1" value={pl.limits[feat.key] >= 999 ? 999 : pl.limits[feat.key]} onChange={e => updateLimit(pid, feat.key, parseInt(e.target.value) || 1)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 14, fontWeight: 600, fontFamily: "'Rajdhani'", outline: "none" }} />
                      {pl.limits[feat.key] >= 999 && <div style={{ fontSize: 9, color: "var(--cyan)", marginTop: 2 }}>999 = Unlimited</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── FEATURE TOGGLES (checkboxes) ── */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: 1, fontFamily: "'Rajdhani'", display: "block", marginBottom: 10 }}>FEATURES</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {ALL_FEATURES.filter(f => f.type === "bool").map(feat => {
                    const on = !!pl.limits[feat.key];
                    return (
                      <div key={feat.key} onClick={() => updateLimit(pid, feat.key, !on)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: on ? (pl.color || "var(--cyan)") + "10" : "var(--surface2)", borderRadius: 10, cursor: "pointer", border: on ? "1px solid " + (pl.color || "var(--cyan)") + "30" : "1px solid var(--border)", transition: "0.2s" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: on ? "2px solid " + (pl.color || "var(--cyan)") : "2px solid var(--border)", background: on ? (pl.color || "var(--cyan)") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s", flexShrink: 0 }}>
                          {on && <Icon name="check" size={12} color={pid === "ultimate" ? "#000" : "#fff"} />}
                        </div>
                        <span style={{ fontSize: 12, color: on ? "var(--text)" : "var(--text3)", fontWeight: on ? 600 : 400 }}>{feat.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}

        {/* ── PREVIEW ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 22, marginTop: 8 }}>
          <h3 style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>👁️ Live Preview</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {Object.values(editPlans).map(pl => (
              <div key={pl.id} style={{ background: "var(--surface2)", borderRadius: 14, padding: 16, border: "1px solid " + (pl.color || "var(--border)") + "30" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{pl.icon}</span>
                  <div style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 16, color: pl.color || "var(--text)" }}>{pl.name}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  {pl.id === "free" ? <div style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 24 }}>Free</div> : (
                    <div><span style={{ fontFamily: "'Rajdhani'", fontWeight: 800, fontSize: 24, color: pl.color }}>${pl.monthlyPrice}</span><span style={{ fontSize: 11, color: "var(--text3)" }}>/mo</span>{pl.yearlyPrice > 0 && <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>${pl.yearlyPrice}/yr</span>}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {rebuildFeatureList(pl).slice(0, 6).map((f, i) => <div key={i} style={{ fontSize: 10, color: "var(--text2)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "var(--green)" }}>✓</span>{f}</div>)}
                  {rebuildFeatureList(pl).length > 6 && <div style={{ fontSize: 10, color: "var(--text3)" }}>+{rebuildFeatureList(pl).length - 6} more</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const navItems = [{ id: "dashboard", icon: "home", label: "Dashboard" }, { id: "browse", icon: "search", label: "Browse" }, { id: "wishlist", icon: "heart", label: "Wishlist" }, { id: "alerts", icon: "bell", label: "Alerts" }, { id: "pricing", icon: "crown", label: "Pricing" }, { id: "account", icon: "user", label: "Account" }, { id: "admin", icon: "settings", label: "Admin" }];
  const pages = { dashboard: <DashboardPage />, browse: <BrowsePage />, wishlist: <WishlistPage />, alerts: <AlertsPage />, pricing: <PricingPage />, account: <AccountPage />, admin: <AdminSettingsPage /> };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", fontFamily: "'Barlow', sans-serif" }}>
      <style>{CSS}</style>
      <nav style={{ width: 200, background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "16px 8px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 22 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--grad1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 4px 16px rgba(0,111,255,0.3)" }}>🎮</div><span style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: 14, background: "var(--grad1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PS GAME DEALS RADAR</span><span style={{ fontSize: 8, color: "var(--text3)", fontFamily: "'Rajdhani'", fontWeight: 600, marginLeft: -4 }}>v1.0.0</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>{navItems.map(n => (
          <div key={n.id}>
            {n.id === "admin" && <div style={{ borderTop: "1px solid var(--border)", margin: "8px 10px 6px", paddingTop: 8 }}><div style={{ fontSize: 8, color: "var(--text3)", fontFamily: "'Rajdhani'", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4, paddingLeft: 2 }}>ADMIN</div></div>}
            <button onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: "none", background: page === n.id ? "rgba(0,111,255,0.12)" : "transparent", color: page === n.id ? "var(--cyan)" : "var(--text2)", cursor: "pointer", fontSize: 12, fontWeight: page === n.id ? 600 : 400, fontFamily: "'Barlow'", transition: "0.2s", textAlign: "left", width: "100%" }}>
              <Icon name={n.icon} size={14} color={page === n.id ? "#00d4ff" : "#8892a4"} /> {n.label}
              {n.id === "alerts" && alertedGames.length > 0 && <span style={{ marginLeft: "auto", background: "var(--red)", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{alertedGames.length}</span>}
              {n.id === "pricing" && subscription.plan === "free" && <span style={{ marginLeft: "auto", fontSize: 7, background: "var(--grad-gold)", color: "#000", padding: "2px 5px", borderRadius: 4, fontWeight: 700 }}>NEW</span>}
            </button>
          </div>
        ))}</div>
        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)", marginTop: 6 }}>
          {user ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><div style={{ width: 24, height: 24, borderRadius: 6, background: (plan.color || "#888") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: "1px solid " + (plan.color || "#888") + "40" }}>{plan.icon}</div><div><div style={{ fontSize: 10, fontWeight: 700, color: plan.color, fontFamily: "'Rajdhani'" }}>{(plan.name || "FREE").toUpperCase()}</div><div style={{ fontSize: 8, color: "var(--text3)" }}>{user.email?.split("@")[0]}</div>{psnLinked && <div style={{ fontSize: 8, color: "var(--green)" }}>● {psnUsername}</div>}</div></div>
              {subscription.plan === "free" && <button onClick={() => setPage("pricing")} style={{ width: "100%", padding: 6, borderRadius: 7, border: "none", background: "var(--grad-pro)", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>⚡ Upgrade</button>}
              <button onClick={() => { signOut(); showToast("Signed out"); }} style={{ width: "100%", padding: 6, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>Sign Out</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "none", background: "var(--grad1)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Barlow'" }}>🔑 Sign In / Sign Up</button>
          )}
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 8, color: "var(--text3)", fontFamily: "'Rajdhani'", letterSpacing: 1 }}>PS GAME DEALS RADAR v1.0.0</div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: "22px 26px", overflow: "auto", maxHeight: "100vh" }}>{pages[page]}</main>
      {selectedGame && <GameDetail game={selectedGame} onClose={() => setSelectedGame(null)} />}
      <PaymentModal />
      {notifToast && <div style={{ position: "fixed", bottom: 18, right: 18, background: "var(--surface)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, padding: "10px 16px", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", zIndex: 3000, animation: "fadeIn 0.3s both", backdropFilter: "blur(12px)" }}><span style={{ fontSize: 12 }}>{notifToast}</span></div>}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { refreshProfile(); showToast("Welcome! 🎮"); }} />}
    </div>
  );
}

