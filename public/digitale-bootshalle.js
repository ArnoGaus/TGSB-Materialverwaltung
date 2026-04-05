import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://gzneayfjpvcfpdaqzevr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmVheWZqcHZjZnBkYXF6ZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDUsImV4cCI6MjA4NzE1OTg0NX0.v5NJARFQuotDrgLZZkJ2p228s6LCWTIF-QRmyZIoTbs";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL oder Anon Key fehlt.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.MaterialTrackerInactivity?.install?.({
  supabase,
  redirectUrl: "/",
});

console.log("Supabase Client erstellt:", !!supabase);

const STANDORTE = [
  { id: "SRV", name: "Siegburg (SRV)" },
  { id: "Fühlingen", name: "Fühlingen" },
  { id: "BRG", name: "Bonn (BRG)" },
];

const T_MATERIAL = "material";
const T_DETAILS = "material_details";
const T_SLOTS = "digitale_bootshalle_slots";
const T_HISTORY = "material_history";
const BONN_X = 10;

// DOM
const standortSelect = document.getElementById("standortSelect");
const statusText = document.getElementById("statusText");
const rolePill = document.getElementById("rolePill");
const modeNotice = document.getElementById("modeNotice");

const unassignedListEl = document.getElementById("unassignedList");
const unassignedEmptyEl = document.getElementById("unassignedEmpty");
const countsListEl = document.getElementById("countsList");
const countsEmptyEl = document.getElementById("countsEmpty");
const layoutRoot = document.getElementById("layoutRoot");

const selectedBox = document.getElementById("selectedBox");
const selectedBoatName = document.getElementById("selectedBoatName");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

const slotModalOverlay = document.getElementById("slotModalOverlay");
const slotModalClose = document.getElementById("slotModalClose");
const slotModalClose2 = document.getElementById("slotModalClose2");
const slotModalSlotId = document.getElementById("slotModalSlotId");
const slotSearch = document.getElementById("slotSearch");
const slotResults = document.getElementById("slotResults");

let slotCommentInput = document.getElementById("slotCommentInput");
let slotCommentSaveBtn = document.getElementById("slotCommentSaveBtn");
let slotCommentStatus = document.getElementById("slotCommentStatus");

const errorOverlay = document.getElementById("errorOverlay");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMsg");
const errorCloseBtn = document.getElementById("errorCloseBtn");
const errorOkBtn = document.getElementById("errorOkBtn");

// State
let standort = STANDORTE[0]?.id || "SRV";
let boatsHere = [];
let occupancy = {};

let dragBoatId = null;
let selectedBoatId = null;
let longPressTimer = null;
let currentModalSlotId = null;

let currentRole = "visitor";
let canEditBootshalle = false;

function normalizeStandortValue(value) {
  return String(value || "")
    .trim()
    .replace(/Fuehlingen/gi, "Fühlingen");
}

function updateStandortSelectAppearance() {
  if (!standortSelect) {
    return;
  }

  standortSelect.dataset.standort = normalizeStandortValue(standortSelect.value);
}

// -------------------------------------
// Layouts
// -------------------------------------
const LAYOUTS = {
  SRV: {
    title: "Digitale Bootshalle – Siegburg",
    rows: [
      {
        className: "top",
        blocks: [
          {
            title: "1er-Halle",
            slotPrefix: "srv-h1",
            split: { left: 7, right: 7 },
            requiredSeats: 1,
            slotOverrides: { "srv-h1-L-5": "blocked" },
          },
          {
            title: "2er-Halle",
            slotPrefix: "srv-h2",
            split: { left: 6, right: 5 },
            requiredSeats: null,
            slotOverrides: {
              "srv-h2-L-1": 2,
              "srv-h2-L-2": 2,
              "srv-h2-L-3": 2,
              "srv-h2-L-4": "blocked",
              "srv-h2-L-5": "blocked",
              "srv-h2-L-6": 2,
              "srv-h2-R-1": [2, 4],
              "srv-h2-R-2": 4,
              "srv-h2-R-3": "blocked",
              "srv-h2-R-4": "blocked",
              "srv-h2-R-5": "blocked",
            },
          },
          {
            title: "4er-Halle",
            slotPrefix: "srv-h4",
            split: { left: 5, right: 6 },
            requiredSeats: null,
            slotOverrides: {
              "srv-h4-L-1": null,
              "srv-h4-L-2": null,
              "srv-h4-L-3": "blocked",
              "srv-h4-L-4": "blocked",
              "srv-h4-L-5": "blocked",
              "srv-h4-R-1": [2, 4],
              "srv-h4-R-2": 4,
              "srv-h4-R-3": 4,
              "srv-h4-R-4": "blocked",
              "srv-h4-R-5": "blocked",
              "srv-h4-R-6": "blocked",
            },
          },
        ],
      },
      {
        className: "bottom",
        blocks: [
          { title: "Keller", slotPrefix: "srv-k", split: { left: 8, right: 8 } },
          { title: "Unter der Halle (unter 4er)", slotPrefix: "srv-u", slots: 8 },
        ],
      },
    ],
  },

  Fühlingen: {
    title: "Digitale Bootshalle – Fühlingen",
    rows: [
      {
        className: "top",
        blocks: [
          { title: "Halle 1", slotPrefix: "fue-h1", split: { right: 12 } },
          { title: "Halle 2", slotPrefix: "fue-h2", split: { left: 12 } },
          { title: "Bootswagen 1", slotPrefix: "fue-w1", slots: 5, requiredSeats: 1 },
        ],
      },
      {
        className: "top",
        blocks: [
          { title: "Bootswagen 2", slotPrefix: "fue-w2", slots: 5, requiredSeats: 1 },
          { title: "Bootswagen 3", slotPrefix: "fue-w3", slots: 5, requiredSeats: 1 },
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
          { title: "Halle", slotPrefix: "bn-h", split: { left: BONN_X, right: BONN_X } },
          {
            title: "Kraftraum (2 Plätze)",
            slotPrefix: "bn-kr",
            slots: 2,
            slotOverrides: { "bn-kr-1": "blocked", "bn-kr-2": "blocked" },
          },
        ],
      },
    ],
  },
};

// -------------------------------------
// Helpers
// -------------------------------------
function normalizeRole(rawRole) {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "user") return "user";
  return "visitor";
}

function stringifyHistoryValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("getCurrentUserId Fehler:", error);
    return null;
  }
  return data?.user?.id ?? null;
}

async function insertHistoryRows(rows) {
  if (!rows || rows.length === 0) return true;

  const cleanRows = rows.map((row) => ({
    material_id: row.material_id ?? null,
    alter_standort: row.alter_standort ?? null,
    neuer_standort: row.neuer_standort ?? null,
    geändert_von: row.geändert_von ?? null,
    geändert_am: row.geändert_am ?? new Date().toISOString(),
    field_key: row.field_key ?? null,
    old_value: row.old_value ?? "",
    new_value: row.new_value ?? "",
    action_type: row.action_type ?? "standort",
  }));

  const { error } = await supabase.from(T_HISTORY).insert(cleanRows);
  if (error) {
    console.error("History insert Fehler:", error, cleanRows);
    showError(`Verlauf konnte nicht gespeichert werden:\n${error.message || error}`, "History-Fehler");
    return false;
  }
  return true;
}

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

function buildLayoutForStandort(standortId) {
  const cfg = LAYOUTS[standortId];
  if (!cfg) return { title: `Digitale Bootshalle – ${standortId}`, rows: [], slotSeatRules: {} };

  const slotSeatRules = {};

  const rows = cfg.rows.map((r) => {
    const cols = r.blocks.map((b) => {
      const col = { title: b.title, sections: null, slots: null };
      const prefixBase = `${b.slotPrefix}-`;

      if (b.split) {
        const sections = [];

        if (Number(b.split.left || 0) > 0) {
          const leftRequired = b.split.leftRequiredSeats ?? b.requiredSeats ?? null;
          const leftSlots = Array.from({ length: b.split.left }).map((_, i) => {
            const slotId = `${prefixBase}L-${i + 1}`;
            slotSeatRules[slotId] = b.slotOverrides?.[slotId] ?? leftRequired;
            return { slotId, label: `L${i + 1}` };
          });
          sections.push({ title: "Links", slots: leftSlots });
        }

        if (Number(b.split.right || 0) > 0) {
          const rightRequired = b.split.rightRequiredSeats ?? b.requiredSeats ?? null;
          const rightSlots = Array.from({ length: b.split.right }).map((_, i) => {
            const slotId = `${prefixBase}R-${i + 1}`;
            slotSeatRules[slotId] = b.slotOverrides?.[slotId] ?? rightRequired;
            return { slotId, label: `R${i + 1}` };
          });
          sections.push({ title: "Rechts", slots: rightSlots });
        }

        col.sections = sections;
      } else {
        const n = Number(b.slots || 0);
        const required = b.requiredSeats ?? null;
        col.slots = Array.from({ length: n }).map((_, i) => {
          const slotId = `${prefixBase}${i + 1}`;
          slotSeatRules[slotId] = b.slotOverrides?.[slotId] ?? required;
          return { slotId, label: `${i + 1}` };
        });
      }

      return col;
    });

    return { className: r.className, cols };
  });

  return { title: cfg.title, rows, slotSeatRules };
}

function currentLayout() {
  return buildLayoutForStandort(standort);
}

function slotRuleForSlot(slotId) {
  const layout = currentLayout();
  const rule = layout.slotSeatRules?.[String(slotId)];
  return rule === undefined ? null : rule;
}

function slotRuleBadge(rule) {
  if (rule === null) return "";
  if (rule === "blocked") return `<span class="rule-badge">gesperrt</span>`;
  if (typeof rule === "number") return `<span class="rule-badge">nur ${rule}er</span>`;
  if (Array.isArray(rule)) return `<span class="rule-badge">nur ${rule.join("/")}</span>`;
  return "";
}

function canPlaceBoatInSlot(boat, slotId) {
  const rule = slotRuleForSlot(slotId);
  if (rule === null) return true;
  if (rule === "blocked") return false;

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) return false;
  if (typeof rule === "number") return seats === rule;
  if (Array.isArray(rule)) return rule.includes(seats);
  return true;
}

function rejectReason(boat, slotId) {
  const rule = slotRuleForSlot(slotId);
  if (rule === null) return null;
  if (rule === "blocked") return "Dieser Platz ist gesperrt. Hier kann kein Boot eingelagert werden.";

  const seats = Number(boat?.seats);
  if (!Number.isFinite(seats)) {
    return "Dieses Boot hat keine gültige Sitzplatz-Anzahl und kann hier nicht eingelagert werden.";
  }
  if (typeof rule === "number") {
    return `Hier passen nur ${rule}er-Boote. Dieses Boot hat ${seats} Plätze.`;
  }
  if (Array.isArray(rule)) {
    return `Hier passen nur ${rule.join("er / ")}er-Boote. Dieses Boot hat ${seats} Plätze.`;
  }
  return "Dieses Boot passt nicht in diesen Platz.";
}

function boatById(id) {
  return boatsHere.find((b) => String(b.id) === String(id)) || null;
}

function getSlotEntry(slotId) {
  return occupancy[String(slotId)] || { boot_id: null, kommentar: "" };
}

function getSlotBoatId(slotId) {
  return getSlotEntry(slotId).boot_id ? String(getSlotEntry(slotId).boot_id) : null;
}

function getSlotComment(slotId) {
  return String(getSlotEntry(slotId).kommentar || "");
}

function findCurrentSlotOfBoat(bootId) {
  const bId = String(bootId);
  for (const [slotId, entry] of Object.entries(occupancy || {})) {
    if (String(entry?.boot_id || "") === bId) return slotId;
  }
  return null;
}

function usedBoatIdsSet() {
  return new Set(
    Object.values(occupancy)
      .map((entry) => entry?.boot_id)
      .filter(Boolean)
      .map(String)
  );
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

function safeRenderAll(context = "") {
  try {
    renderAll();
  } catch (e) {
    console.error("Render error", context, e);
    showError(`Darstellung fehlgeschlagen (${context}).\n\n${e?.message || e}`, "Fehler");
  }
}

function assertDom() {
  const required = {
    standortSelect,
    statusText,
    unassignedListEl,
    unassignedEmptyEl,
    countsListEl,
    countsEmptyEl,
    layoutRoot,
    selectedBox,
    selectedBoatName,
    slotModalOverlay,
    slotModalSlotId,
    slotSearch,
    slotResults,
  };

  const missing = Object.entries(required)
    .filter(([, el]) => !el)
    .map(([name]) => name);

  if (missing.length) {
    showError(`Fehlende HTML-IDs: ${missing.join(", ")}`, "Fehler");
    return false;
  }
  return true;
}

// -------------------------------------
// Rechte
// -------------------------------------
async function loadCurrentRole() {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const user = userData?.user || null;
    if (!user) {
      currentRole = "visitor";
      canEditBootshalle = false;
      updateRoleUI();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) console.warn("Profil konnte nicht geladen werden:", profileError);

    currentRole = normalizeRole(profile?.role);
    canEditBootshalle = currentRole === "user" || currentRole === "admin";
    updateRoleUI();
  } catch (err) {
    console.error(err);
    currentRole = "visitor";
    canEditBootshalle = false;
    updateRoleUI();
  }
}

function updateRoleUI() {
  if (rolePill) {
    rolePill.textContent = `Rolle: ${currentRole}`;
  }

  if (modeNotice) {
    modeNotice.textContent = canEditBootshalle
      ? "User und Admin können die digitale Bootshalle bearbeiten."
      : "Visitor-Modus: digitale Bootshalle nur lesbar.";
  }

  if (!canEditBootshalle) {
    selectedBoatId = null;
    updateSelectedUI();
  }
}

// -------------------------------------
// Laden
// -------------------------------------
async function loadData() {
  statusText.textContent = "Lade Daten…";

  const { data: boats, error: boatsErr } = await supabase
    .from(T_MATERIAL)
    .select("id,name,kategorie,standort")
    .eq("standort", standort)
    .eq("kategorie", "Boote")
    .order("name", { ascending: true });

  if (boatsErr) {
    console.error(boatsErr);
    statusText.textContent = "Fehler beim Laden der Boote.";
    boatsHere = [];
    occupancy = {};
    safeRenderAll("loadData boatsErr");
    return;
  }

  const boatRows = boats || [];
  const boatIds = boatRows.map((b) => b.id);
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
        const seats = r.values?.plaetze;
        if (bid && seats !== undefined && seats !== null) {
          seatsMap.set(String(bid), seats);
        }
      });
    }
  }

  boatsHere = boatRows.map((b) => ({
    ...b,
    seats: seatsMap.get(String(b.id)) ?? null,
  }));

  const { data: slots, error: slotsErr } = await supabase
    .from(T_SLOTS)
    .select("standort,slot_id,boot_id,kommentar")
    .eq("standort", standort);

  if (slotsErr) {
    console.error(slotsErr);
    statusText.textContent = "Fehler beim Laden der Belegung.";
    occupancy = {};
    safeRenderAll("loadData slotsErr");
    return;
  }

  const layout = currentLayout();
  const validSlots = collectValidSlotIds(layout);
  const nextOcc = {};
  let ignored = 0;

  (slots || []).forEach((r) => {
    const sid = String(r.slot_id);
    if (!validSlots.has(sid)) {
      ignored += 1;
      return;
    }

    nextOcc[sid] = {
      boot_id: r.boot_id ? String(r.boot_id) : null,
      kommentar: r.kommentar || "",
    };
  });

  occupancy = nextOcc;

  statusText.textContent =
    ignored > 0
      ? `Geladen: ${boatsHere.length} Boote (⚠ ${ignored} alte Zuordnungen ignoriert)`
      : `Geladen: ${boatsHere.length} Boote`;

  safeRenderAll("loadData done");
}

// -------------------------------------
// Persistenz
// -------------------------------------
async function saveSlotRow(slotId, bootId, kommentar = "") {
  if (!canEditBootshalle) {
    showError("Visitor können in der digitalen Bootshalle nichts ändern.", "Nur Ansicht");
    return false;
  }

  const payload = {
    standort,
    slot_id: String(slotId),
    boot_id: bootId ? String(bootId) : null,
    kommentar: String(kommentar || "").trim(),
  };

  const { error } = await supabase
    .from(T_SLOTS)
    .upsert(payload, { onConflict: "standort,slot_id" });

  if (error) {
    console.error("Supabase saveSlotRow error:", error);
    showError(`Speichern fehlgeschlagen:\n${error.message || error}`, "Fehler");
    return false;
  }

  occupancy[String(slotId)] = {
    boot_id: payload.boot_id,
    kommentar: payload.kommentar,
  };

  return true;
}

async function assignBoatToSlot(bootId, slotId) {
  if (!canEditBootshalle) {
    showError("Visitor können in der digitalen Bootshalle nichts ändern.", "Nur Ansicht");
    return false;
  }

  if (!bootId || !slotId) return false;

  const bId = String(bootId);
  const sId = String(slotId);
  const boat = boatById(bId);

  if (!boat) {
    showError("Boot nicht gefunden.", "Fehler");
    return false;
  }

  if (!canPlaceBoatInSlot(boat, sId)) {
    showError(rejectReason(boat, sId) || "Dieses Boot passt nicht in diesen Slot.", "Passt nicht");
    return false;
  }

  const userId = await getCurrentUserId();
  const oldSlotId = findCurrentSlotOfBoat(bId);
  const oldCommentAtTarget = getSlotComment(sId);
  const currentTargetBoatId = getSlotBoatId(sId);

  if (currentTargetBoatId && currentTargetBoatId !== bId) {
    showError("Dieser Slot ist bereits belegt. Entferne zuerst das aktuelle Boot.", "Slot belegt");
    return false;
  }

  const delRes = await supabase
    .from(T_SLOTS)
    .delete()
    .eq("standort", standort)
    .eq("boot_id", bId);

  if (delRes.error) {
    console.error(delRes.error);
    showError("Speichern fehlgeschlagen (altes Slot-Mapping löschen).", "Fehler");
    return false;
  }

  const ok = await saveSlotRow(sId, bId, oldCommentAtTarget);
  if (!ok) return false;

  for (const [k, v] of Object.entries(occupancy)) {
    if (String(v?.boot_id || "") === bId && k !== sId) {
      delete occupancy[k];
    }
  }

  occupancy[sId] = {
    boot_id: bId,
    kommentar: oldCommentAtTarget,
  };

  const slotActionType =
    !oldSlotId
      ? "bootshalle_assign"
      : oldSlotId !== sId
        ? "bootshalle_move"
        : null;

  if (slotActionType) {
    const historyOk = await insertHistoryRows([
      {
        material_id: bId,
        alter_standort: boat?.standort || standort,
        neuer_standort: boat?.standort || standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
        field_key: "bootshalle_slot",
        old_value: stringifyHistoryValue(oldSlotId || ""),
        new_value: stringifyHistoryValue(sId),
        action_type: slotActionType,
      },
    ]);

    if (!historyOk) {
      console.warn("Bootshallen-Slot-History konnte nicht gespeichert werden.");
    }
  }

  selectedBoatId = null;
  updateSelectedUI();
  safeRenderAll("assignBoatToSlot");
  renderSlotModalResults();
  return true;
}

async function saveSlotComment(slotId, kommentar) {
  if (!canEditBootshalle) {
    showError("Visitor können in der digitalen Bootshalle nichts ändern.", "Nur Ansicht");
    return false;
  }

  const sId = String(slotId);
  const currentBoatId = getSlotBoatId(sId);
  const oldComment = getSlotComment(sId);
  const newComment = String(kommentar || "").trim();

  const ok = await saveSlotRow(sId, currentBoatId, newComment);
  if (!ok) return false;

  if (currentBoatId && oldComment !== newComment) {
    const userId = await getCurrentUserId();
    const boat = boatById(currentBoatId);

    await insertHistoryRows([
      {
        material_id: currentBoatId,
        alter_standort: boat?.standort || standort,
        neuer_standort: boat?.standort || standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
        field_key: "bootshalle_kommentar",
        old_value: stringifyHistoryValue(oldComment),
        new_value: stringifyHistoryValue(newComment),
        action_type: "bootshalle_comment",
      },
    ]);
  }

  if (slotCommentStatus) {
    slotCommentStatus.textContent = "Kommentar gespeichert.";
    setTimeout(() => {
      if (slotCommentStatus) slotCommentStatus.textContent = "";
    }, 1800);
  }

  safeRenderAll("saveSlotComment");
  return true;
}

async function clearSlot(slotId) {
  if (!canEditBootshalle) {
    showError("Visitor können in der digitalen Bootshalle nichts ändern.", "Nur Ansicht");
    return false;
  }

  const sId = String(slotId);
  const currentBoatId = getSlotBoatId(sId);
  const currentComment = getSlotComment(sId);

  const { error } = await supabase
    .from(T_SLOTS)
    .delete()
    .eq("standort", standort)
    .eq("slot_id", sId);

  if (error) {
    console.error(error);
    showError("Entfernen fehlgeschlagen.", "Fehler");
    return false;
  }

  delete occupancy[sId];

  if (currentBoatId) {
    const userId = await getCurrentUserId();
    const boat = boatById(currentBoatId);

    const historyRows = [
      {
        material_id: currentBoatId,
        alter_standort: boat?.standort || standort,
        neuer_standort: boat?.standort || standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
        field_key: "bootshalle_slot",
        old_value: stringifyHistoryValue(sId),
        new_value: "",
        action_type: "bootshalle_remove",
      },
      {
        material_id: currentBoatId,
        alter_standort: boat?.standort || standort,
        neuer_standort: boat?.standort || standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
        field_key: "bootshalle_kommentar",
        old_value: stringifyHistoryValue(currentComment),
        new_value: "",
        action_type: "bootshalle_comment",
      },
    ].filter((row) => row.old_value !== row.new_value);

    await insertHistoryRows(historyRows);
  }

  safeRenderAll("clearSlot");
  renderSlotModalResults();
  return true;
}

// -------------------------------------
// UI Actions
// -------------------------------------
function onBoatPointerDown(bootId) {
  if (!canEditBootshalle) return;
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
  if (!canEditBootshalle) {
    selectedBox.style.display = "none";
    return;
  }

  if (selectedBoatId) {
    const b = boatById(selectedBoatId);
    selectedBoatName.textContent = b ? b.name : selectedBoatId;
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

// -------------------------------------
// Render
// -------------------------------------
function renderUnassigned() {
  const list = unassignedBoats();
  unassignedListEl.innerHTML = "";
  unassignedEmptyEl.style.display = list.length === 0 ? "block" : "none";

  list.forEach((b) => {
    const chip = document.createElement("div");
    chip.className = `boot-chip ${selectedBoatId === String(b.id) ? "is-selected" : ""} ${
      !canEditBootshalle ? "is-readonly" : ""
    }`;
    chip.draggable = canEditBootshalle;
    chip.innerHTML = `
      <div style="font-weight:700;">${b.name}</div>
      <div style="font-size:12px; opacity:0.75;">${b.seats ? `${b.seats} Plätze` : "Plätze ?"}</div>
    `;

    if (canEditBootshalle) {
      chip.addEventListener("dragstart", () => {
        dragBoatId = String(b.id);
      });

      chip.addEventListener("dragend", () => {
        dragBoatId = null;
      });

      chip.addEventListener("pointerdown", () => onBoatPointerDown(b.id));
      chip.addEventListener("pointerup", onBoatPointerUp);
      chip.addEventListener("pointercancel", onBoatPointerUp);
    }

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

  [1, 2, 4, 8, "unbekannt"].forEach((k) => {
    const count = buckets.get(k) || 0;
    if (count === 0 && k !== "unbekannt") return;

    const label =
      k === "unbekannt" ? "Unbekannt (keine Plätze in Details)" : `${k}er-Boote`;

    const row = document.createElement("div");
    row.className = "count-item";
    row.innerHTML = `<div style="font-weight:700;">${label}</div><div style="font-weight:900;">${count}</div>`;
    countsListEl.appendChild(row);
  });
}

function openSlotModal(slotId) {
  currentModalSlotId = String(slotId);
  slotModalSlotId.textContent = currentModalSlotId;
  slotSearch.value = "";

  if (slotCommentInput) {
    slotCommentInput.value = getSlotComment(currentModalSlotId);
    slotCommentInput.disabled = !canEditBootshalle;
  }
  if (slotCommentSaveBtn) {
    slotCommentSaveBtn.disabled = !canEditBootshalle;
  }
  if (slotCommentStatus) {
    slotCommentStatus.textContent = "";
  }

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
  if (!currentModalSlotId) return;

  const q = slotSearch.value.trim().toLowerCase();
  const currentBoatId = getSlotBoatId(currentModalSlotId);
  const currentBoat = currentBoatId ? boatById(currentBoatId) : null;
  slotResults.innerHTML = "";

  if (currentBoat) {
    const currentInfo = document.createElement("div");
    currentInfo.style.padding = "10px";
    currentInfo.style.border = "1px solid #ddd";
    currentInfo.style.borderRadius = "10px";
    currentInfo.style.marginBottom = "12px";
    currentInfo.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">Aktuell eingelagert</div>
      <div>${currentBoat.name}</div>
      <div style="font-size:12px; opacity:0.75;">${currentBoat.seats ? `${currentBoat.seats} Plätze` : "Plätze ?"}</div>
    `;
    slotResults.appendChild(currentInfo);

    if (canEditBootshalle) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "admin-btn";
      removeBtn.textContent = "Boot aus diesem Slot entfernen";
      removeBtn.addEventListener("click", async () => {
        await clearSlot(currentModalSlotId);
        if (slotCommentInput) slotCommentInput.value = "";
        renderSlotModalResults();
      });
      slotResults.appendChild(removeBtn);
    }
  }

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.margin = "14px 0 8px";
  title.textContent = canEditBootshalle ? "Passende freie Boote" : "Freie passende Boote";
  slotResults.appendChild(title);

  const list = unassignedBoats()
    .filter((b) => canPlaceBoatInSlot(b, currentModalSlotId))
    .filter(
      (b) =>
        !q ||
        String(b.name || "").toLowerCase().includes(q) ||
        String(b.id || "").toLowerCase().includes(q)
    );

  if (list.length === 0) {
    const div = document.createElement("div");
    div.style.opacity = "0.8";
    div.style.marginTop = "6px";
    div.textContent = "Keine passenden freien Boote am Standort.";
    slotResults.appendChild(div);
    return;
  }

  list.forEach((b) => {
    if (!canEditBootshalle) {
      const row = document.createElement("div");
      row.style.padding = "10px";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "10px";
      row.innerHTML = `${b.name} <span style="opacity:0.75; font-size:12px;">(${
        b.seats ? `${b.seats} Plätze` : "Plätze ?"
      })</span>`;
      slotResults.appendChild(row);
      return;
    }

    const btn = document.createElement("button");
    btn.className = "admin-btn";
    btn.style.textAlign = "left";
    btn.innerHTML = `${b.name} <span style="opacity:0.75; font-size:12px;">(${
      b.seats ? `${b.seats} Plätze` : "Plätze ?"
    })</span>`;
    btn.addEventListener("click", async () => {
      const ok = await assignBoatToSlot(b.id, currentModalSlotId);
      if (ok) renderSlotModalResults();
    });
    slotResults.appendChild(btn);
  });
}

function buildSlotElement(slotId, label) {
  const sId = String(slotId);
  const bootId = getSlotBoatId(sId);
  const boat = bootId ? boatById(bootId) : null;
  const comment = getSlotComment(sId);

  const rule = slotRuleForSlot(sId);
  const selectedBoat = selectedBoatId ? boatById(selectedBoatId) : null;
  const isRestricted = rule !== null;
  const isBlockedForSelection =
    selectedBoat && isRestricted && !canPlaceBoatInSlot(selectedBoat, sId);

  const slot = document.createElement("div");
  slot.className = `lager-slot ${boat ? "is-full" : "is-empty"} ${
    isRestricted ? "is-restricted" : ""
  } ${isBlockedForSelection ? "is-blocked" : ""} ${!canEditBootshalle ? "is-readonly" : ""}`;

  if (canEditBootshalle) {
    slot.addEventListener("dragover", (e) => e.preventDefault());
    slot.addEventListener("drop", async () => {
      if (!dragBoatId) return;
      await assignBoatToSlot(dragBoatId, sId);
    });
  }

  slot.addEventListener("click", async () => {
    if (selectedBoatId && canEditBootshalle) {
      await assignBoatToSlot(selectedBoatId, sId);
      return;
    }
    openSlotModal(sId);
  });

  const commentBox = comment
    ? `<div style="font-size:12px; padding:8px; border-radius:8px; background:#f5f5f5; color:#111827;"><strong>Kommentar:</strong> ${comment}</div>`
    : "";

  slot.innerHTML = `
    <div class="lager-slot-head">
      <strong>${label}</strong>
      <div style="display:flex; gap:8px; align-items:center;">
        ${slotRuleBadge(rule)}
      </div>
    </div>

    ${
      boat
        ? `
          <div style="display:grid; gap:8px;">
            <div style="font-weight:700;">${boat.name}</div>
            <div style="font-size:12px; opacity:0.8;">${
              boat.seats ? `${boat.seats} Plätze` : "Plätze ?"
            }</div>
            ${commentBox}
            ${
              canEditBootshalle
                ? `
              <div class="lager-slot-actions">
                <button class="secondary">Ändern</button>
                <button class="delete">Löschen</button>
              </div>
            `
                : ""
            }
          </div>
        `
        : `
          <div style="display:grid; gap:8px;">
            <div style="opacity:0.75; font-size:12px; margin-top:4px;">
              ${
                canEditBootshalle
                  ? selectedBoatId
                    ? isBlockedForSelection
                      ? "Nicht passend"
                      : "Antippen zum Einlagern"
                    : "Klick zum Hinzufügen"
                  : "Klick für Details"
              }
            </div>
            ${commentBox}
          </div>
        `
    }
  `;

  if (boat && canEditBootshalle) {
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
  const layout = currentLayout();
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
      const count = Array.isArray(col.sections)
        ? col.sections.reduce((sum, s) => sum + s.slots.length, 0)
        : col.slots?.length || 0;
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

// -------------------------------------
// Kommentar-UI
// -------------------------------------
function ensureCommentUI() {
  if (!slotModalOverlay) return;
  if (slotCommentInput && slotCommentSaveBtn && slotCommentStatus) return;

  const modalContent =
    slotModalOverlay.querySelector(".modal-content") ||
    slotModalOverlay.firstElementChild ||
    slotModalOverlay;

  const wrapper = document.createElement("div");
  wrapper.style.display = "grid";
  wrapper.style.gap = "8px";
  wrapper.style.margin = "14px 0";
  wrapper.innerHTML = `
    <div style="font-weight:700;">Kommentar zum Slot</div>
    <textarea
      id="slotCommentInput"
      rows="3"
      placeholder="Optionaler Kommentar, z. B. Defekt, reserviert, Zubehör im Boot ..."
      style="width:100%; resize:vertical; padding:10px; border-radius:10px; border:1px solid #ccc; font:inherit;"
    ></textarea>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button id="slotCommentSaveBtn" class="admin-btn" type="button">Kommentar speichern</button>
      <div id="slotCommentStatus" style="font-size:12px; opacity:0.75;"></div>
    </div>
  `;

  const resultsParent = slotResults?.parentElement;
  if (resultsParent) resultsParent.insertBefore(wrapper, slotResults);
  else modalContent.appendChild(wrapper);

  slotCommentInput = document.getElementById("slotCommentInput");
  slotCommentSaveBtn = document.getElementById("slotCommentSaveBtn");
  slotCommentStatus = document.getElementById("slotCommentStatus");

  slotCommentSaveBtn?.addEventListener("click", async () => {
    if (!currentModalSlotId) return;
    if (!canEditBootshalle) {
      showError("Visitor können in der digitalen Bootshalle nichts ändern.", "Nur Ansicht");
      return;
    }
    await saveSlotComment(currentModalSlotId, slotCommentInput?.value || "");
  });
}

// -------------------------------------
// Standorte
// -------------------------------------
function initStandorte() {
  standortSelect.innerHTML = "";

  STANDORTE.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    standortSelect.appendChild(opt);
  });

  standortSelect.value = standort;
  updateStandortSelectAppearance();
  standortSelect.addEventListener("change", async (e) => {
    standort = normalizeStandortValue(e.target.value);
    updateStandortSelectAppearance();
    selectedBoatId = null;
    updateSelectedUI();
    await loadData();
  });
}

// -------------------------------------
// Start
// -------------------------------------
ensureCommentUI();
initStandorte();
updateSelectedUI();

if (assertDom()) {
  await loadCurrentRole();
  await loadData();
}
