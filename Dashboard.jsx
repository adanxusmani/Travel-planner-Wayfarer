import { useEffect, useState } from "react";
import { api } from "../api";

export default function Dashboard({ onOpen, onNew }) {
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.list().then(setTrips).catch((e) => setError(e.message)); }, []);

  async function remove(t) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    try { await api.remove(t.id); setTrips(trips.filter((x) => x.id !== t.id)); }
    catch (e) { setError(e.message); }
  }

  if (error) return <p className="error">{error}</p>;
  if (!trips) return <p className="muted">Loading your trips…</p>;

  const upcoming = trips.length;
  const spend = trips.reduce((s, t) => s + (t.itinerary?.estimated_total || 0), 0);

  return (
    <>
      <header className="page-head">
        <div><h2>My trips</h2><p className="muted">{upcoming} saved · {Math.round(spend).toLocaleString()} planned spend</p></div>
        <button className="primary" onClick={onNew}>Plan a trip</button>
      </header>
      {trips.length === 0 ? (
        <div className="empty">
          <h3>No trips yet</h3>
          <p className="muted">Enter a destination, dates and budget. Your first itinerary takes seconds.</p>
          <button className="primary" onClick={onNew}>Plan your first trip</button>
        </div>
      ) : (
        <ul className="trip-list">
          {trips.map((t) => (
            <li key={t.id}>
              <button className="trip-row" onClick={() => onOpen(t)}>
                <strong>{t.title}</strong>
                <span className="muted">{t.request.start_date} to {t.request.end_date} · {t.request.group_size} traveler(s) · {t.request.traveler_type}</span>
              </button>
              <span className="amount">{t.request.currency} {Math.round(t.itinerary.estimated_total || 0).toLocaleString()}</span>
              <button className="link danger" onClick={() => remove(t)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
