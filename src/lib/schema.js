export const kategorien = ["Alle", "Boote", "Skulls", "Riemen", "Ausleger", "Hüllen", "Rollsitze", "Sonstiges"];
export const standorte = ["BRG", "SRV", "Fühlingen", "Trainingslager", "Regatta", "Extern"];

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

// Riemen neu: pro Paar beide Seiten in EINEM Item
export const RIEMEN_SHARED_KEYS = ["schafttyp", "blattform", "griff_verstellbar"];
export const RIEMEN_PER_PAIR_KEYS = ["defekt", "unterschiedliche_seiten", "backbord", "steuerbord"];

// Kategorie-spezifische Info-Felder (in material_details.values)
export const detailsSchema = {
  Boote: [
    { key: "plaetze", label: "Plätze", type: "number", step: 1, min: 1 },
    { key: "Bootsform", label: "Bootsform", type: "text", placeholder: "z.B. X25" },  
    { key: "Baujahr", label: "Baujahr", type: "number", step: 1, min: 1800, max: new Date().getFullYear() },
    { key: "Verein", label: "Verein", type: "select", options: ["", "Bonner RG", "Siegburger RV", "Andere"] },
    { key: "gewicht_kg", label: "Gewicht", type: "text", placeholder: "z.B. 80-90", unit: "kg" },
    { key: "huelle_vorhanden", label: "Hülle vorhanden", type: "bool" },
    { key: "huelle_notiz", label: "Hülle Notiz", type: "text", placeholder: "z.B. passt zu ... / Zustand ..." },
    { key: "steuermann_verfuegbar", label: "mit Steuerplatz", type: "bool" },
    { key: "aktueller_nutzer", label: "aktueller Nutzer", type: "text", placeholder: "z.B. Max Mustermann" },
    { key: "defekt", label: "Defekt", type: "bool" },

  ],

  Skulls: [
    { key: "gesamtlaenge_cm", label: "Gesamtlänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "innenhebel_cm", label: "Innenhebellänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "schafttyp", label: "Schafttyp", type: "select", options: ["", "Skinny medflex", "Skinny softflex", "Ultralight", "Sonstiges"] },
    { key: "blattform", label: "Blattform", type: "select", options: ["", "Smoothy2", "Plain", "Comp", "Fat2", "Macon"] },
    { key: "defekt", label: "Defekt", type: "bool" },
  ],

  Riemen: [
    { key: "griff_verstellbar", label: "Griff verstellbar", type: "bool" },
    { key: "schafttyp", label: "Schafttyp", type: "select", options: ["", "Skinny medflex", "Skinny softflex", "Ultralight", "Sonstiges"] },
    { key: "blattform", label: "Blattform", type: "select", options: ["", "Smoothy2", "Plain", "Comp", "Fat2", "Macon"] },
    { key: "defekt", label: "Defekt", type: "bool" },
    { key: "unterschiedliche_seiten", label: "Seiten unterschiedlich", type: "bool" },
    { key: "backbord", label: "Backbord", type: "object" },
    { key: "steuerbord", label: "Steuerbord", type: "object" },
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
  if (category === "Riemen") {
    const out = {};

    for (const [k, v] of Object.entries(values || {})) {
      if (v === "" || v === null || v === undefined) continue;

      if (k === "backbord" || k === "steuerbord") {
        const side = {};
        for (const [sk, sv] of Object.entries(v || {})) {
          if (sv === "" || sv === null || sv === undefined) continue;
          side[sk] = sv;
        }
        if (Object.keys(side).length > 0) out[k] = side;
        continue;
      }

      out[k] = v;
    }

    return out;
  }

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
  SRV: { 1: 25, 2: 11, 4: 4, 8: 1 },
  Fühlingen: { 1: 10, 2: 6, 4: 5, 8: 2 },
  Extern: Infinity,
};

// Normalisiert Standortnamen aus der DB auf deine Keys
export function normalizeStandortKey(s) {
  return String(s || "").trim().replace(/\s+/g, " ").replace(/Fuehlingen/i, "Fühlingen");
}

// Kapazität für Standort + Bootsklasse holen
export function getBootCapacity(standortName, seats) {
  const key = normalizeStandortKey(standortName);
  const capObj = BOOT_CAPACITY_BY_STANDORT?.[key];
  if (!capObj) return undefined;
  return capObj?.[Number(seats)];
}