"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) { setError("Passwords don't match"); setLoading(false); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await signUp(email, password);
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        await signIn(email, password);
        onSuccess?.();
        onClose?.();
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div style={{ background: "#0c0c1a", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 24, width: "100%", maxWidth: 420, animation: "fadeIn 0.3s both", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: "28px 28px 0", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #006fff, #00d4ff)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16, boxShadow: "0 4px 20px rgba(0,111,255,0.3)" }}>🎮</div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 24, color: "#e8eaed", marginBottom: 4 }}>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 24 }}>
            {mode === "login" ? "Sign in to track deals and get alerts" : "Join to start tracking PlayStation deals"}
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "0 28px 28px" }}>
          {error && <div style={{ padding: "10px 14px", background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#ff2d55" }}>{error}</div>}
          {success && <div style={{ padding: "10px 14px", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#00e676" }}>{success}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#8892a4", fontWeight: 600, display: "block", marginBottom: 6, letterSpacing: 1, fontFamily: "'Rajdhani', sans-serif" }}>EMAIL</label>
            <input
              type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "#060610", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", color: "#e8eaed", fontSize: 14, outline: "none", fontFamily: "'Barlow', sans-serif", transition: "border-color 0.3s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#8892a4", fontWeight: 600, display: "block", marginBottom: 6, letterSpacing: 1, fontFamily: "'Rajdhani', sans-serif" }}>PASSWORD</label>
            <input
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "#060610", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", color: "#e8eaed", fontSize: 14, outline: "none", fontFamily: "'Barlow', sans-serif", transition: "border-color 0.3s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
            />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#8892a4", fontWeight: 600, display: "block", marginBottom: 6, letterSpacing: 1, fontFamily: "'Rajdhani', sans-serif" }}>CONFIRM PASSWORD</label>
              <input
                type="password" placeholder="••••••••" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", background: "#060610", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", color: "#e8eaed", fontSize: 14, outline: "none", fontFamily: "'Barlow', sans-serif", transition: "border-color 0.3s" }}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
              />
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !email || !password} style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: email && password && !loading ? "pointer" : "default",
            background: email && password && !loading ? "linear-gradient(135deg, #006fff, #00d4ff)" : "#12122a",
            color: email && password && !loading ? "#fff" : "#4a5568",
            fontWeight: 700, fontSize: 14, fontFamily: "'Barlow', sans-serif", transition: "0.3s", marginTop: 6,
          }}>
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <span style={{ fontSize: 13, color: "#8892a4" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }} style={{ background: "none", border: "none", color: "#00d4ff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#4a5568" }}>
            PS Game Deals Radar v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
