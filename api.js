import { supabase } from "./supabase";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function call(path, method = "GET", body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const d = err.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg).join(", ") : res.statusText);
  }
  return res.json();
}

export const api = {
  generate: (req) => call("/api/itinerary/generate", "POST", req),
  regenerateDay: (request, itinerary, day, instruction) =>
    call("/api/itinerary/regenerate-day", "POST", { request, itinerary, day, instruction }),
  list: () => call("/api/trips"),
  save: (trip) => call("/api/trips", "POST", trip),
  update: (id, itinerary, title) => call(`/api/trips/${id}`, "PUT", { itinerary, title }),
  remove: (id) => call(`/api/trips/${id}`, "DELETE"),
  join: (token) => call(`/api/trips/join/${token}`, "POST"),
};
