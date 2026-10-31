import { useState } from "react";
import { api } from "../api";

const TYPES = ["attraction", "food", "stay", "transport", "activity"];
const dayCost = (d) => d.items.reduce((s, i) => s + (Number(i.cost) || 0), 0);

export default function ItineraryView({ trip, onSaved, onBack }) {
  const [it, setIt] = useState(trip.itinerary);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(!trip.id);
  const req = trip.request;
  const cur = req.currency;
  const day = it.days[active];
  const total = it.days.reduce((s, d) => s + dayCost(d), 0);
  const over = total > req.budget;

  function edit(mutator) {
    const next = structuredClone(it);
    mutator(next.days[active]);
    next.days.forEach((d) => (d.day_cost = dayCost(d)));
    next.estimated_total = next.days.reduce((s, d) => s + d.day_cost, 0);
    setIt(next); setDirty(true);
  }

  async function regenerate() {
    const instruction = prompt("What should change on this day? (optional)", "");
    if (instruction === null) return;
    setBusy("regen"); setMsg("");
    try { setIt(await api.regenerateDay(req, it, day.day, instruction)); setDirty(true); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(""); }
  }

  async function save() {
    setBusy("save"); setMsg("");
    try {
      const saved = trip.id
        ? await api.update(trip.id, it, trip.title)
        : await api.save({ title: trip.title, request: req, itinerary: it });
      onSaved(saved); setDirty(false); setMsg("Saved");
    } catch (e) { setMsg(e.message); }
    finally { setBusy(""); }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}/?join=${trip.share_token}`);
    setMsg("Share link copied. Friends who open it will join this trip.");
  }

  return (
    <>
      <header className="page-head">
        <div>
          <button className="link" onClick={onBack}>Back to my trips</button>
          <h2>{trip.title}</h2>
          <p className="muted">{it.summary}</p>
        </div>
        <div className="actions">
          {trip.id && <button onClick={copyLink}>Copy share link</button>}
          <button className="primary" onClick={save} disabled={busy === "save" || !dirty}>{trip.id ? "Save changes" : "Save trip"}</button>
        </div>
      </header>
      {msg && <p className="muted" role="status">{msg}</p>}

      <div className={"budget" + (over ? " over" : "")}>
        <span>Estimated total</span>
        <strong>{cur} {Math.round(total).toLocaleString()}</strong>
        <span>of {cur} {req.budget.toLocaleString()} budget {over ? "· over by " + Math.round(total - req.budget) : ""}</span>
        <div className="bar"><i style={{ width: Math.min(100, (total / req.budget) * 100) + "%" }} /></div>
      </div>

      <div className="tabs" role="tablist">
        {it.days.map((d, i) => (
          <button key={d.day} role="tab" aria-selected={i === active} className={i === active ? "on" : ""} onClick={() => setActive(i)}>
            Day {d.day}<small>{d.date}</small>
          </button>
        ))}
      </div>

      <section className="day">
        <div className="day-head">
          <h3>{day.theme}</h3>
          <div className="actions">
            <span className="amount">{cur} {Math.round(dayCost(day)).toLocaleString()}</span>
            <button onClick={regenerate} disabled={busy === "regen"}>{busy === "regen" ? "Regenerating…" : "Regenerate day"}</button>
          </div>
        </div>
        <ol className="timeline">
          {day.items.map((item, idx) => (
            <li key={idx} className={"t-" + item.type}>
              <input className="time" aria-label="Time" value={item.time} onChange={(e) => edit((d) => (d.items[idx].time = e.target.value))} />
              <div className="body">
                <input className="title" aria-label="Title" value={item.title} onChange={(e) => edit((d) => (d.items[idx].title = e.target.value))} />
                <input className="desc" aria-label="Description" value={item.description} onChange={(e) => edit((d) => (d.items[idx].description = e.target.value))} />
                <span className="muted small">{item.location}</span>
              </div>
              <select aria-label="Type" value={item.type} onChange={(e) => edit((d) => (d.items[idx].type = e.target.value))}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input className="cost" type="number" min="0" aria-label="Cost" value={item.cost} onChange={(e) => edit((d) => (d.items[idx].cost = Number(e.target.value)))} />
              <button className="link danger" onClick={() => edit((d) => d.items.splice(idx, 1))} aria-label="Remove stop">Remove</button>
            </li>
          ))}
        </ol>
        <button onClick={() => edit((d) => d.items.push({ time: "18:00", type: "activity", title: "New stop", description: "", location: req.destination, cost: 0 }))}>Add a stop</button>
      </section>

      {it.tips?.length > 0 && (
        <section className="tips"><h3>Good to know</h3><ul>{it.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></section>
      )}
    </>
  );
}
