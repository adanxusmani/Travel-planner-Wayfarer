import { useState } from "react";
import { supabase } from "../supabase";

export default function Auth() {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const fn = mode === "in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, { email, password });
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("Account created. Check your email to confirm, then sign in.");
  }

  return (
    <div className="center">
      <form className="card auth" onSubmit={submit}>
        <h1 className="brand dark">Wayfinder</h1>
        <p className="muted">Tell us where you're going. We'll plan every day of it.</p>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <p className="error">{msg}</p>}
        <button className="primary">{mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
