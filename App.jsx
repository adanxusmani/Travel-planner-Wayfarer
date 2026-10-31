import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { api } from "./api";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import TripBuilder from "./components/TripBuilder";
import ItineraryView from "./components/ItineraryView";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("dashboard"); // dashboard | new | trip
  const [trip, setTrip] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Join a shared trip via ?join=TOKEN
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("join");
    if (session && token) {
      api.join(token)
        .then((t) => { setTrip(t); setView("trip"); setNotice("You joined this trip."); })
        .catch((e) => setNotice(e.message))
        .finally(() => history.replaceState({}, "", "/"));
    }
  }, [session]);

  if (session === undefined) return <div className="center muted">Loading…</div>;
  if (!session) return <Auth />;

  const open = (t) => { setTrip(t); setView("trip"); };

  return (
    <div className="shell">
      <aside className="rail">
        <h1 className="brand">Wayfinder</h1>
        <nav>
          <button className={view === "dashboard" ? "on" : ""} onClick={() => setView("dashboard")}>My trips</button>
          <button className={view === "new" ? "on" : ""} onClick={() => setView("new")}>Plan a trip</button>
        </nav>
        <div className="rail-foot">
          <span className="muted small">{session.user.email}</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}
        {view === "dashboard" && <Dashboard onOpen={open} onNew={() => setView("new")} />}
        {view === "new" && <TripBuilder onGenerated={open} />}
        {view === "trip" && trip && (
          <ItineraryView key={trip.id || "draft"} trip={trip} onSaved={setTrip} onBack={() => setView("dashboard")} />
        )}
      </main>
    </div>
  );
}
