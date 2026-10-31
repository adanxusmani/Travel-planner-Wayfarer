import { useState } from "react";
import { api } from "../api";

const INTERESTS = ["food", "sightseeing", "culture", "adventure", "nature", "nightlife", "shopping", "relaxation", "history"];
const today = new Date().toISOString().slice(0, 10);

export default function TripBuilder({ onGenerated }) {
  const [f, setF] = useState({
    destination: "", start_date: today, end_date: today, budget: 500, currency: "USD",
    group_size: 1, traveler_type: "solo", pace: "balanced", stay_level: "comfort", interests: [], notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (i) => set("interests", f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i]);

  function type(t) {
    setF((p) => ({ ...p, traveler_type: t, group_size: t === "solo" ? 1 : t === "couple" ? 2 : Math.max(3, p.group_size) }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const req = { ...f, budget: Number(f.budget), group_size: Number(f.group_size) };
      const itinerary = await api.generate(req);
      onGenerated({ title: `${f.destination} · ${f.start_date}`, request: req, itinerary });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="builder">
      <header className="page-head"><div><h2>Plan a trip</h2><p className="muted">The more you tell us, the less you'll need to edit.</p></div></header>

      <fieldset className="seg">
        <legend>Who's going</legend>
        {["solo", "couple", "group"].map((t) => (
          <button type="button" key={t} className={f.traveler_type === t ? "on" : ""} onClick={() => type(t)}>{t}</button>
        ))}
      </fieldset>

      <div className="grid">
        <label className="wide">Destination<input required value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Jaipur, India" /></label>
        <label>Start date<input type="date" required value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></label>
        <label>End date<input type="date" required min={f.start_date} value={f.end_date} onChange={(e) => set("end_date", e.target.value)} /></label>
        <label>Total budget<input type="number" min="1" required value={f.budget} onChange={(e) => set("budget", e.target.value)} /></label>
        <label>Currency
          <select value={f.currency} onChange={(e) => set("currency", e.target.value)}>
            {["USD", "EUR", "GBP", "INR", "JPY", "AUD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Travelers<input type="number" min="1" max="30" value={f.group_size} onChange={(e) => set("group_size", e.target.value)} /></label>
        <label>Pace
          <select value={f.pace} onChange={(e) => set("pace", e.target.value)}>
            <option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option>
          </select>
        </label>
        <label>Stay
          <select value={f.stay_level} onChange={(e) => set("stay_level", e.target.value)}>
            <option value="budget">Budget</option><option value="comfort">Comfort</option><option value="premium">Premium</option>
          </select>
        </label>
      </div>

      <fieldset className="chips">
        <legend>Interests</legend>
        {INTERESTS.map((i) => (
          <button type="button" key={i} className={f.interests.includes(i) ? "on" : ""} aria-pressed={f.interests.includes(i)} onClick={() => toggle(i)}>{i}</button>
        ))}
      </fieldset>

      <label>Anything else?<textarea rows="3" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Vegetarian, avoid long walks, anniversary dinner…" /></label>

      {error && <p className="error">{error}</p>}
      <button className="primary big" disabled={busy}>{busy ? "Building your itinerary…" : "Generate itinerary"}</button>
    </form>
  );
}
