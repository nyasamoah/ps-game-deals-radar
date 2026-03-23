"use client";
import { useState, useEffect, useCallback } from "react";

const API = (path) => `${process.env.NEXT_PUBLIC_APP_URL || ""}${path}`;

// ── Fetch games from database (with fallback to empty) ──
export function useGames(filters = {}) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.region) params.set("region", filters.region);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.genre) params.set("genre", filters.genre);
      if (filters.minDiscount) params.set("minDiscount", filters.minDiscount);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.sortBy) params.set("sort", filters.sortBy);

      const res = await fetch(`/api/games?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      const data = await res.json();
      setGames(data.games || []);
    } catch (err) {
      console.error("Error fetching games:", err);
      setGames([]);
    }
    setLoading(false);
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  return { games, loading, refresh: fetchGames };
}

// ── Wishlist operations ──
export function useWishlist(userId) {
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/wishlist?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setWishlist(new Set((data.wishlist || []).map(w => w.game_id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const toggle = async (gameId) => {
    if (!userId) return { error: "Not logged in" };
    const has = wishlist.has(gameId);
    try {
      const res = await fetch("/api/wishlist", {
        method: has ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gameId }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      setWishlist(prev => {
        const next = new Set(prev);
        has ? next.delete(gameId) : next.add(gameId);
        return next;
      });
      return { success: true, added: !has };
    } catch {
      return { error: "Failed to update wishlist" };
    }
  };

  return { wishlist, loading, toggle };
}

// ── Owned games operations ──
export function useOwned(userId) {
  const [owned, setOwned] = useState(new Set());

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/owned?userId=${userId}`)
      .then(r => r.json())
      .then(data => setOwned(new Set((data.owned || []).map(o => o.game_id))))
      .catch(() => {});
  }, [userId]);

  const toggle = async (gameId) => {
    if (!userId) return;
    const has = owned.has(gameId);
    await fetch("/api/owned", {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, gameId }),
    });
    setOwned(prev => { const n = new Set(prev); has ? n.delete(gameId) : n.add(gameId); return n; });
  };

  return { owned, toggle };
}

// ── Alert rules operations ──
export function useAlerts(userId) {
  const [alerts, setAlerts] = useState([]);
  const [globalAlert, setGlobalAlert] = useState({ enabled: true, type: "both", minDiscount: 50, maxPrice: 30 });

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/alerts?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        const rules = data.alerts || [];
        const global = rules.find(r => !r.game_id);
        if (global) setGlobalAlert({ enabled: global.is_enabled, type: global.alert_type, minDiscount: global.min_discount, maxPrice: global.max_price });
        setAlerts(rules.filter(r => r.game_id));
      })
      .catch(() => {});
  }, [userId]);

  const saveAlert = async (gameId, alertData) => {
    if (!userId) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, gameId, ...alertData }),
    });
  };

  const saveGlobal = async (alertData) => {
    if (!userId) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, gameId: null, alertType: alertData.type, minDiscount: alertData.minDiscount, maxPrice: alertData.maxPrice, isEnabled: alertData.enabled }),
    });
    setGlobalAlert(alertData);
  };

  return { alerts, globalAlert, saveAlert, saveGlobal, setGlobalAlert };
}

// ── Profile operations ──
export function useProfile(userId) {
  const updateProfile = async (updates) => {
    if (!userId) return;
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    });
  };

  return { updateProfile };
}

// ── Stripe checkout ──
export function useCheckout() {
  const [loading, setLoading] = useState(false);

  const checkout = async (plan, cycle, userId) => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle, userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Checkout failed");
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  };

  const openPortal = async (userId) => {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return { checkout, openPortal, loading };
}

// ── PSN Link ──
export function usePSN(userId) {
  const link = async (psnUsername) => {
    if (!userId) return { error: "Not logged in" };
    const res = await fetch("/api/psn/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, psnUsername }),
    });
    return await res.json();
  };

  const unlink = async () => {
    if (!userId) return;
    await fetch("/api/psn/link", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  };

  return { link, unlink };
}
