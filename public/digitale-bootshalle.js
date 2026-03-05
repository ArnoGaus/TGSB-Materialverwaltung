// public/digitale-bootshalle.js
// Komplette Datei zum Einfügen (passt zu deiner HTML mit unassignedList/countsList/layoutRoot)

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/** ✅ HIER EINTRAGEN */
const SUPABASE_URL = "https://gzneayfjpvcfpdaqzevr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmVheWZqcHZjZnBkYXF6ZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDUsImV4cCI6MjA4NzE1OTg0NX0.v5NJARFQuotDrgLZZkJ2p228s6LCWTIF-QRmyZIoTbs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** ✅ Standort-IDs müssen exakt zu material.standort passen */
const STANDORTE = [
  { id: "SRV", name: "Siegburg" },
  { id: "FUE", name: "Fühlingen" },
  { id: "BRG", name: "Bonn" },
];

/** ✅ Tabellen */
const T_MATERIAL = "material";
const T_DETAILS = "material_details";
const T_SLOTS = "digitale_bootshalle_slots";

/** Bonn: X Plätze links UND X Plätze rechts */
const BONN_X = 10;

// ---------------- DOM ----------------
const standortSelect = document.getElementById("standortSelect");
const statusText = document.getElementById("statusText");

const unassignedListEl = document.getElementById("unassignedList");
const unassignedEmptyEl = document.getElementById("unassignedEmpty");

const countsListEl = document.getElementById("countsList");
const countsEmptyEl = document.getElementById("countsEmpty");

const layoutRoot = document.getElementById("layoutRoot");

const selectedBox = document.getElementById("selectedBox");
const selectedBoatName = document.getElementById("selectedBoatName");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

// Slot Modal
const slotModalOverlay = document.getElementById("slotModalOverlay");
const slotModalClose = document.getElementById("slotModalClose");
const slotModalClose2 = document.getElementById("slotModalClose2");
const slotModalSlotId = document.getElementById("slotModalSlotId");
const slotSearch = document.getElementById("slotSearch");
const slotResults = document.getElementById("slotResults");

// Error Modal
const errorOverlay = document.getElementById("errorOverlay");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMsg");
const errorCloseBtn = document.getElementById("errorCloseBtn");
const errorOkBtn = document.getElementById("errorOkBtn");

// ---------------- Error Popup ----------------
function showError(message, title = "Fehler") {
  if (!errorOverlay) {
    console.error(title, message);
    return;
  }
  errorTitleEl.textContent = title;
  errorMsgEl.textContent = message;
  errorOverlay.style.display = "flex";
}
function hideError() {
  if (!errorOverlay) return;
  errorOverlay.style.display = "none";
}
errorCloseBtn?.addEventListener("click", hideError);
errorOkBtn?.addEventListener("click", hideError);
errorOverlay?.addEventListener("click", (e) => {
  if (e.target === errorOverlay) hideError();
});

function collectValidSlotIds(layout) {
  const set = new Set();

  for (const row of layout.rows || []) {
    for (const col of row.cols || []) {
      if (Array.isArray(col.sections)) {
        for (const sec of col.sections) {
          for (const s of sec.slots || []) set.add(String(s.slotId));
        }
      } else {
        for (const s of col.slots || []) set.add(String(s.slotId));
      }
    }
  }

  return set;
}

// ---------------- State ----------------
let standort = STANDORTE[0]?.id || "SRV";
let boatsHere = []; // [{id,name,standort,seats}]
let occupancy = {}; // { [slot_id]: boot_id }

let dragBoatId = null;
let selectedBoatId = null;
let longPressTimer = null;
let currentModalSlotId = null;

// ---------------- Layout Config pro Standort ----------------
/**
 * Block-Typen (Regeln):
 * - "halle1" => nur 1er-Boote
 * - "halle2" => nur 2er-Boote
 * - "halle4" => nur 4er-Boote
 * - "bootwagen" => nur 1er-Boote (5 Plätze übereinander)
 * - "frei" => keine Einschränkung
 *
 * split: { left: n, right: n } oder { left: n } oder { right: n }
 * slots: n (ohne split)
 */
const LAYOUTS = {
  SRV: {
    title: "Digitale Bootshalle – Siegburg",
    rows: [
      {
        className: "top",
        blocks: [
          { title: "1er-Halle", type: "halle1", split: { left: 6, right: 6 }, slotPrefix: "srv-h1" },
          { title: "2er-Halle", type: "halle2", split: { left: 6, right: 5 }, slotPrefix: "srv-h2" },
          { title: "4er-Halle", type: "halle4", split: { left: 5, right: 6 }, slotPrefix: "srv-h4" },
        ],
      },
      {
        className: "bottom",
        blocks: [
          { title: "Keller", type: "frei", split: { left: 8, right: 8 }, slotPrefix: "srv-k" },
          { title: "Unter der Halle (unter 4er)", type: "frei", slots: 8, slotPrefix: "srv-u" },
        ],
      },
    ],
  },

  FUE: {
    title: "Digitale Bootshalle – Fühlingen",
    rows: [
      {
        className: "top",
        blocks: [
          { title: "Halle 1", type: "frei", split: { left:0, right: 6 }, slotPrefix: "fue-h1" },
          { title: "Halle 2", type: "frei", split: { left: 6, right: 0 }, slotPrefix: "fue-h2" },
          { title: "Bootswagen 1", type: "bootwagen", slots: 5, slotPrefix: "fue-w1" },
        ],
      },
      {
        className: "top",
        blocks: [
          { title: "Bootswagen 2", type: "bootwagen", slots: 5, slotPrefix: "fue-w2" },
          { title: "Bootswagen 3", type: "bootwagen", slots: 5, slotPrefix: "fue-w3" },
        ],
      },
    ],
  },

  BRG: {
    title: "Digitale Bootshalle – Bonn",
    rows: [
      {
        className: "bottom",
        blocks: [
          { title: "Halle", type: "frei", split: { left: BONN_X, right: BONN_X }, slotPrefix: "brg-h" },
          { title: "Kraftraum (2 Plätze)", type: "frei", slots: 2, slotPrefix: "brg-kr" },
        ],
      },
    ],
  },
};

function requiredSeatsForType(type) {
  if (type === "halle1") return 1;
  if (type === "halle2") return 2;
  if (type === "halle4") return 4;
  if (type === "bootwagen") return 1;
  return null;
}

function buildLayoutForStandort(standortId) {
  const cfg = LAYOUTS[standortId];
  if (!cfg) return { title: `Digitale Bootshalle – ${standortId}`, rows: [], slotRulesByPrefix: [] };

  const slotRulesByPrefix = [];

  const rows = cfg.rows.map((r) => {
    const cols = r.blocks.map((b) => {
      const col = { title: b.title, sections: null, slots: null };

      const required = requiredSeatsForType(b.type);
      const prefixBase = `${b.slotPrefix}-`;
      if (required) slotRulesByPrefix.push({ prefix: prefixBase, requiredSeats: required });

      if (b.split) {
        const sections = [];

        if (Number(b.split.left || 0) > 0) {
          sections.push({
            title: "Links",
            slots: Array.from({ length: b.split.left }).map((_, i) => ({
              slotId: `${prefixBase}L-${i + 1}`,
              label: `L${i + 1}`,
            })),
          });
        }

        if (Number(b.split.right || 0) > 0) {
          sections.push({
            title: "Rechts",
            slots: Array.from({ length: b.split.right }).map((_, i) => ({
              slotId: `${prefixBase}R-${i + 1}`,
              label: `R${i + 1}`,
            })),
          });
        }

        col.sections = sections;
      } else {
        const n = Number(b.slots || 0);
        col.slots = Array.from({ length: n }).map((_, i) => ({
          slotId: `${prefixBase}${i + 1}`,
          label: `${i + 1}`,
        }));
      }

      return col;
    });

    return { className: r.className, cols };
  });

  return { title: cfg.title, rows, slotRulesByPrefix };
}

function layoutForSite() {
  return buildLayoutForStandort(standort);
}

// ---------------- Regeln ----------------
function requiredSeatsForSlot(slotId) {
  const s = String(slotId);
  const { slotRulesByPrefix = [] } = layoutForSite();

  for (const r of slotRulesByPrefix) {
    if (s.startsWith(r.prefix)) return r.requiredSeats;
  }
  return null; // frei
}

function canPlaceBoatInSlot(boat, slotId) {
  const req = requiredSeatsForSlot(slotId);
  if (req === null) return true;

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) return false;
  return seats === req;
}

function rejectReason(boat, slotId) {
  const req = requiredSeatsForSlot(slotId);
  if (req === null) return null;

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) return "Dieses Boot hat keine gültige Sitzplatz-Anzahl und kann hier nicht eingelagert werden.";
  return `Hier passen nur ${req}er-Boote. Dieses Boot hat ${seats} Plätze.`;
}

// ---------------- Helpers ----------------
function boatById(id) {
  const s = String(id);
  return boatsHere.find((b) => String(b.id) === s) || null;
}

function usedBoatIdsSet() {
  return new Set(Object.values(occupancy).map(String));
}

function unassignedBoats() {
  const used = usedBoatIdsSet();
  return boatsHere.filter((b) => !used.has(String(b.id)));
}

function seatBucket(seats) {
  const n = Number(seats);
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 4) return 4;
  if (n === 8) return 8;
  return null;
}

// ---------------- Rendering (safe) ----------------
function safeRenderAll(context = "") {
  try {
    renderAll();
  } catch (e) {
    console.error("Render error", context, e);
    showError(`Darstellung fehlgeschlagen (${context}).\n\n${e?.message || e}`, "Fehler");
  }
}

function assertDom() {
  const missing = [];
  if (!standortSelect) missing.push("standortSelect");
  if (!unassignedListEl) missing.push("unassignedList");
  if (!countsListEl) missing.push("countsList");
  if (!layoutRoot) missing.push("layoutRoot");
  if (missing.length) {
    showError(`Fehlende HTML-IDs: ${missing.join(", ")}`, "Fehler");
    return false;
  }
  return true;
}

// ---------------- Supabase Load ----------------
async function loadData() {
  statusText.textContent = "Lade Daten…";

  // 1) Boote am Standort
  const { data: boats, error: boatsErr } = await supabase
    .from(T_MATERIAL)
    .select("id,name,kategorie,standort")
    .eq("standort", standort)
    .eq("kategorie", "Boote")
    .order("name", { ascending: true });

  if (boatsErr) {
    console.error(boatsErr);
    statusText.textContent = "Fehler beim Laden der Boote (siehe Konsole).";
    boatsHere = [];
    occupancy = {};
    safeRenderAll("loadData boatsErr");
    return;
  }

  const boatRows = boats || [];
  const boatIds = boatRows.map((b) => b.id);

  // 2) Details (values.plaetze)
  const seatsMap = new Map();
  if (boatIds.length) {
    const { data: details, error: detErr } = await supabase
      .from(T_DETAILS)
      .select("material_id,values")
      .in("material_id", boatIds);

    if (detErr) {
      console.error(detErr);
    } else {
      (details || []).forEach((r) => {
        const bid = r.material_id;
        const v = r.values || {};
        const seats = v?.plaetze;
        if (bid && seats !== undefined && seats !== null) seatsMap.set(String(bid), seats);
      });
    }
  }

  boatsHere = boatRows.map((b) => ({
    ...b,
    seats: seatsMap.get(String(b.id)) ?? null,
  }));

  // 3) Belegung
  const { data: slots, error: slotsErr } = await supabase
    .from(T_SLOTS)
    .select("standort,slot_id,boot_id")
    .eq("standort", standort);

  if (slotsErr) {
    console.error(slotsErr);
    statusText.textContent = "Fehler beim Laden der Belegung (siehe Konsole).";
    occupancy = {};
    safeRenderAll("loadData slotsErr");
    return;
  }

  const rawOcc = {};
    (slots || []).forEach((r) => {
    rawOcc[String(r.slot_id)] = String(r.boot_id);
    });

    // ✅ NUR gültige Slots aus dem aktuellen Layout behalten
    const layout = layoutForSite();
    const validSlots = collectValidSlotIds(layout);

    const nextOcc = {};
    let ignored = 0;

    for (const [slotId, bootId] of Object.entries(rawOcc)) {
    if (validSlots.has(slotId)) {
        nextOcc[slotId] = bootId;
    } else {
        ignored++;
    }
    }

occupancy = nextOcc;

// Optional: Hinweis oben
if (ignored > 0) {
  statusText.textContent = `Geladen: ${boatsHere.length} Boote (⚠ ${ignored} alte Zuordnungen ignoriert)`;
} else {
  statusText.textContent = `Geladen: ${boatsHere.length} Boote`;
}

  statusText.textContent = `Geladen: ${boatsHere.length} Boote`;
  safeRenderAll("loadData done");
}

// ---------------- Save / Clear ----------------
async function assignBoatToSlot(bootId, slotId) {
  if (!bootId || !slotId) return false;

  const bId = String(bootId);
  const sId = String(slotId);

  const boat = boatById(bId);
  if (!boat) {
    showError("Boot nicht gefunden (evtl. nicht am Standort geladen).", "Fehler");
    return false;
  }

  // ✅ harte Prüfung vor DB-Write
  if (!canPlaceBoatInSlot(boat, sId)) {
    showError(rejectReason(boat, sId) || "Dieses Boot passt nicht in diesen Slot.", "Passt nicht");
    return false;
  }

  const delRes = await supabase.from(T_SLOTS).delete().eq("standort", standort).eq("boot_id", bId);
  if (delRes.error) {
    console.error(delRes.error);
    showError("Speichern fehlgeschlagen (Delete). Siehe Konsole.", "Fehler");
    return false;
  }

  const upRes = await supabase
    .from(T_SLOTS)
    .upsert({ standort, slot_id: sId, boot_id: bId }, { onConflict: "standort,slot_id" });

  if (upRes.error) {
    console.error(upRes.error);
    showError("Speichern fehlgeschlagen (Upsert). Siehe Konsole.", "Fehler");
    return false;
  }

  for (const [k, v] of Object.entries(occupancy)) {
    if (String(v) === bId) delete occupancy[k];
  }
  occupancy[sId] = bId;

  selectedBoatId = null;
  updateSelectedUI();
  safeRenderAll("assignBoatToSlot");
  return true;
}

async function clearSlot(slotId) {
  const sId = String(slotId);
  const { error } = await supabase.from(T_SLOTS).delete().eq("standort", standort).eq("slot_id", sId);

  if (error) {
    console.error(error);
    showError("Entfernen fehlgeschlagen. Siehe Konsole.", "Fehler");
    return false;
  }

  delete occupancy[sId];
  safeRenderAll("clearSlot");
  return true;
}

// ---------------- Mobile Long-Press ----------------
function onBoatPointerDown(bootId) {
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    selectedBoatId = String(bootId);
    updateSelectedUI();
    safeRenderAll("longPress");
  }, 450);
}
function onBoatPointerUp() {
  clearTimeout(longPressTimer);
}

function updateSelectedUI() {
  if (selectedBoatId) {
    const b = boatById(selectedBoatId);
    selectedBoatName.textContent = b ? `${b.name}` : selectedBoatId;
    selectedBox.style.display = "flex";
  } else {
    selectedBox.style.display = "none";
  }
}

clearSelectionBtn?.addEventListener("click", () => {
  selectedBoatId = null;
  updateSelectedUI();
  safeRenderAll("clearSelection");
});

// ---------------- LEFT Render ----------------
function renderUnassigned() {
  const list = unassignedBoats();
  unassignedListEl.innerHTML = "";
  unassignedEmptyEl.style.display = list.length === 0 ? "block" : "none";

  list.forEach((b) => {
    const chip = document.createElement("div");
    chip.className = `boot-chip ${selectedBoatId === String(b.id) ? "is-selected" : ""}`;
    chip.draggable = true;
    chip.innerHTML = `
      <div style="font-weight:700;">${b.name}</div>
      <div style="font-size:12px; opacity:0.75;">
        ${b.seats ? `${b.seats} Plätze` : "Plätze ?"}
      </div>
    `;

    chip.addEventListener("dragstart", () => (dragBoatId = String(b.id)));
    chip.addEventListener("dragend", () => (dragBoatId = null));

    chip.addEventListener("pointerdown", () => onBoatPointerDown(b.id));
    chip.addEventListener("pointerup", onBoatPointerUp);
    chip.addEventListener("pointercancel", onBoatPointerUp);

    unassignedListEl.appendChild(chip);
  });
}

function renderCounts() {
  const buckets = new Map([
    [1, 0],
    [2, 0],
    [4, 0],
    [8, 0],
    ["unbekannt", 0],
  ]);

  boatsHere.forEach((b) => {
    const bucket = seatBucket(b.seats);
    if (bucket) buckets.set(bucket, buckets.get(bucket) + 1);
    else buckets.set("unbekannt", buckets.get("unbekannt") + 1);
  });

  const total = boatsHere.length;
  countsListEl.innerHTML = "";
  countsEmptyEl.style.display = total === 0 ? "block" : "none";
  if (total === 0) return;

  const order = [1, 2, 4, 8, "unbekannt"];
  order.forEach((k) => {
    const count = buckets.get(k) || 0;
    if (count === 0 && k !== "unbekannt") return;

    const label = k === "unbekannt" ? "Unbekannt (keine Plätze in Details)" : `${k}er-Boote`;
    const row = document.createElement("div");
    row.className = "count-item";
    row.innerHTML = `
      <div style="font-weight:700;">${label}</div>
      <div style="font-weight:900;">${count}</div>
    `;
    countsListEl.appendChild(row);
  });
}

// ---------------- Slot Modal ----------------
function openSlotModal(slotId) {
  currentModalSlotId = String(slotId);
  slotModalSlotId.textContent = currentModalSlotId;
  slotSearch.value = "";
  renderSlotModalResults();
  slotModalOverlay.style.display = "flex";
  setTimeout(() => slotSearch.focus(), 0);
}
function closeSlotModal() {
  slotModalOverlay.style.display = "none";
  currentModalSlotId = null;
}

slotModalClose?.addEventListener("click", closeSlotModal);
slotModalClose2?.addEventListener("click", closeSlotModal);
slotModalOverlay?.addEventListener("click", (e) => {
  if (e.target === slotModalOverlay) closeSlotModal();
});
slotSearch?.addEventListener("input", renderSlotModalResults);

function renderSlotModalResults() {
  const q = slotSearch.value.trim().toLowerCase();

  const list = unassignedBoats()
    .filter((b) => canPlaceBoatInSlot(b, currentModalSlotId))
    .filter((b) => {
      if (!q) return true;
      return String(b.name || "").toLowerCase().includes(q) || String(b.id).toLowerCase().includes(q);
    });

  slotResults.innerHTML = "";

  if (list.length === 0) {
    const div = document.createElement("div");
    div.style.opacity = "0.8";
    div.textContent = "Keine passenden freien Boote am Standort.";
    slotResults.appendChild(div);
    return;
  }

  list.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "admin-btn";
    btn.style.textAlign = "left";
    btn.innerHTML = `${b.name} <span style="opacity:0.75; font-size:12px;">(${b.seats ? `${b.seats} Plätze` : "Plätze ?"})</span>`;
    btn.addEventListener("click", async () => {
      const ok = await assignBoatToSlot(b.id, currentModalSlotId);
      if (ok) closeSlotModal();
    });
    slotResults.appendChild(btn);
  });
}

// ---------------- Slots / Lager ----------------
function buildSlotElement(slotId, label) {
  const sId = String(slotId);
  const bootId = occupancy[sId];
  const boat = bootId ? boatById(bootId) : null;

  const req = requiredSeatsForSlot(sId);
  const selectedBoat = selectedBoatId ? boatById(selectedBoatId) : null;

  const isRestricted = req !== null;
  const isBlocked = selectedBoat && isRestricted && !canPlaceBoatInSlot(selectedBoat, sId);

  const slot = document.createElement("div");
  slot.className = `lager-slot ${boat ? "is-full" : "is-empty"} ${isRestricted ? "is-restricted" : ""} ${isBlocked ? "is-blocked" : ""}`;

  slot.addEventListener("dragover", (e) => e.preventDefault());
  slot.addEventListener("drop", async () => {
    if (!dragBoatId) return;
    await assignBoatToSlot(dragBoatId, sId);
  });

  slot.addEventListener("click", async () => {
    if (selectedBoatId) {
      await assignBoatToSlot(selectedBoatId, sId);
      return;
    }
    openSlotModal(sId);
  });

  const badgeHtml = req ? `<span class="rule-badge">nur ${req}er</span>` : "";

  slot.innerHTML = `
    <div class="lager-slot-head">
      <strong>${label}</strong>
      <div style="display:flex; gap:8px; align-items:center;">
        ${badgeHtml}
      </div>
    </div>
    ${
      boat
        ? `
      <div style="display:grid; gap:8px;">
        <div style="font-weight:700;">${boat.name}</div>
        <div style="font-size:12px; opacity:0.8;">
          ${boat.seats ? `${boat.seats} Plätze` : "Plätze ?"}
        </div>
        <div class="lager-slot-actions">
          <button class="secondary">Ändern</button>
          <button class="delete">Löschen</button>
        </div>
      </div>
    `
        : `<div style="opacity:0.75; font-size:12px; margin-top:4px;">
            ${selectedBoatId ? (isBlocked ? "Nicht passend" : "Antippen zum Einlagern") : "Klick zum Hinzufügen"}
           </div>`
    }
  `;

  if (boat) {
    const btns = slot.querySelectorAll("button");
    const btnChange = btns[0];
    const btnRemove = btns[1];

    btnChange.addEventListener("click", (e) => {
      e.stopPropagation();
      openSlotModal(sId);
    });

    btnRemove.addEventListener("click", async (e) => {
      e.stopPropagation();
      await clearSlot(sId);
    });
  }

  return slot;
}

function renderLayout() {
  const layout = layoutForSite();
  layoutRoot.innerHTML = "";

  const group = document.createElement("div");
  group.className = "lager-group";

  const title = document.createElement("div");
  title.className = "lager-group-title";
  title.textContent = layout.title;
  group.appendChild(title);

  layout.rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = `lager-row ${row.className}`;

    row.cols.forEach((col) => {
      const hall = document.createElement("div");
      hall.className = "halle";

      const head = document.createElement("div");
      head.className = "halle-head";

      const hTitle = document.createElement("div");
      hTitle.className = "halle-title";
      hTitle.textContent = col.title;

      const meta = document.createElement("div");
      meta.className = "halle-meta";
      const count =
        Array.isArray(col.sections)
          ? col.sections.reduce((sum, s) => sum + s.slots.length, 0)
          : (col.slots?.length || 0);
      meta.textContent = `${count} Plätze`;

      head.appendChild(hTitle);
      head.appendChild(meta);
      hall.appendChild(head);

      if (Array.isArray(col.sections)) {
        const grid = document.createElement("div");
        grid.className = "split-grid";

        col.sections.forEach((sec) => {
          const side = document.createElement("div");
          side.className = "split-side";

          const st = document.createElement("div");
          st.className = "split-side-title";
          st.textContent = sec.title;

          const slotsWrap = document.createElement("div");
          slotsWrap.className = "lager-slots";
          sec.slots.forEach((s) => slotsWrap.appendChild(buildSlotElement(s.slotId, s.label)));

          side.appendChild(st);
          side.appendChild(slotsWrap);
          grid.appendChild(side);
        });

        hall.appendChild(grid);
      } else {
        const slotsWrap = document.createElement("div");
        slotsWrap.className = "lager-slots";
        col.slots.forEach((s) => slotsWrap.appendChild(buildSlotElement(s.slotId, s.label)));
        hall.appendChild(slotsWrap);
      }

      rowEl.appendChild(hall);
    });

    group.appendChild(rowEl);
  });

  layoutRoot.appendChild(group);
}

function renderAll() {
  renderUnassigned();
  renderCounts();
  renderLayout();
}

// ---------------- Standort Dropdown ----------------
function initStandorte() {
  standortSelect.innerHTML = "";
  STANDORTE.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    standortSelect.appendChild(opt);
  });
  standortSelect.value = standort;

  standortSelect.addEventListener("change", async (e) => {
    standort = e.target.value;
    selectedBoatId = null;
    updateSelectedUI();
    await loadData();
  });
}

// ---------------- Bootstrapping ----------------
initStandorte();
updateSelectedUI();

if (assertDom()) {
  await loadData();
  safeRenderAll("boot");
}