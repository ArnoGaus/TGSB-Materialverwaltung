export const kategorien = ["Alle", "Boote", "Skulls", "Riemen", "Ausleger", "Hüllen", "Rollsitze", "Sonstiges"];
export const standorte = ["BRG", "SRV", "Fühlingen", "Extern"];

// Schuhe Zustand als 3-Stufen-Regler
export const SHOE_STATES = ["gut", "ok", "schlecht"];
export const shoeStateToIndex = (v) => {
  const idx = SHOE_STATES.indexOf(String(v || "").toLowerCase());
  return idx >= 0 ? idx : 0;
};
export const shoeIndexToState = (i) => SHOE_STATES[Math.max(0, Math.min(2, Number(i) || 0))];

// Skulls/Riemen: Satz-weit vs pro Element
export const SKULLS_SHARED_KEYS = ["schafttyp", "blattform"];
export const SKULLS_PER_ITEM_KEYS = ["gesamtlaenge_cm", "innenhebel_cm", "defekt"];

export const RIEMEN_SHARED_KEYS = ["schafttyp", "blattform", "griff_verstellbar"];
export const RIEMEN_PER_PAIR_KEYS = ["gesamtlaenge_cm", "innenhebel_cm", "defekt"];

// Kategorie-spezifische Info-Felder (in material_details.values)
export const detailsSchema = {
  Boote: [
    { key: "plaetze", label: "Plätze", type: "number", step: 1, min: 1 },
    { key: "Bootsform", label: "Bootsform", type: "text", placeholder: "z.B. X25" },
    { key: "gewicht_kg", label: "Gewicht", type: "text", placeholder: "z.B. 80-90", unit: "kg" },
    { key: "huelle_vorhanden", label: "Hülle vorhanden", type: "bool" },
    { key: "huelle_notiz", label: "Hülle Notiz", type: "text", placeholder: "z.B. passt zu ... / Zustand ..." },
    { key: "steuermann_verfuegbar", label: "mit Steuerplatz", type: "bool" },
    { key: "aktueller_nutzer", label: "aktueller Nutzer", type: "text", placeholder: "z.B. Max Mustermann" },
    
  ],
  Skulls: [
    { key: "gesamtlaenge_cm", label: "Gesamtlänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "innenhebel_cm", label: "Innenhebellänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "schafttyp", label: "Schafttyp", type: "select", options: ["", "Skinny", "Ultralight", "Sonstiges"] },
    { key: "blattform", label: "Blattform", type: "select", options: ["", "Smoothy2", "Plain", "Comp", "Fat2", "Macon"] },
    { key: "defekt", label: "Defekt", type: "bool" },
  ],
  Riemen: [
    { key: "gesamtlaenge_cm", label: "Gesamtlänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "innenhebel_cm", label: "Innenhebellänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "griff_verstellbar", label: "Griff verstellbar", type: "bool" },
    { key: "schafttyp", label: "Schafttyp", type: "select", options: ["", "Skinny", "Ultralight", "Sonstiges"] },
    { key: "blattform", label: "Blattform", type: "select", options: ["", "Smoothy2", "Plain", "Comp", "Fat2", "Macon"] },
    { key: "defekt", label: "Defekt", type: "bool" },
  ],
  Ausleger: [
    { key: "typ", label: "Ausleger-Typ", type: "select", options: ["", "skull", "riemen"] },
    { key: "dollenabstand_cm", label: "Dollenabstand", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "anlage_deg", label: "Anlage", type: "number", step: 0.1, min: 0, unit: "°" },
  ],
  Hüllen: [{ key: "notiz", label: "Notiz", type: "text", placeholder: "z.B. passt zu ..." }],
  Rollsitze: [{ key: "hochgebaut", label: "Hochgebaut", type: "bool" }],
  Sonstiges: [{ key: "notiz", label: "Notiz", type: "text", placeholder: "Freitext..." }],
};

export function normalizeDetailsForCategory(category, values) {
  const fields = detailsSchema[category] || [];
  const allowed = new Set(fields.map((f) => f.key));
  const out = {};
  for (const [k, v] of Object.entries(values || {})) {
    if (k === "schuhe") continue;
    if (!allowed.has(k)) continue;
    if (v === "" || v === null || v === undefined) continue;
    out[k] = v;
  }

  if (category === "Boote") {
    const p = Number(values?.plaetze ?? 0);
    if (Array.isArray(values?.schuhe) && p > 0) out.schuhe = values.schuhe.slice(0, p);
  }

  return out;
}

export function uid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const BOOT_CAPACITY_BY_STANDORT = {
  BRG: { 1: 2, 2: 2, 4: 2, 8: 2 },
  SRV: { 1: 21, 2: 10, 4: 4, 8: 1 },
  "Fühlingen": { 1: 10, 2: 6, 4: 5, 8: 2 },
  Extern: { 1: 30, 2: 30, 4: 30, 8: 10 },
};

// Normalisiert Standortnamen aus der DB auf deine Keys
export function normalizeStandortKey(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    // optional: falls DB mal "Fuehlingen" liefert
    .replace(/Fuehlingen/i, "Fühlingen");
}

// Kapazität für Standort + Bootsklasse holen
export function getBootCapacity(standortName, seats) {
  const key = normalizeStandortKey(standortName);
  const capObj = BOOT_CAPACITY_BY_STANDORT?.[key];
  if (!capObj) return undefined;
  return capObj?.[Number(seats)];
}