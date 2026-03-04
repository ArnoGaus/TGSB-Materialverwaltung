import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/** ✅ HIER EINTRAGEN */
const SUPABASE_URL = "https://gzneayfjpvcfpdaqzevr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmVheWZqcHZjZnBkYXF6ZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDUsImV4cCI6MjA4NzE1OTg0NX0.v5NJARFQuotDrgLZZkJ2p228s6LCWTIF-QRmyZIoTbs";
;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** ✅ Standorte so wie in material.standort */
const STANDORTE = [{ id: "SRV", name: "Siegburg (SRV)" }];

/** ✅ Tabellen */
const T_MATERIAL = "material";
const T_DETAILS = "material_details";
const T_SLOTS = "digitale_bootshalle_slots"; // Tabelle für digitale Belegung

/** State */
let standort = STANDORTE[0]?.id || "SRV";
let boatsHere = []; // [{id,name,standort,seats}]
let occupancy = {}; // { [slot_id]: boot_id }

let dragBoatId = null;
let selectedBoatId = null;
let longPressTimer = null;
let currentModalSlotId = null;

/** Elements */
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

// Modal
const slotModalOverlay = document.getElementById("slotModalOverlay");
const slotModalClose = document.getElementById("slotModalClose");
const slotModalClose2 = document.getElementById("slotModalClose2");
const slotModalSlotId = document.getElementById("slotModalSlotId");
const slotSearch = document.getElementById("slotSearch");
const slotResults = document.getElementById("slotResults");

const toastRoot = document.getElementById("toastRoot");

const errorOverlay = document.getElementById("errorOverlay");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMsg");
const errorCloseBtn = document.getElementById("errorCloseBtn");
const errorOkBtn = document.getElementById("errorOkBtn");

function showError(message, title = "Fehler") {
  if (!errorOverlay) return;

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

// Anzeige Fehler-Popup

function toast(message, { title = "Hinweis", variant = "warning", timeout = 3200 } = {}) {
  if (!toastRoot) return;

  const el = document.createElement("div");
  el.className = `toast is-${variant}`;

  el.innerHTML = `
    <div class="toast-title">
      <span>${title}</span>
      <button class="toast-close" aria-label="Schließen">×</button>
    </div>
    <div class="toast-msg">${message}</div>
    <div class="toast-actions">
      <button class="secondary">OK</button>
    </div>
  `;

  const close = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    el.style.transition = "0.14s ease-out";
    setTimeout(() => el.remove(), 140);
  };

  el.querySelector(".toast-close").addEventListener("click", close);
  el.querySelector(".toast-actions button").addEventListener("click", close);

  toastRoot.appendChild(el);

  if (timeout) setTimeout(close, timeout);
}

/** ===== Layout ===== */
function splitCount(n) {
  const left = Math.ceil(n / 2);
  const right = Math.floor(n / 2);
  return { left, right };
}
function makeLR(prefixSlot, prefixLabel, counts) {
  return [
    {
      sectionId: `${prefixSlot}-left`,
      title: "Links",
      slots: Array.from({ length: counts.left }).map((_, i) => ({
        slotId: `${prefixSlot}-left-${i + 1}`,
        label: `${prefixLabel}L-${i + 1}`,
      })),
    },
    {
      sectionId: `${prefixSlot}-right`,
      title: "Rechts",
      slots: Array.from({ length: counts.right }).map((_, i) => ({
        slotId: `${prefixSlot}-right-${i + 1}`,
        label: `${prefixLabel}R-${i + 1}`,
      })),
    },
  ];
}

function buildSiegburgLayout({
  oneHall = 12,
  twoHall = 10,
  fourHall = 10,
  cellarLeft = 8,
  cellarRight = 8,
  underHall = 8,
} = {}) {
  const one = splitCount(oneHall);
  const two = splitCount(twoHall);
  const four = splitCount(fourHall);

  return {
    title: "Digitale Bootshalle – Siegburg",
    rows: [
      {
        rowId: "top",
        className: "top",
        cols: [
          { colId: "halle-1", title: "1er-Halle", sections: makeLR("halle-1", "1H-", one) },
          { colId: "halle-2", title: "2er-Halle", sections: makeLR("halle-2", "2H-", two) },
          { colId: "halle-4", title: "4er-Halle", sections: makeLR("halle-4", "4H-", four) },
        ],
      },
      {
        rowId: "bottom",
        className: "bottom",
        cols: [
          {
            colId: "keller",
            title: "Keller",
            sections: [
              {
                sectionId: "keller-left",
                title: "Links",
                slots: Array.from({ length: cellarLeft }).map((_, i) => ({
                  slotId: `keller-left-${i + 1}`,
                  label: `KL-${i + 1}`,
                })),
              },
              {
                sectionId: "keller-right",
                title: "Rechts",
                slots: Array.from({ length: cellarRight }).map((_, i) => ({
                  slotId: `keller-right-${i + 1}`,
                  label: `KR-${i + 1}`,
                })),
              },
            ],
          },
          {
            colId: "unter-halle",
            title: "Unter der Halle (unter 4er)",
            slots: Array.from({ length: underHall }).map((_, i) => ({
              slotId: `unter-halle-${i + 1}`,
              label: `U-${i + 1}`,
            })),
          },
        ],
      },
    ],
  };
}

function layoutForSite() {
  return buildSiegburgLayout();
}

/** ===== Helpers ===== */
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

function requiredSeatsForSlot(slotId) {
  const s = String(slotId);

  if (s.startsWith("halle-1-")) return 1;
  if (s.startsWith("halle-2-")) return 2;
  if (s.startsWith("halle-4-")) return 4;

  // Keller & Unter der Halle frei
  return null;
}

function canPlaceBoatInSlot(boat, slotId) {
  const req = requiredSeatsForSlot(slotId);
  if (req === null) return true; // frei (Keller, Unter der Halle, usw.)

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) return false; // keine Seats bekannt => nicht in Hallen

  return seats === req;
}

function rejectReason(boat, slotId) {
  const req = requiredSeatsForSlot(slotId);
  if (req === null) return null;

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) return `Dieses Boot hat keine Sitzplätze in den Details und kann nicht in die ${req}er-Halle eingelagert werden.`;

  return `In diese Halle passen nur ${req}er-Boote. Dieses Boot hat ${seats} Plätze.`;
}

/** ===== Load from Supabase ===== */
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
    renderAll();
    return;
  }

  const boatRows = boats || [];
  const boatIds = boatRows.map((b) => b.id);

  // 2) Details holen (material_details.values -> plaetze)
  const seatsMap = new Map(); // bootId -> seats
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
        const seats = v?.plaetze; // ✅ hier ist dein Feld
        if (bid && seats !== undefined && seats !== null) seatsMap.set(String(bid), seats);
      });
    }
  }

  boatsHere = boatRows.map((b) => ({
    ...b,
    seats: seatsMap.get(String(b.id)) ?? null,
  }));

  // 3) Slot-Belegung laden
  const { data: slots, error: slotsErr } = await supabase
    .from(T_SLOTS)
    .select("standort,slot_id,boot_id")
    .eq("standort", standort);

  if (slotsErr) {
    console.error(slotsErr);
    statusText.textContent = "Fehler beim Laden der Belegung (siehe Konsole).";
    occupancy = {};
    renderAll();
    return;
  }

  const nextOcc = {};
  (slots || []).forEach((r) => {
    nextOcc[String(r.slot_id)] = String(r.boot_id);
  });
  occupancy = nextOcc;

  statusText.textContent = `Geladen: ${boatsHere.length} Boote`;
  renderAll();
}

/** ===== Save assignment ===== */
async function assignBoatToSlot(bootId, slotId) {
  if (!bootId || !slotId) return false;

  const bId = String(bootId);
  const sId = String(slotId);

  const boat = boatById(bId);
  if (!boat) {
    showError("Boot nicht gefunden (evtl. nicht am Standort geladen).", "Fehler");
    return false;
  }

  // ✅ HIER: harter Stop, bevor irgendwas gespeichert wird
  if (!canPlaceBoatInSlot(boat, sId)) {
    showError(rejectReason(boat, sId) || "Dieses Boot passt nicht in diesen Slot.", "Passt nicht");
    return false; // ✅ verhindert Speichern sicher
  }

  // Boot vorher entfernen (ein Boot nur einmal pro Standort)
  const delRes = await supabase.from(T_SLOTS).delete().eq("standort", standort).eq("boot_id", bId);
  if (delRes.error) {
    console.error(delRes.error);
    showError("Speichern fehlgeschlagen (Delete). Siehe Konsole.", "Fehler");
    return false;
  }

  // Slot upsert
  const upRes = await supabase
    .from(T_SLOTS)
    .upsert({ standort, slot_id: sId, boot_id: bId }, { onConflict: "standort,slot_id" });

  if (upRes.error) {
    console.error(upRes.error);
    showError("Speichern fehlgeschlagen (Upsert). Siehe Konsole.", "Fehler");
    return false;
  }

  // local mirror
  for (const [k, v] of Object.entries(occupancy)) {
    if (String(v) === bId) delete occupancy[k];
  }
  occupancy[sId] = bId;

  selectedBoatId = null;
  updateSelectedUI();
  renderAll();
  return true;
}

async function clearSlot(slotId) {
  const sId = String(slotId);
  const { error } = await supabase
    .from(T_SLOTS)
    .delete()
    .eq("standort", standort)
    .eq("slot_id", sId);

  if (error) {
    console.error(error);
    alert("Entfernen fehlgeschlagen (siehe Konsole).");
    return;
  }
  delete occupancy[sId];
  renderAll();
}

/** ===== Mobile Long-Press ===== */
function onBoatPointerDown(bootId) {
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    selectedBoatId = String(bootId);
    updateSelectedUI();
    renderAll();
  }, 450);
}
function onBoatPointerUp() {
  clearTimeout(longPressTimer);
}

function updateSelectedUI() {
  if (selectedBoatId) {
    const b = boatById(selectedBoatId);
    selectedBoatName.textContent = b ? `${b.name} (${b.id})` : selectedBoatId;
    selectedBox.style.display = "flex";
  } else {
    selectedBox.style.display = "none";
  }
}

clearSelectionBtn?.addEventListener("click", () => {
  selectedBoatId = null;
  updateSelectedUI();
  renderUnassigned();
});

/** ===== LEFT: Unassigned ===== */
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
        ${b.id} · ${b.seats ? `${b.seats} Plätze` : "Plätze ?"}
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

/** ===== LEFT: Counts by seats (1/2/4/8) ===== */
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

    const label =
      k === "unbekannt" ? "Unbekannt (keine Plätze in Details)" : `${k}er-Boote`;

    const row = document.createElement("div");
    row.className = "count-item";
    row.innerHTML = `
      <div style="font-weight:700;">${label}</div>
      <div style="font-weight:900;">${count}</div>
    `;
    countsListEl.appendChild(row);
  });
}

/** ===== Modal ===== */
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
  // ✅ wenn Slot eine Halle ist, nur passende Boote anzeigen
  .filter((b) => canPlaceBoatInSlot(b, currentModalSlotId))
  // ✅ Suchfilter
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
    btn.innerHTML = `${b.name} <span style="opacity:0.75; font-size:12px;">(${b.id})</span>`;
    btn.addEventListener("click", async () => {
      await assignBoatToSlot(b.id, currentModalSlotId);
      closeSlotModal();
    });
    slotResults.appendChild(btn);
  });
}

/** ===== Slots ===== */
function buildSlotElement(slotId, label) {
  const sId = String(slotId);
  const bootId = occupancy[sId];
  const boat = bootId ? boatById(bootId) : null;

  // Regel-Infos
  const req = requiredSeatsForSlot(sId); // 1/2/4 oder null
  const selectedBoat = selectedBoatId ? boatById(selectedBoatId) : null;

  const isRestricted = req !== null;
  const isBlocked =
    selectedBoat && isRestricted && !canPlaceBoatInSlot(selectedBoat, sId);

  const slot = document.createElement("div");
  slot.className = `lager-slot ${boat ? "is-full" : "is-empty"} ${isRestricted ? "is-restricted" : ""} ${isBlocked ? "is-blocked" : ""}`;

  // Desktop Drag & Drop
  slot.addEventListener("dragover", (e) => e.preventDefault());
  slot.addEventListener("drop", async () => {
    if (!dragBoatId) return;
    await assignBoatToSlot(dragBoatId, sId);
  });

  // Click: Mobile selected => assign; else open modal
  slot.addEventListener("click", async () => {
    if (selectedBoatId) {
      await assignBoatToSlot(selectedBoatId, sId);
      return;
    }
    openSlotModal(sId);
  });

  const badgeHtml = req
    ? `<span class="rule-badge">nur ${req}er</span>`
    : "";

  slot.innerHTML = `
    <div class="lager-slot-head">
      <strong>${label}</strong>
      <div style="display:flex; gap:8px; align-items:center;">
        ${badgeHtml}
        <span style="font-size:12px; opacity:0.75;">${sId}</span>
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

/** Standort init */
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

/** Bootstrapping */
initStandorte();
updateSelectedUI();
await loadData();