import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://gzneayfjpvcfpdaqzevr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmVheWZqcHZjZnBkYXF6ZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDUsImV4cCI6MjA4NzE1OTg0NX0.v5NJARFQuotDrgLZZkJ2p228s6LCWTIF-QRmyZIoTbs";

const T_MATERIAL = "material";
const T_DETAILS = "material_details";
const T_PROFILES = "profiles";
const STORAGE_KEY = "material-tracker-trailer-state-v3";
const FREE_BOAT_LIMIT = 5;
const TRAILER_UPGRADE_PRICE_EUR = "9,99";
const CATEGORY_ORDER = ["Skulls", "Riemen", "Ausleger", "Hüllen", "Rollsitze", "Sonstiges"];

const TRAILER_PRESETS = [
  { id: "brg_4er_1", name: "BRG 4er 1", levels: 2, hangSlots: 2 },
  { id: "brg_4er_2", name: "BRG 4er 2", levels: 2, hangSlots: 2 },
  { id: "brg_6er", name: "BRG 6er", levels: 3, hangSlots: 3 },
  { id: "brg_8er_1", name: "BRG 8er 1", levels: 4, hangSlots: 3 },
  { id: "brg_8er_2", name: "BRG 8er 2", levels: 4, hangSlots: 2 },
  { id: "srv_6er", name: "SRV 6er", levels: 3, hangSlots: 2 },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const bundleListEl = document.getElementById("bundleList");
const trailerSelectEl = document.getElementById("trailerSelect");
const trailerPurposeEl = document.getElementById("trailerPurpose");
const trailerContainerEl = document.getElementById("trailerContainer");
const materialBoxEl = document.getElementById("materialBox");
const slotDetailsPanelEl = document.getElementById("slotDetailsPanel");
const trailerSummaryPanelEl = document.getElementById("trailerSummaryPanel");
const bundleSearchEl = document.getElementById("bundleSearch");
const sourceStandortFilterEl = document.getElementById("sourceStandortFilter");
const clearTrailerBtnEl = document.getElementById("clearTrailerBtn");
const reloadBtnEl = document.getElementById("reloadBtn");
const assignStandortBtnEl = document.getElementById("assignStandortBtn");
const unloadTrailerBtnEl = document.getElementById("unloadTrailerBtn");
const exportPdfBtnEl = document.getElementById("exportPdfBtn");
const statusTextEl = document.getElementById("statusText");
const trailerMetaTextEl = document.getElementById("trailerMetaText");
const printTitleEl = document.getElementById("printTitle");
const printMetaEl = document.getElementById("printMeta");
const printSchemaTableEl = document.getElementById("printSchemaTable");
const printMaterialTableEl = document.getElementById("printMaterialTable");
const bundleDialog = document.getElementById("bundleDialog");
const bundleDialogTitleEl = document.getElementById("bundleDialogTitle");
const bundleDialogInfo = document.getElementById("bundleDialogInfo");
const includeSkullsEl = document.getElementById("includeSkulls");
const includeSweepEl = document.getElementById("includeSweep");
const includeSeatsEl = document.getElementById("includeSeats");
const includeCoverEl = document.getElementById("includeCover");
const bundleDialogHintEl = document.getElementById("bundleDialogHint");
const cancelBundleDialogEl = document.getElementById("cancelBundleDialog");
const confirmBundleDialogEl = document.getElementById("confirmBundleDialog");
const slotDialog = document.getElementById("slotDialog");
const slotDialogTitleEl = document.getElementById("slotDialogTitle");
const slotCommentInputEl = document.getElementById("slotCommentInput");
const slotSearchInputEl = document.getElementById("slotSearchInput");
const slotCurrentInfoEl = document.getElementById("slotCurrentInfo");
const slotBoatResultsEl = document.getElementById("slotBoatResults");
const removeSlotBoatBtnEl = document.getElementById("removeSlotBoatBtn");
const cancelSlotDialogEl = document.getElementById("cancelSlotDialog");
const saveSlotDialogEl = document.getElementById("saveSlotDialog");
const assignStandortDialog = document.getElementById("assignStandortDialog");
const assignStandortSelectEl = document.getElementById("assignStandortSelect");
const assignStandortInfoEl = document.getElementById("assignStandortInfo");
const cancelAssignStandortEl = document.getElementById("cancelAssignStandort");
const confirmAssignStandortEl = document.getElementById("confirmAssignStandort");
const bulkConfirmDialog = document.getElementById("bulkConfirmDialog");
const bulkConfirmIntroEl = document.getElementById("bulkConfirmIntro");
const bulkConfirmListEl = document.getElementById("bulkConfirmList");
const editBulkConfirmEl = document.getElementById("editBulkConfirm");
const cancelBulkConfirmEl = document.getElementById("cancelBulkConfirm");
const applyBulkConfirmEl = document.getElementById("applyBulkConfirm");
const paywallDialog = document.getElementById("paywallDialog");
const paywallMessageEl = document.getElementById("paywallMessage");
const closePaywallDialogEl = document.getElementById("closePaywallDialog");
const startPaypalCheckoutEl = document.getElementById("startPaypalCheckout");
const unloadDialog = document.getElementById("unloadDialog");
const unloadStandortSelectEl = document.getElementById("unloadStandortSelect");
const unloadSelectAllEl = document.getElementById("unloadSelectAll");
const unloadSelectionListEl = document.getElementById("unloadSelectionList");
const cancelUnloadDialogEl = document.getElementById("cancelUnloadDialog");
const confirmUnloadDialogEl = document.getElementById("confirmUnloadDialog");
const materialInfoDialog = document.getElementById("materialInfoDialog");
const materialInfoTitleEl = document.getElementById("materialInfoTitle");
const materialInfoMetaEl = document.getElementById("materialInfoMeta");
const materialInfoContentEl = document.getElementById("materialInfoContent");
const closeMaterialInfoEl = document.getElementById("closeMaterialInfo");
const materialBundleDialog = document.getElementById("materialBundleDialog");
const materialBundleDialogTitleEl = document.getElementById("materialBundleDialogTitle");
const materialBundleDialogInfoEl = document.getElementById("materialBundleDialogInfo");
const materialBundleSelectAllEl = document.getElementById("materialBundleSelectAll");
const materialBundleDialogListEl = document.getElementById("materialBundleDialogList");
const cancelMaterialBundleDialogEl = document.getElementById("cancelMaterialBundleDialog");
const confirmMaterialBundleDialogEl = document.getElementById("confirmMaterialBundleDialog");

let materials = [];
let detailsByMaterialId = {};
let boatBundles = [];
let skullGroups = [];
let sweepGroups = [];
let selectedTrailerId = TRAILER_PRESETS[0]?.id ?? "";
let trailerMetaById = {};
let planningByTrailer = {};
let materialBoxByTrailer = {};
let selectedSlotId = null;
let pendingBoatDrop = null;
let currentSlotDialogId = null;
let currentDragPayload = null;
let pendingStandortChange = null;
let pendingMaterialBundleDrop = null;
let pendingUnloadItems = [];
let transientStatusMessage = null;
let transientStatusTimer = null;
let currentUser = null;
let currentProfile = null;
let pendingUpgradeBoatId = null;

function syncMaterialBundleSelectAll() {
  if (!materialBundleSelectAllEl) {
    return;
  }

  const checkboxes = [...materialBundleDialogListEl.querySelectorAll('input[type="checkbox"][data-item-id]')];
  const checkedCount = checkboxes.filter((inputEl) => inputEl.checked).length;
  materialBundleSelectAllEl.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
  materialBundleSelectAllEl.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function getTrailerUnloadableItems() {
  const items = new Map();
  getResolvedSlotEntries().forEach((entry) => {
    items.set(entry.boat.id, entry.boat);
    entry.materialItems.forEach((item) => items.set(item.id, item));
  });
  getMaterialBoxItems().forEach((item) => items.set(item.id, item));
  return [...items.values()].sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER.concat("Boote").indexOf(a.kategorie || "Sonstiges") - CATEGORY_ORDER.concat("Boote").indexOf(b.kategorie || "Sonstiges");
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "de");
  });
}

function syncUnloadSelectAll() {
  const checkboxes = [...unloadSelectionListEl.querySelectorAll('input[type="checkbox"][data-item-id]')];
  const checkedCount = checkboxes.filter((inputEl) => inputEl.checked).length;
  unloadSelectAllEl.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
  unloadSelectAllEl.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function pruneTrailerContentsAfterMove(itemIds, trailerId = selectedTrailerId) {
  const itemIdSet = new Set(itemIds);
  const plan = getTrailerPlanning(trailerId);
  const materialState = getMaterialBoxState(trailerId);

  Object.keys(plan).forEach((slotId) => {
    const entry = plan[slotId];
    if (entry?.boatId && itemIdSet.has(entry.boatId)) {
      const keepComment = entry.comment || "";
      const remainingLinked = getSlotLinkedMaterialIds(slotId, trailerId).filter((id) => !itemIdSet.has(id));
      delete plan[slotId];
      clearSlotLinkedMaterials(slotId, trailerId);
      if (remainingLinked.length) {
        addManualItemsToMaterialBox(remainingLinked, trailerId);
      }
      if (keepComment) {
        plan[slotId] = {
          boatId: null,
          moveConfig: { skullAusleger: false, riemenAusleger: false, rollsitze: false, huellen: false },
          comment: keepComment,
        };
      }
      return;
    }

    const nextLinked = getSlotLinkedMaterialIds(slotId, trailerId).filter((id) => !itemIdSet.has(id));
    if (nextLinked.length) {
      setSlotLinkedMaterials(slotId, nextLinked, trailerId);
    } else {
      clearSlotLinkedMaterials(slotId, trailerId);
    }
  });

  materialState.manualItemIds = (materialState.manualItemIds || []).filter((id) => !itemIdSet.has(id));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeStandortKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/Fuehlingen/i, "Fühlingen");
}

function extractLastNumber(value) {
  const match = String(value || "").match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function getItemDetails(itemId) {
  return detailsByMaterialId[itemId] || {};
}

function getTrailerPreset(trailerId = selectedTrailerId) {
  return TRAILER_PRESETS.find((preset) => preset.id === trailerId) ?? TRAILER_PRESETS[0];
}

function createHangSlotIds(level, hangSlots = 3) {
  const slotPool = ["5", "6", "7"];
  return slotPool.slice(0, Math.max(0, hangSlots)).map((suffix) => `${level}.${suffix}`);
}

function createRacks(levels, hangSlots = 3) {
  return Array.from({ length: levels }, (_, index) => {
    const level = levels - index;
    return {
      level,
      main: [`${level}.1`, `${level}.2`, `${level}.3`, `${level}.4`],
      hang: index === 0 ? [] : createHangSlotIds(level, hangSlots),
    };
  });
}

function getTrailerTemplate(trailerId = selectedTrailerId) {
  const preset = getTrailerPreset(trailerId);
  return {
    id: preset.id,
    name: preset.name,
    levels: preset.levels,
    hangSlots: preset.hangSlots ?? 3,
    racks: createRacks(preset.levels, preset.hangSlots ?? 3),
  };
}

function getTrailerMeta(trailerId = selectedTrailerId) {
  if (!trailerMetaById[trailerId]) {
    trailerMetaById[trailerId] = { zweck: "" };
  }

  return trailerMetaById[trailerId];
}

function getTrailerPlanning(trailerId = selectedTrailerId) {
  if (!planningByTrailer[trailerId]) {
    planningByTrailer[trailerId] = {};
  }

  return planningByTrailer[trailerId];
}

function getMaterialBoxState(trailerId = selectedTrailerId) {
  if (!materialBoxByTrailer[trailerId]) {
    materialBoxByTrailer[trailerId] = {
      manualItemIds: [],
      slotLinked: {},
    };
  }

  return materialBoxByTrailer[trailerId];
}

function saveLocalState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      selectedTrailerId,
      trailerMetaById,
      planningByTrailer,
      materialBoxByTrailer,
    }),
  );
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (TRAILER_PRESETS.some((preset) => preset.id === parsed?.selectedTrailerId)) {
      selectedTrailerId = parsed.selectedTrailerId;
    }

    trailerMetaById = parsed?.trailerMetaById && typeof parsed.trailerMetaById === "object" ? parsed.trailerMetaById : {};
    planningByTrailer = parsed?.planningByTrailer && typeof parsed.planningByTrailer === "object" ? parsed.planningByTrailer : {};
    materialBoxByTrailer =
      parsed?.materialBoxByTrailer && typeof parsed.materialBoxByTrailer === "object" ? parsed.materialBoxByTrailer : {};
  } catch (error) {
    console.warn("Trailer-Status konnte nicht geladen werden.", error);
  }
}

function classifyAusleger(item) {
  const typ = String(getItemDetails(item.id)?.typ || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();

  if (typ === "skull" || name.includes("skullausleger")) {
    return "skull";
  }

  if (typ === "riemen" || name.includes("riemenausleger")) {
    return "riemen";
  }

  return "unknown";
}

function getBoatSeats(boat) {
  const seats = Number(getItemDetails(boat.id)?.plaetze);
  return Number.isFinite(seats) && seats > 0 ? seats : null;
}

function getBoatType(boat) {
  const details = getItemDetails(boat.id);
  if (details.Bootsform) {
    return String(details.Bootsform);
  }

  const seats = getBoatSeats(boat);
  return seats ? `${seats}+` : "unbekannt";
}

function getBoatExportType(boat) {
  const seats = getBoatSeats(boat);
  if (!seats) {
    return getBoatType(boat);
  }

  const details = getItemDetails(boat.id);
  const steer = !!details?.steuermann_verfuegbar;
  const bundle = getBoatBundleByBoatId(boat.id);
  let hasSkull = false;
  let hasRiemen = false;

  (bundle?.bundleItems || []).forEach((item) => {
    if (item.kategorie !== "Ausleger") {
      return;
    }
    const kind = classifyAusleger(item);
    if (kind === "skull") {
      hasSkull = true;
    }
    if (kind === "riemen") {
      hasRiemen = true;
    }
  });

  let marker = "";
  if (hasSkull && hasRiemen) {
    marker = "x/-";
  } else if (hasSkull) {
    marker = "x";
  } else if (hasRiemen) {
    marker = "-";
  }

  return `${seats}${marker}${steer ? "+" : ""}`;
}

function getBoatSeatClassName(boat) {
  const seats = getBoatSeats(boat);
  if (!seats) {
    return "seat-unknown";
  }
  return `seat-${seats}`;
}

function getExportSlotCellClass(slotId, entry) {
  const resolvedEntry = entry || resolveSlotEntry(slotId);
  if (!resolvedEntry) {
    return "";
  }
  return getBoatSeatClassName(resolvedEntry.boat);
}

function isSplitBoatBundle(bundleOrBoat) {
  const boat = bundleOrBoat?.boat || bundleOrBoat;
  return (getBoatSeats(boat) || 0) >= 8;
}

function getSlotParts(slotId) {
  const match = String(slotId || "").match(/^(\d+)\.(\d)$/);
  if (!match) {
    return null;
  }

  return {
    level: Number(match[1]),
    position: match[2],
  };
}

function getMainSlotLane(slotId) {
  const parts = getSlotParts(slotId);
  if (!parts) {
    return null;
  }
  if (parts.position === "1" || parts.position === "2") {
    return "left";
  }
  if (parts.position === "3" || parts.position === "4") {
    return "right";
  }
  return null;
}

function getRackLaneSlots(rack, lane) {
  if (lane === "left") {
    return rack.main.slice(0, 2);
  }
  if (lane === "right") {
    return rack.main.slice(2, 4);
  }
  return [...rack.main];
}

function isSlotAvailableForBoat(slotId, boatId, ignorePrimarySlotId = null) {
  const entry = resolveSlotEntry(slotId);
  if (!entry) {
    return true;
  }

  if (entry.boat.id === boatId) {
    return true;
  }

  if (!ignorePrimarySlotId) {
    return false;
  }

  const ignoredSlots = new Set(resolveSlotEntry(ignorePrimarySlotId)?.occupiedSlots || [ignorePrimarySlotId]);
  return ignoredSlots.has(slotId);
}

function findSplitBoatPlacement(slotId, boatId, ignorePrimarySlotId = null, trailerId = selectedTrailerId) {
  const template = getTrailerTemplate(trailerId);
  const lane = getMainSlotLane(slotId);
  const racks = template.racks.map((rack) => ({
    ...rack,
    candidateSlots: getRackLaneSlots(rack, lane),
  }));

  for (let rackIndex = 0; rackIndex < racks.length; rackIndex += 1) {
    const bugSlotId = racks[rackIndex].candidateSlots.find((candidateSlotId) =>
      isSlotAvailableForBoat(candidateSlotId, boatId, ignorePrimarySlotId),
    );
    if (!bugSlotId) {
      continue;
    }

    for (let lowerRackIndex = rackIndex + 1; lowerRackIndex < racks.length; lowerRackIndex += 1) {
      const heckSlotId = racks[lowerRackIndex].candidateSlots.find((candidateSlotId) =>
        candidateSlotId !== bugSlotId && isSlotAvailableForBoat(candidateSlotId, boatId, ignorePrimarySlotId),
      );
      if (heckSlotId) {
        return [bugSlotId, heckSlotId];
      }
    }
  }

  return null;
}

function buildBoatBundles() {
  const boats = materials
    .filter((item) => item.kategorie === "Boote")
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));

  boatBundles = boats.map((boat) => {
    const bundleItems = boat.bundle_id ? materials.filter((item) => item.bundle_id === boat.bundle_id) : [boat];
    const availability = {
      skullAusleger: false,
      riemenAusleger: false,
      rollsitze: false,
      huellen: false,
    };

    bundleItems.forEach((item) => {
      if (item.id === boat.id) {
        return;
      }

      if (item.kategorie === "Rollsitze") {
        availability.rollsitze = true;
      }

      if (item.kategorie === "Hüllen") {
        availability.huellen = true;
      }

      if (item.kategorie === "Ausleger") {
        const auslegerType = classifyAusleger(item);
        if (auslegerType === "skull") {
          availability.skullAusleger = true;
        }
        if (auslegerType === "riemen") {
          availability.riemenAusleger = true;
        }
        if (auslegerType === "unknown") {
          availability.skullAusleger = true;
          availability.riemenAusleger = true;
        }
      }
    });

    return {
      boat,
      bundleItems,
      availability,
      standort: normalizeStandortKey(boat.standort),
    };
  });
}

function buildCategoryGroups(category) {
  const groupsMap = new Map();

  materials
    .filter((item) => item.kategorie === category)
    .forEach((item) => {
      const groupKey = item.set_id || item.bundle_id || item.id;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      groupsMap.get(groupKey).push(item);
    });

  return [...groupsMap.entries()]
    .map(([groupKey, items]) => {
      items.sort((a, b) => {
        const numericDiff = extractLastNumber(a.name) - extractLastNumber(b.name);
        if (Number.isFinite(numericDiff) && numericDiff !== 0) {
          return numericDiff;
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "de");
      });

      return {
        id: `${category}:${groupKey}`,
        category,
        title: items.length > 1 ? `${items[0].name.replace(/\s+\d+$/, "")} (${items.length})` : items[0].name,
        items,
      };
    })
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "de"));
}

function getBoatBundleByBoatId(boatId) {
  return boatBundles.find((bundle) => bundle.boat.id === boatId) ?? null;
}

function getItemById(itemId) {
  return materials.find((item) => item.id === itemId) ?? null;
}

function isHangSlot(slotId) {
  return [".5", ".6", ".7"].some((suffix) => slotId.endsWith(suffix));
}

function getPayloadFromTransfer(event) {
  try {
    const raw = event.dataTransfer?.getData("application/json");
    if (raw) {
      return JSON.parse(raw);
    }
    const fallback = event.dataTransfer?.getData("text/plain");
    if (fallback === "__material_tracker_drag__") {
      return currentDragPayload;
    }
    return currentDragPayload;
  } catch {
    return currentDragPayload;
  }
}

function setTransferPayload(event, payload) {
  currentDragPayload = payload;
  event.dataTransfer?.setData("application/json", JSON.stringify(payload));
  event.dataTransfer?.setData("text/plain", "__material_tracker_drag__");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function getSlotLinkedMaterialIds(slotId, trailerId = selectedTrailerId) {
  return [...(getMaterialBoxState(trailerId).slotLinked[slotId] || [])];
}

function clearSlotLinkedMaterials(slotId, trailerId = selectedTrailerId) {
  delete getMaterialBoxState(trailerId).slotLinked[slotId];
}

function setSlotLinkedMaterials(slotId, itemIds, trailerId = selectedTrailerId) {
  getMaterialBoxState(trailerId).slotLinked[slotId] = [...new Set(itemIds)];
}

function addManualItemsToMaterialBox(itemIds, trailerId = selectedTrailerId) {
  const state = getMaterialBoxState(trailerId);
  const next = new Set(state.manualItemIds || []);
  itemIds.forEach((itemId) => {
    const item = getItemById(itemId);
    if (item && item.kategorie !== "Boote") {
      next.add(itemId);
    }
  });
  state.manualItemIds = [...next];
}

function removeManualItem(itemId, trailerId = selectedTrailerId) {
  const state = getMaterialBoxState(trailerId);
  state.manualItemIds = (state.manualItemIds || []).filter((id) => id !== itemId);
}

function getMaterialBoxItems(trailerId = selectedTrailerId) {
  const state = getMaterialBoxState(trailerId);
  const ids = new Set(state.manualItemIds || []);

  Object.values(state.slotLinked || {}).forEach((slotItemIds) => {
    (slotItemIds || []).forEach((itemId) => ids.add(itemId));
  });

  return [...ids]
    .map(getItemById)
    .filter(Boolean)
    .sort((a, b) => {
      const catDiff = CATEGORY_ORDER.indexOf(a.kategorie || "Sonstiges") - CATEGORY_ORDER.indexOf(b.kategorie || "Sonstiges");
      if (catDiff !== 0) {
        return catDiff;
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "de");
    });
}

function buildMoveConfig(bundle) {
  const availability = bundle?.availability || {};
  return {
    skullAusleger: !!availability.skullAusleger,
    riemenAusleger: !!availability.riemenAusleger,
    rollsitze: !!availability.rollsitze,
    huellen: !!availability.huellen,
  };
}

function getInfoBundleMaterialIds(bundle, moveConfig) {
  const itemIds = [];

  (bundle?.bundleItems || []).forEach((item) => {
    if (item.kategorie === "Boote") {
      return;
    }

    if (item.kategorie === "Rollsitze" && moveConfig.rollsitze) {
      itemIds.push(item.id);
      return;
    }

    if (item.kategorie === "Hüllen" && moveConfig.huellen) {
      itemIds.push(item.id);
      return;
    }

    if (item.kategorie === "Ausleger") {
      const auslegerType = classifyAusleger(item);
      if (auslegerType === "skull" && moveConfig.skullAusleger) {
        itemIds.push(item.id);
        return;
      }
      if (auslegerType === "riemen" && moveConfig.riemenAusleger) {
        itemIds.push(item.id);
        return;
      }
      if (auslegerType === "unknown" && moveConfig.skullAusleger && moveConfig.riemenAusleger) {
        itemIds.push(item.id);
      }
    }
  });

  return [...new Set(itemIds)];
}

function resolveSlotEntry(slotId) {
  const planEntry = getTrailerPlanning()[slotId];
  if (!planEntry) {
    return null;
  }

  const primarySlotId = planEntry.primarySlotId || slotId;
  const primaryEntry = getTrailerPlanning()[primarySlotId] || planEntry;
  const bundle = getBoatBundleByBoatId(primaryEntry.boatId);
  if (!bundle) {
    return null;
  }

  return {
    slotId,
    primarySlotId,
    boat: bundle.boat,
    bundle,
    moveConfig: primaryEntry.moveConfig,
    comment: primaryEntry.comment || "",
    materialItems: getSlotLinkedMaterialIds(primarySlotId).map(getItemById).filter(Boolean),
    occupiedSlots: primaryEntry.occupiedSlots || [primarySlotId],
    slotRole: planEntry.slotRole || null,
    isSecondary: !!planEntry.isSecondary,
  };
}

function getResolvedSlotEntries() {
  const seen = new Set();
  return Object.keys(getTrailerPlanning())
    .map(resolveSlotEntry)
    .filter((entry) => {
      if (!entry) {
        return false;
      }
      if (seen.has(entry.primarySlotId)) {
        return false;
      }
      seen.add(entry.primarySlotId);
      return true;
    })
    .sort((a, b) => String(a.primarySlotId).localeCompare(String(b.primarySlotId), "de", { numeric: true }));
}

function getAssignedBoatIds(exceptSlotId = null) {
  const ids = new Set();
  Object.entries(getTrailerPlanning()).forEach(([slotId, entry]) => {
    const exceptPrimary = exceptSlotId ? resolveSlotEntry(exceptSlotId)?.primarySlotId || exceptSlotId : null;
    if (slotId === exceptSlotId || (entry?.primarySlotId || slotId) === exceptPrimary) {
      return;
    }
    if (entry?.boatId) {
      ids.add(entry.boatId);
    }
  });
  return ids;
}

function getAssignableBoatBundles(slotId) {
  const query = String(slotSearchInputEl?.value || "")
    .trim()
    .toLowerCase();
  const assignedIds = getAssignedBoatIds(slotId);

  return boatBundles
    .filter((bundle) => !assignedIds.has(bundle.boat.id))
    .filter((bundle) => !isSplitBoatBundle(bundle) || !!getTargetSlotIdsForBoat(bundle.boat.id, slotId))
    .filter((bundle) => {
      const text = [bundle.boat.name, bundle.standort, getBoatType(bundle.boat), getBoatSeats(bundle.boat)].join(" ").toLowerCase();
      return !query || text.includes(query);
    });
}

function getCurrentTrailerItemIds() {
  const ids = new Set();
  getResolvedSlotEntries().forEach((entry) => {
    ids.add(entry.boat.id);
    entry.materialItems.forEach((item) => ids.add(item.id));
  });
  getMaterialBoxItems().forEach((item) => ids.add(item.id));
  return [...ids];
}

function getCurrentTrailerItemIdSet() {
  return new Set(getCurrentTrailerItemIds());
}

function isTrailerUpgradeUnlocked() {
  return !!currentProfile?.trailer_tool_unlocked;
}

function getPlacedBoatCount() {
  return getResolvedSlotEntries().length;
}

function shouldRequireTrailerUpgrade(boatId) {
  if (isTrailerUpgradeUnlocked()) {
    return false;
  }
  if (!boatId) {
    return getPlacedBoatCount() >= FREE_BOAT_LIMIT;
  }
  const alreadyPlaced = getResolvedSlotEntries().some((entry) => entry.boat.id === boatId);
  if (alreadyPlaced) {
    return false;
  }
  return getPlacedBoatCount() >= FREE_BOAT_LIMIT;
}

function openPaywallDialog(boatId = null) {
  pendingUpgradeBoatId = boatId;
  if (paywallMessageEl) {
    paywallMessageEl.textContent = currentUser
      ? `In der kostenlosen Version können bis zu ${FREE_BOAT_LIMIT} Boote geplant werden. Für ${TRAILER_UPGRADE_PRICE_EUR} EUR kannst du das Trailer-Tool für dein Profil dauerhaft freischalten.`
      : `In der kostenlosen Version können bis zu ${FREE_BOAT_LIMIT} Boote geplant werden. Melde dich an, um das Tool für ${TRAILER_UPGRADE_PRICE_EUR} EUR dauerhaft freizuschalten.`;
  }
  paywallDialog?.showModal();
}

function ensureBoatUpgradeAvailable(boatId) {
  if (!shouldRequireTrailerUpgrade(boatId)) {
    return true;
  }
  openPaywallDialog(boatId);
  return false;
}

function getTargetSlotIdsForBoat(boatId, slotId, ignorePrimarySlotId = null) {
  const bundle = getBoatBundleByBoatId(boatId);
  if (!bundle) {
    return null;
  }
  if (!isSplitBoatBundle(bundle)) {
    return [slotId];
  }
  return findSplitBoatPlacement(slotId, boatId, ignorePrimarySlotId);
}

function hasPlacementConflict(boatId, targetSlotIds, ignorePrimarySlotId = null) {
  const ignoreSlots = new Set(ignorePrimarySlotId ? resolveSlotEntry(ignorePrimarySlotId)?.occupiedSlots || [ignorePrimarySlotId] : []);
  return targetSlotIds.some((slotId) => {
    const entry = resolveSlotEntry(slotId);
    return entry && entry.boat.id !== boatId && !ignoreSlots.has(slotId);
  });
}

function getSplitBoatSlots(primarySlotId) {
  const entry = resolveSlotEntry(primarySlotId);
  if (!entry || entry.occupiedSlots.length < 2) {
    return null;
  }

  const plan = getTrailerPlanning();
  const bugSlotId = entry.occupiedSlots.find((slotId) => (plan[slotId]?.slotRole || (slotId === entry.primarySlotId ? "Bug" : "")) === "Bug");
  const heckSlotId = entry.occupiedSlots.find((slotId) => plan[slotId]?.slotRole === "Heck" || slotId !== bugSlotId);

  if (!bugSlotId || !heckSlotId) {
    return null;
  }

  return { bugSlotId, heckSlotId };
}

function assignBoatToSlots(slotIds, bundle, moveConfig, comment = "", materialItemIds = []) {
  const trailerPlan = getTrailerPlanning();
  const [primarySlotId, secondarySlotId] = slotIds;

  trailerPlan[primarySlotId] = {
    boatId: bundle.boat.id,
    moveConfig,
    comment,
    occupiedSlots: [...slotIds],
    primarySlotId,
    slotRole: secondarySlotId ? "Bug" : null,
    isSecondary: false,
  };

  if (secondarySlotId) {
    trailerPlan[secondarySlotId] = {
      boatId: bundle.boat.id,
      moveConfig,
      comment: "",
      occupiedSlots: [...slotIds],
      primarySlotId,
      slotRole: "Heck",
      isSecondary: true,
    };
  }

  clearSlotLinkedMaterials(primarySlotId);
  if (secondarySlotId) {
    clearSlotLinkedMaterials(secondarySlotId);
  }
  setSlotLinkedMaterials(primarySlotId, materialItemIds);
}

function assignSplitBoatToSpecificSlots(primarySlotId, bugSlotId, heckSlotId) {
  const entry = resolveSlotEntry(primarySlotId);
  if (!entry) {
    return false;
  }

  const materialItemIds = entry.materialItems.map((item) => item.id);
  const comment = entry.comment || "";
  const moveConfig = entry.moveConfig || buildMoveConfig(entry.bundle);

  entry.occupiedSlots.forEach((slotId) => {
    delete getTrailerPlanning()[slotId];
    clearSlotLinkedMaterials(slotId);
  });

  assignBoatToSlots([bugSlotId, heckSlotId], entry.bundle, moveConfig, comment, materialItemIds);
  return true;
}

function removeBoatAssignment(slotId, keepComment = false) {
  const entry = resolveSlotEntry(slotId);
  if (!entry) {
    return;
  }

  const comment = keepComment ? entry.comment || "" : "";
  entry.occupiedSlots.forEach((occupiedSlotId) => {
    delete getTrailerPlanning()[occupiedSlotId];
    clearSlotLinkedMaterials(occupiedSlotId);
  });
  clearSlotLinkedMaterials(entry.primarySlotId);

  if (comment) {
    getTrailerPlanning()[entry.primarySlotId] = {
      boatId: null,
      moveConfig: { skullAusleger: false, riemenAusleger: false, rollsitze: false, huellen: false },
      comment,
      occupiedSlots: [entry.primarySlotId],
      primarySlotId: entry.primarySlotId,
      slotRole: null,
      isSecondary: false,
    };
  }
}

function setTransientStatus(message, isError = false) {
  transientStatusMessage = { message, isError };
  if (transientStatusTimer) {
    clearTimeout(transientStatusTimer);
  }
  transientStatusTimer = window.setTimeout(() => {
    transientStatusMessage = null;
    transientStatusTimer = null;
    updateStatus();
  }, 4200);
  updateStatus();
}

function getDetailLabelMap(category) {
  const maps = {
    Boote: {
      plaetze: "Plätze",
      Bootsform: "Bootsform",
      Baujahr: "Baujahr",
      Verein: "Verein",
      gewicht_kg: "Gewicht",
      huelle_vorhanden: "Hülle vorhanden",
      huelle_notiz: "Hülle Notiz",
      steuermann_verfuegbar: "Steuerplatz",
      aktueller_nutzer: "Aktueller Nutzer",
      defekt: "Defekt",
    },
    Skulls: {
      gesamtlaenge_cm: "Gesamtlänge",
      innenhebel_cm: "Innenhebel",
      schafttyp: "Schafttyp",
      blattform: "Blattform",
      defekt: "Defekt",
    },
    Riemen: {
      griff_verstellbar: "Griff verstellbar",
      schafttyp: "Schafttyp",
      blattform: "Blattform",
      defekt: "Defekt",
      unterschiedliche_seiten: "Seiten unterschiedlich",
      backbord: "Backbord",
      steuerbord: "Steuerbord",
    },
    Ausleger: {
      typ: "Typ",
      dollenabstand_cm: "Dollenabstand",
      anlage_deg: "Anlage",
    },
    Hüllen: { notiz: "Notiz" },
    Rollsitze: { hochgebaut: "Hochgebaut" },
    Sonstiges: { notiz: "Notiz" },
  };

  return maps[category] || {};
}

function formatDetailValue(value) {
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === "object" ? JSON.stringify(entry) : String(entry))).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, innerValue]) => `${key}: ${formatDetailValue(innerValue)}`)
      .join(" | ");
  }
  return String(value);
}

function renderTrailerSelect() {
  trailerSelectEl.innerHTML = TRAILER_PRESETS.map(
    (preset) => `<option value="${preset.id}">${escapeHtml(preset.name)} · ${preset.levels} Etagen</option>`,
  ).join("");
  trailerSelectEl.value = selectedTrailerId;
}

function renderTrailerMeta() {
  const preset = getTrailerPreset();
  const meta = getTrailerMeta();
  trailerPurposeEl.value = meta.zweck || "";

  const pieces = [`${preset.name} · ${preset.levels} Etagen`, meta.zweck ? `Zweck: ${meta.zweck}` : "Zweck offen"];
  trailerMetaTextEl.textContent = pieces.join(" · ");
  printTitleEl.textContent = `${preset.name} – Anhängerplanung`;
  printMetaEl.textContent = pieces.join(" · ");
}

function getTrailerStandortLabel(trailerId = selectedTrailerId) {
  const preset = getTrailerPreset(trailerId);
  const meta = getTrailerMeta(trailerId);
  const purpose = String(meta?.zweck || "");
  return purpose ? `${preset.name} - ${purpose}` : preset.name;
}

function createDraggableCard(title, subtitle, payload, pills = []) {
  const card = document.createElement("div");
  card.className = "bundle-chip";
  card.draggable = true;

  card.innerHTML = `
    <div class="bundle-head">
      <div>
        <div class="bundle-title">${escapeHtml(title)}</div>
        <div class="subtle">${escapeHtml(subtitle)}</div>
      </div>
      <button type="button" class="info-btn">Info</button>
    </div>
    <div class="bundle-meta" style="margin-top:8px;">
      ${pills.map((pill) => `<span class="meta-pill">${escapeHtml(pill)}</span>`).join("")}
    </div>
  `;

  card.addEventListener("dragstart", (event) => {
    card.classList.add("dragging");
    setTransferPayload(event, payload);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    currentDragPayload = null;
  });

  return card;
}

function renderAccordionSection(title, items, defaultOpen = true) {
  const detailsEl = document.createElement("details");
  detailsEl.open = defaultOpen;
  detailsEl.className = "summary-section";

  const summaryEl = document.createElement("summary");
  summaryEl.style.cursor = "pointer";
  summaryEl.style.fontWeight = "800";
  summaryEl.textContent = `${title} (${items.length})`;

  const contentEl = document.createElement("div");
  contentEl.className = "bundle-list";
  contentEl.style.marginTop = "12px";
  items.forEach((item) => contentEl.appendChild(item));

  detailsEl.appendChild(summaryEl);
  detailsEl.appendChild(contentEl);
  return detailsEl;
}

function renderSourceList() {
  const query = bundleSearchEl.value.trim().toLowerCase();
  const standortFilter = sourceStandortFilterEl?.value || "";
  const trailerItemIds = getCurrentTrailerItemIdSet();
  const availableSkullGroups = skullGroups
    .map((group) => ({
      ...group,
      availableItems: group.items.filter((item) => !trailerItemIds.has(item.id)),
    }))
    .filter((group) => group.availableItems.length > 0);
  const availableSweepGroups = sweepGroups
    .map((group) => ({
      ...group,
      availableItems: group.items.filter((item) => !trailerItemIds.has(item.id)),
    }))
    .filter((group) => group.availableItems.length > 0);

  const boatCards = boatBundles
    .filter((bundle) => !trailerItemIds.has(bundle.boat.id))
    .filter((bundle) => {
      const text = [bundle.boat.name, bundle.standort, getBoatSeats(bundle.boat)].join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!standortFilter || bundle.standort === standortFilter);
    })
    .sort((a, b) => {
      const seatDiff = (getBoatSeats(a.boat) ?? Number.POSITIVE_INFINITY) - (getBoatSeats(b.boat) ?? Number.POSITIVE_INFINITY);
      if (seatDiff !== 0) {
        return seatDiff;
      }
      return String(a.boat.name || "").localeCompare(String(b.boat.name || ""), "de");
    })
    .map((bundle) => {
      const card = createDraggableCard(
        bundle.boat.name,
        `${getBoatSeats(bundle.boat) ?? "–"} Plätze · ${bundle.standort || "ohne Standort"}`,
        { type: "boat", boatId: bundle.boat.id },
        [],
      );
      card.querySelector(".info-btn")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMaterialInfo(bundle.boat.id);
      });
      return card;
    });

  const skullCards = availableSkullGroups
    .filter((group) => {
      const text = [group.title, ...group.availableItems.map((item) => `${item.name} ${item.standort || ""}`)].join(" ").toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (!standortFilter || group.availableItems.some((item) => normalizeStandortKey(item.standort) === standortFilter))
      );
    })
    .map((group) => {
      const card = createDraggableCard(
        group.title,
        `Skull-Satz · ${group.availableItems[0]?.standort || "ohne Standort"}`,
        {
          type: "materials-group",
          category: "Skulls",
          title: group.title,
          itemIds: group.availableItems.map((item) => item.id),
        },
        [`${group.availableItems.length} Teile`],
      );
      card.querySelector(".info-btn")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMaterialInfo(group.availableItems[0]?.id);
      });
      return card;
    });

  const sweepCards = availableSweepGroups
    .filter((group) => {
      const text = [group.title, ...group.availableItems.map((item) => `${item.name} ${item.standort || ""}`)].join(" ").toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (!standortFilter || group.availableItems.some((item) => normalizeStandortKey(item.standort) === standortFilter))
      );
    })
    .map((group) => {
      const card = createDraggableCard(
        group.title,
        `Riemen-Satz · ${group.availableItems[0]?.standort || "ohne Standort"}`,
        {
          type: "materials-group",
          category: "Riemen",
          title: group.title,
          itemIds: group.availableItems.map((item) => item.id),
        },
        [`${group.availableItems.length} Teile`],
      );
      card.querySelector(".info-btn")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMaterialInfo(group.availableItems[0]?.id);
      });
      return card;
    });

  bundleListEl.innerHTML = "";
  bundleListEl.appendChild(renderAccordionSection("Boote", boatCards, true));
  bundleListEl.appendChild(renderAccordionSection("Skulls", skullCards, true));
  bundleListEl.appendChild(renderAccordionSection("Riemen", sweepCards, true));
}

function createSlotElement(slotId) {
  const slotEntry = resolveSlotEntry(slotId);
  const slotComment = slotEntry?.comment || getTrailerPlanning()[slotId]?.comment || "";
  const slotEl = document.createElement("div");
  const occupiedLabel =
    slotEntry?.occupiedSlots?.length > 1 ? `Plätze ${slotEntry.occupiedSlots.map((id) => escapeHtml(id)).join(" / ")}` : "";
  const slotRoleLabel = slotEntry?.slotRole ? `<span class="slot-role-tag">${escapeHtml(slotEntry.slotRole)}</span>` : "";
  const slotContentHtml = slotEntry
    ? `
      <div class="slot-name-line">
        <span class="slot-boat-name">${escapeHtml(slotEntry.boat.name)}</span>
        ${slotRoleLabel}
      </div>
      <div class="slot-boat-type">${escapeHtml(getBoatType(slotEntry.boat))}</div>
    `
    : "leer";

  slotEl.className = `slot ${slotEntry ? "filled" : ""} ${isHangSlot(slotId) ? "hang-slot" : "main-slot"} ${
    selectedSlotId === slotId ? "selected" : ""
  }`;
  slotEl.dataset.slotId = slotId;
  slotEl.draggable = !!slotEntry;

  slotEl.innerHTML = `
    <div class="slot-head">
      <div class="slot-label">Platz ${escapeHtml(slotId)}</div>
    </div>
    <div class="slot-content ${slotEntry ? "" : "slot-empty"}">
      ${slotContentHtml}
    </div>
    ${occupiedLabel ? `<div class="subtle">${occupiedLabel}</div>` : ""}
    ${slotComment ? `<div class="subtle">Kommentar: ${escapeHtml(slotComment)}</div>` : ""}
    ${slotEntry ? `<div class="slot-actions"><button class="delete remove-btn" data-slot-id="${escapeHtml(slotId)}">Entfernen</button></div>` : ""}
  `;

  slotEl.addEventListener("dragover", (event) => {
    const payload = getPayloadFromTransfer(event);
    if (payload?.type !== "boat" && payload?.type !== "planned-boat") {
      return;
    }
    event.preventDefault();
    slotEl.classList.add("drag-over");
  });

  slotEl.addEventListener("dragleave", () => {
    slotEl.classList.remove("drag-over");
  });

  slotEl.addEventListener("drop", (event) => {
    const payload = getPayloadFromTransfer(event);
    slotEl.classList.remove("drag-over");
    if (payload?.type !== "boat" && payload?.type !== "planned-boat") {
      return;
    }

    event.preventDefault();

    if (payload?.type === "planned-boat") {
      movePlannedBoat(payload.fromSlotId, slotId);
      return;
    }

    if (!ensureBoatUpgradeAvailable(payload.boatId)) {
      return;
    }

    const targetSlotIds = getTargetSlotIdsForBoat(payload.boatId, slotId);
    if (!targetSlotIds?.length) {
      setTransientStatus("Für diesen Achter sind kein oberer Bug-Platz und kein freier Heck-Platz darunter verfügbar.", true);
      return;
    }
    if (hasPlacementConflict(payload.boatId, targetSlotIds)) {
      setTransientStatus("Mindestens einer der für den Achter benötigten Plätze ist bereits belegt.", true);
      return;
    }

    pendingBoatDrop = { slotId, slotIds: targetSlotIds, boatId: payload.boatId };
    openBundleDialog(payload.boatId, slotId);
  });

  slotEl.addEventListener("dragstart", (event) => {
    if (!slotEntry) {
      return;
    }

    slotEl.classList.add("dragging");
    setTransferPayload(event, {
      type: "planned-boat",
      fromSlotId: slotId,
      primarySlotId: slotEntry.primarySlotId,
      occupiedSlots: slotEntry.occupiedSlots,
      boatId: slotEntry.boat.id,
    });
  });

  slotEl.addEventListener("dragend", () => {
    slotEl.classList.remove("dragging");
    currentDragPayload = null;
  });

  slotEl.addEventListener("click", () => {
    selectedSlotId = slotId;
    openSlotDialog(slotId);
  });

  return slotEl;
}

function movePlannedBoat(fromSlotId, toSlotId) {
  if (!fromSlotId || !toSlotId || fromSlotId === toSlotId) {
    return;
  }

  const fromEntry = resolveSlotEntry(fromSlotId);
  if (!fromEntry) {
    return;
  }

  if (fromEntry.occupiedSlots.length > 1) {
    if (isHangSlot(toSlotId) || !getMainSlotLane(toSlotId)) {
      setTransientStatus("Bug und Heck eines Achters können nur auf Hauptplätzen verschoben werden.", true);
      return;
    }

    const targetEntry = resolveSlotEntry(toSlotId);
    if (targetEntry && targetEntry.boat.id !== fromEntry.boat.id) {
      setTransientStatus("Der Zielplatz ist bereits belegt.", true);
      return;
    }

    const splitSlots = getSplitBoatSlots(fromEntry.primarySlotId);
    if (!splitSlots) {
      setTransientStatus("Die Achter-Belegung konnte nicht eindeutig aufgelöst werden.", true);
      return;
    }

    const movingBug = splitSlots.bugSlotId === fromSlotId;
    const nextBugSlotId = movingBug ? toSlotId : splitSlots.bugSlotId;
    const nextHeckSlotId = movingBug ? splitSlots.heckSlotId : toSlotId;

    if (nextBugSlotId === nextHeckSlotId) {
      setTransientStatus("Bug und Heck benötigen zwei unterschiedliche Plätze.", true);
      return;
    }

    if (!assignSplitBoatToSpecificSlots(fromEntry.primarySlotId, nextBugSlotId, nextHeckSlotId)) {
      setTransientStatus("Der Achter konnte nicht verschoben werden.", true);
      return;
    }

    selectedSlotId = toSlotId;
    saveLocalState();
    renderAll();
    return;
  }

  const targetSlotIds = getTargetSlotIdsForBoat(fromEntry.boat.id, toSlotId, fromEntry.primarySlotId);
  if (!targetSlotIds?.length) {
    setTransientStatus("Für diesen Achter sind auf dem Anhänger kein passender Bug- und Heck-Platz frei.", true);
    return;
  }
  if (hasPlacementConflict(fromEntry.boat.id, targetSlotIds, fromEntry.primarySlotId)) {
    setTransientStatus("Mindestens einer der Zielplätze für den Achter ist bereits belegt.", true);
    return;
  }

  const carriedMaterialIds = fromEntry.materialItems.map((item) => item.id);
  const preservedComment = fromEntry.comment || "";
  removeBoatAssignment(fromEntry.primarySlotId, false);
  assignBoatToSlots(targetSlotIds, fromEntry.bundle, fromEntry.moveConfig || buildMoveConfig(fromEntry.bundle), preservedComment, carriedMaterialIds);
  selectedSlotId = targetSlotIds[0];

  saveLocalState();
  renderAll();
}

function renderTrailer() {
  const template = getTrailerTemplate();
  const canvas = document.createElement("div");
  const frame = document.createElement("div");
  const leftSide = document.createElement("div");
  const rightSide = document.createElement("div");
  const materialInline = document.createElement("div");
  const materialShell = document.createElement("div");

  canvas.className = "trailer-canvas";
  frame.className = "trailer-frame";
  leftSide.className = "trailer-side left";
  rightSide.className = "trailer-side right";
  materialInline.className = "material-box-inline";
  materialShell.className = "material-box-shell";

  frame.appendChild(leftSide);
  frame.appendChild(rightSide);

  template.racks.forEach((rack, index) => {
    const isTop = index === 0;
    const isBottom = index === template.racks.length - 1;
    const rackEl = document.createElement("div");
    const line = document.createElement("div");
    const mainRow = document.createElement("div");

    rackEl.className = `rack ${isTop ? "top-rack" : isBottom ? "bottom-rack" : "with-hang"}`;
    line.className = "rack-line";
    mainRow.className = "rack-main-row";

    if (!isTop && rack.hang.length) {
      const hangRow = document.createElement("div");
      hangRow.className = "rack-hang-row";
      const hangPositions =
        rack.hang.length === 2 ? ["25%", "75%"] : rack.hang.length === 3 ? ["25%", "50%", "75%"] : ["50%"];

      rack.hang.forEach((slotId, hangIndex) => {
        const wrap = document.createElement("div");
        wrap.className = "rack-slot-wrap hang";
        wrap.style.left = hangPositions[hangIndex] || "50%";
        wrap.appendChild(createSlotElement(slotId));
        hangRow.appendChild(wrap);
      });

      rackEl.appendChild(hangRow);
    }

    rack.main.forEach((slotId) => {
      const wrap = document.createElement("div");
      wrap.className = "rack-slot-wrap main";
      wrap.appendChild(createSlotElement(slotId));
      mainRow.appendChild(wrap);
    });

    rackEl.appendChild(line);
    rackEl.appendChild(mainRow);
    frame.appendChild(rackEl);
  });

  canvas.appendChild(frame);
  materialInline.innerHTML = `
    <div class="section-title" style="font-size: 16px">Materialbox</div>
    <div class="subtle">Alles außer Boote hier hineinziehen, auch Material aus verschobenen Bundles.</div>
  `;
  materialShell.appendChild(materialBoxEl);
  materialInline.appendChild(materialShell);
  canvas.appendChild(materialInline);
  trailerContainerEl.innerHTML = "";
  trailerContainerEl.appendChild(canvas);
  materialBoxEl.hidden = false;

  trailerContainerEl.querySelectorAll(".remove-btn").forEach((buttonEl) => {
    buttonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      const slotId = buttonEl.dataset.slotId;
      if (!slotId) {
        return;
      }

      removeBoatAssignment(slotId, false);

      if (selectedSlotId === slotId) {
        selectedSlotId = null;
      }

      saveLocalState();
      renderAll();
      closeSlotDialog();
    });
  });
}

function handleMaterialBoxDragOver(event) {
  const payload = getPayloadFromTransfer(event);
  if (payload?.type !== "materials" && payload?.type !== "materials-group") {
    return;
  }

  event.preventDefault();
  materialBoxEl.style.borderColor = "var(--primary)";
}

function handleMaterialBoxDrop(event) {
  const payload = getPayloadFromTransfer(event);
  materialBoxEl.style.borderColor = "";

  if (payload?.type !== "materials" && payload?.type !== "materials-group") {
    return;
  }

  event.preventDefault();
  if (payload.type === "materials-group") {
    openMaterialBundleDialog(payload);
    return;
  }

  addManualItemsToMaterialBox(payload.itemIds || []);
  saveLocalState();
  renderAll();
}

function openMaterialBundleDialog(payload) {
  const selectableItems = (payload?.itemIds || []).map(getItemById).filter(Boolean);
  if (!selectableItems.length) {
    return;
  }

  pendingMaterialBundleDrop = {
    ...payload,
    itemIds: selectableItems.map((item) => item.id),
  };

  materialBundleDialogTitleEl.textContent = `${payload.category || "Material"} verschieben`;
  materialBundleDialogInfoEl.textContent = `Welche ${payload.category || "Materialien"} aus ${payload.title || "diesem Bundle"} sollen in den Anhänger?`;
  materialBundleDialogListEl.innerHTML = selectableItems
    .map(
      (item) => `
        <label class="check-row">
          <input type="checkbox" data-item-id="${escapeHtml(item.id)}" checked />
          <span class="material-bundle-row">
            <span class="material-bundle-copy">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="subtle">${escapeHtml(item.standort || "ohne Standort")}</span>
            </span>
          </span>
        </label>
      `,
    )
    .join("");

  materialBundleSelectAllEl.checked = true;
  materialBundleSelectAllEl.indeterminate = false;
  materialBundleDialogListEl.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((inputEl) => {
    inputEl.addEventListener("change", syncMaterialBundleSelectAll);
  });

  materialBundleDialog.showModal();
}

function confirmMaterialBundleDialog() {
  if (!pendingMaterialBundleDrop) {
    materialBundleDialog.close();
    return;
  }

  const selectedIds = [...materialBundleDialogListEl.querySelectorAll('input[type="checkbox"][data-item-id]:checked')]
    .map((inputEl) => inputEl.dataset.itemId)
    .filter(Boolean);

  pendingMaterialBundleDrop = null;
  materialBundleDialog.close();

  if (!selectedIds.length) {
    return;
  }

  addManualItemsToMaterialBox(selectedIds);
  saveLocalState();
  renderAll();
}

function renderMaterialBox() {
  const items = getMaterialBoxItems();
  materialBoxEl.innerHTML = "";
  materialBoxEl.ondragover = handleMaterialBoxDragOver;
  materialBoxEl.ondrop = handleMaterialBoxDrop;
  materialBoxEl.ondragleave = () => {
    materialBoxEl.style.borderColor = "";
  };

  if (!items.length) {
    materialBoxEl.innerHTML = '<div class="empty-state">Noch kein Zubehör im Anhänger. Ziehe Skulls, Riemen oder andere Materialien hier hinein.</div>';
    return;
  }

  const grouped = items.reduce((acc, item) => {
    const category = item.kategorie || "Sonstiges";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  materialBoxEl.innerHTML = CATEGORY_ORDER.filter((category) => grouped[category]?.length)
    .map(
      (category) => `
        <div class="summary-section material-box-group">
          <h3>${escapeHtml(category)}</h3>
          <div class="material-box-list">
            ${grouped[category]
              .map((item) => {
                const removable = getMaterialBoxState().manualItemIds.includes(item.id);
                return `
                  <div class="material-box-item">
                    <strong>${escapeHtml(item.name)}</strong>
                    <div class="material-box-actions">
                      <button type="button" class="info-btn material-info-btn" data-item-id="${escapeHtml(item.id)}">Info</button>
                      ${removable ? `<button class="secondary material-remove-btn" data-item-id="${escapeHtml(item.id)}">Entfernen</button>` : ""}
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `,
    )
    .join("");

  materialBoxEl.innerHTML = `<div class="material-box-columns">${materialBoxEl.innerHTML}</div>`;

  materialBoxEl.querySelectorAll(".material-remove-btn").forEach((buttonEl) => {
    buttonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      removeManualItem(buttonEl.dataset.itemId);
      saveLocalState();
      renderAll();
    });
  });

  materialBoxEl.querySelectorAll(".material-info-btn").forEach((buttonEl) => {
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMaterialInfo(buttonEl.dataset.itemId);
    });
  });
}

function openMaterialInfo(itemId) {
  const item = getItemById(itemId);
  if (!item) {
    return;
  }

  const details = getItemDetails(itemId);
  const labels = getDetailLabelMap(item.kategorie);
  const detailEntries = Object.entries(details || {});

  materialInfoTitleEl.textContent = item.name || "Materialinfo";
  materialInfoMetaEl.textContent = `${item.kategorie || "Unbekannt"} · ${item.standort || "ohne Standort"} · ID: ${item.id}`;

  if (!detailEntries.length) {
    materialInfoContentEl.innerHTML = '<div class="empty-state">Keine Detailinformationen hinterlegt.</div>';
  } else {
    materialInfoContentEl.innerHTML = detailEntries
      .map(
        ([key, value]) => `
          <div class="details-section">
            <h3>${escapeHtml(labels[key] || key)}</h3>
            <div>${escapeHtml(formatDetailValue(value))}</div>
          </div>
        `,
      )
      .join("");
  }

  materialInfoDialog.showModal();
}

function openBundleDialog(boatId, slotId) {
  const bundle = getBoatBundleByBoatId(boatId);
  if (!bundle) {
    return;
  }
  const targetSlotIds = pendingBoatDrop?.boatId === boatId ? pendingBoatDrop.slotIds || [slotId] : getTargetSlotIdsForBoat(boatId, slotId) || [slotId];
  const locationLabel = targetSlotIds.length > 1 ? `Anhänger (${targetSlotIds.join(" / ")})` : `Anhänger (${slotId})`;

  includeSkullsEl.checked = !!bundle.availability.skullAusleger;
  includeSkullsEl.disabled = !bundle.availability.skullAusleger;
  includeSweepEl.checked = !!bundle.availability.riemenAusleger;
  includeSweepEl.disabled = !bundle.availability.riemenAusleger;
  includeSeatsEl.checked = bundle.availability.rollsitze;
  includeCoverEl.checked = bundle.availability.huellen;
  includeSeatsEl.disabled = !bundle.availability.rollsitze;
  includeCoverEl.disabled = !bundle.availability.huellen;

  bundleDialogTitleEl.textContent = `Boot verschieben: ${bundle.boat.name}`;
  bundleDialogInfo.textContent = `Neuer Standort: ${locationLabel}`;
  bundleDialogHintEl.textContent =
    bundle.availability.skullAusleger || bundle.availability.riemenAusleger
      ? "Welche Teile aus dem Bundle sollen mit verschoben werden?"
      : "Welche Teile aus dem Bundle sollen mit verschoben werden?";
  bundleDialog.showModal();
}

function renderSlotDialogResults() {
  if (!currentSlotDialogId) {
    return;
  }

  const slotEntry = resolveSlotEntry(currentSlotDialogId);
  slotCurrentInfoEl.innerHTML = "";
  slotBoatResultsEl.innerHTML = "";

  if (slotEntry) {
    slotCurrentInfoEl.innerHTML = `
      <div class="material-card">
        <strong>Aktuell: ${escapeHtml(slotEntry.boat.name)}</strong>
        <div class="subtle">${escapeHtml(getBoatType(slotEntry.boat))} · ${escapeHtml(slotEntry.bundle.standort || "ohne Standort")}</div>
      </div>
    `;
    removeSlotBoatBtnEl.style.display = "inline-flex";
  } else {
    slotCurrentInfoEl.innerHTML = '<div class="empty-state">In diesem Feld ist aktuell kein Boot eingeplant.</div>';
    removeSlotBoatBtnEl.style.display = "none";
  }

  const bundles = getAssignableBoatBundles(currentSlotDialogId);
  if (!bundles.length) {
    slotBoatResultsEl.innerHTML = '<div class="empty-state">Keine passenden freien Boote gefunden.</div>';
    return;
  }

  bundles.forEach((bundle) => {
    const buttonEl = document.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = "secondary";
    buttonEl.style.textAlign = "left";
    buttonEl.textContent = `${bundle.boat.name} (${getBoatSeats(bundle.boat) ?? "–"} Plätze · ${bundle.standort || "ohne Standort"})`;
    buttonEl.addEventListener("click", () => {
      if (!ensureBoatUpgradeAvailable(bundle.boat.id)) {
        return;
      }
      const targetSlotIds = getTargetSlotIdsForBoat(bundle.boat.id, currentSlotDialogId);
      if (!targetSlotIds?.length) {
        setTransientStatus("Für diesen Achter gibt es aktuell keinen freien Bug-Platz oben und keinen Heck-Platz darunter.", true);
        return;
      }
      pendingBoatDrop = { slotId: currentSlotDialogId, slotIds: targetSlotIds, boatId: bundle.boat.id };
      slotDialog.close();
      openBundleDialog(bundle.boat.id, currentSlotDialogId);
    });
    slotBoatResultsEl.appendChild(buttonEl);
  });
}

function openSlotDialog(slotId) {
  currentSlotDialogId = String(slotId);
  selectedSlotId = currentSlotDialogId;

  const planEntry = resolveSlotEntry(currentSlotDialogId);
  slotDialogTitleEl.textContent = `Slot ${currentSlotDialogId} bearbeiten`;
  slotCommentInputEl.value = planEntry?.comment || getTrailerPlanning()[currentSlotDialogId]?.comment || "";
  slotSearchInputEl.value = "";
  renderTrailer();
  renderSlotDetails();
  renderSlotDialogResults();
  slotDialog.showModal();
}

function closeSlotDialog() {
  currentSlotDialogId = null;
  slotDialog.close();
}

function saveSlotDialog() {
  if (!currentSlotDialogId) {
    closeSlotDialog();
    return;
  }

  const trailerPlan = getTrailerPlanning();
  const nextComment = slotCommentInputEl.value;
  const currentEntry = resolveSlotEntry(currentSlotDialogId);
  const targetSlotId = currentEntry?.primarySlotId || currentSlotDialogId;
  if (!trailerPlan[targetSlotId]) {
    trailerPlan[targetSlotId] = {
      boatId: null,
      moveConfig: { skullAusleger: false, riemenAusleger: false, rollsitze: false, huellen: false },
      comment: nextComment,
      occupiedSlots: [targetSlotId],
      primarySlotId: targetSlotId,
      slotRole: null,
      isSecondary: false,
    };
  } else {
    trailerPlan[targetSlotId].comment = nextComment;
  }

  if (!trailerPlan[targetSlotId].boatId && !trailerPlan[targetSlotId].comment) {
    delete trailerPlan[targetSlotId];
  }

  saveLocalState();
  renderAll();
  closeSlotDialog();
}

function removeBoatFromCurrentSlot() {
  if (!currentSlotDialogId) {
    return;
  }

  removeBoatAssignment(currentSlotDialogId, true);

  saveLocalState();
  renderAll();
  renderSlotDialogResults();
}

function openTrailerStandortDialog() {
  const ids = getCurrentTrailerItemIds();
  const trailerStandort = getTrailerStandortLabel();
  const titleEl = assignStandortDialog.querySelector("h3");
  const introEl = assignStandortDialog.querySelector(".modal-body > .subtle");
  const locationLabelEl = assignStandortDialog.querySelector("label");

  if (titleEl) {
    titleEl.textContent = "Anhänger-Standort bestätigen";
  }
  if (introEl) {
    introEl.textContent =
      "Der komplette Inhalt des Anhängers wird nach Bestätigung dem aktuellen Anhänger als Standort zugeordnet. In der Materialliste erscheint dann der Anhängername mit Zweck als neuer Standort.";
  }
  if (locationLabelEl) {
    locationLabelEl.hidden = true;
  }
  if (confirmAssignStandortEl) {
    confirmAssignStandortEl.textContent = "Weiter zur Bestätigung";
  }

  assignStandortInfoEl.innerHTML = `
    <strong>Neuer Standort:</strong> ${escapeHtml(trailerStandort)}<br>
    <span class="subtle">${ids.length} Materialeinträge bleiben bis zur Bestätigung am bisherigen Standort und werden erst danach diesem Anhänger zugeordnet.</span>
  `;
  assignStandortDialog.showModal();
}

function openUnloadDialog() {
  const items = getTrailerUnloadableItems();
  if (!items.length) {
    return;
  }

  pendingUnloadItems = items;
  unloadStandortSelectEl.value = "BRG";
  unloadSelectionListEl.innerHTML = items
    .map(
      (item) => `
        <label class="selection-row">
          <input type="checkbox" data-item-id="${escapeHtml(item.id)}" checked />
          <div class="selection-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="subtle">${escapeHtml(item.kategorie || "Sonstiges")} · ${escapeHtml(item.standort || "ohne Standort")}</div>
          </div>
        </label>
      `,
    )
    .join("");

  unloadSelectAllEl.checked = true;
  unloadSelectAllEl.indeterminate = false;
  unloadSelectionListEl.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((inputEl) => {
    inputEl.addEventListener("change", syncUnloadSelectAll);
  });
  unloadDialog.showModal();
}

function confirmUnloadDialog() {
  const selectedIds = [...unloadSelectionListEl.querySelectorAll('input[type="checkbox"][data-item-id]:checked')]
    .map((inputEl) => inputEl.dataset.itemId)
    .filter(Boolean);
  const newStandort = unloadStandortSelectEl.value;
  const items = pendingUnloadItems.filter((item) => selectedIds.includes(item.id));

  if (!items.length) {
    unloadDialog.close();
    return;
  }

  pendingStandortChange = {
    mode: "unload",
    trailerId: selectedTrailerId,
    newStandort,
    items,
  };
  unloadDialog.close();
  renderBulkConfirmDialog();
  bulkConfirmDialog.showModal();
}

function openAssignStandortDialog() {
  const ids = getCurrentTrailerItemIds();
  assignStandortInfoEl.textContent = `${ids.length} Materialeinträge werden auf den neuen Standort gesetzt.`;
  assignStandortDialog.showModal();
}

function renderBulkConfirmDialog() {
  if (!pendingStandortChange) {
    return;
  }

  const grouped = pendingStandortChange.items.reduce((acc, item) => {
    const category = item.kategorie || "Sonstiges";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const isUnload = pendingStandortChange.mode === "unload";
  bulkConfirmIntroEl.innerHTML = isUnload
    ? `Folgendes Material wird vom Anhänger nach <strong>${escapeHtml(pendingStandortChange.newStandort)}</strong> abgeladen:`
    : `Es wird folgendes Material nach <strong>${escapeHtml(pendingStandortChange.newStandort)}</strong> verschoben:`;
  editBulkConfirmEl.textContent = isUnload ? "Abladung ändern" : "Material ändern";
  bulkConfirmListEl.innerHTML = `
    <div class="subtle" style="margin-bottom:10px;">Gesamt: <strong>${pendingStandortChange.items.length}</strong></div>
    ${
      CATEGORY_ORDER.concat("Boote")
    .filter((category, index, array) => array.indexOf(category) === index)
    .map((category) => {
      const items = grouped[category] || [];
      if (!items.length) {
        return "";
      }
      return `
        <div class="summary-section" style="padding-top:10px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px;">
            <div style="font-weight:700;">${escapeHtml(category)}</div>
            <div class="subtle">${items.length}×</div>
          </div>
          <ul style="margin:8px 0 0 0; padding-left:18px; display:grid; gap:6px;">
            ${items
              .map(
                (item) =>
                  `<li><strong>${escapeHtml(item.name)}</strong> <span class="subtle">(${escapeHtml(item.standort || "ohne Standort")})</span></li>`,
              )
              .join("")}
          </ul>
        </div>
      `;
    })
    .join("")
    }
  `;
}

function confirmTrailerStandort() {
  const newStandort = getTrailerStandortLabel();
  const items = getCurrentTrailerItemIds().map(getItemById).filter(Boolean);

  if (!items.length) {
    assignStandortDialog.close();
    return;
  }

  pendingStandortChange = {
    mode: "assign_trailer",
    newStandort,
    items,
  };
  assignStandortDialog.close();
  renderBulkConfirmDialog();
  bulkConfirmDialog.showModal();
}

function confirmAssignStandort() {
  const newStandort = assignStandortSelectEl.value;
  const items = getCurrentTrailerItemIds().map(getItemById).filter(Boolean);

  if (!items.length) {
    assignStandortDialog.close();
    return;
  }

  pendingStandortChange = {
    newStandort,
    items,
  };
  assignStandortDialog.close();
  renderBulkConfirmDialog();
  bulkConfirmDialog.showModal();
}

async function applyAssignStandort() {
  if (!pendingStandortChange) {
    return;
  }

  const ids = pendingStandortChange.items.map((item) => item.id);
  const movedMode = pendingStandortChange.mode;
  const movedTrailerId = pendingStandortChange.trailerId || selectedTrailerId;
  applyBulkConfirmEl.disabled = true;
  try {
    const { error } = await supabase.from(T_MATERIAL).update({ standort: pendingStandortChange.newStandort }).in("id", ids);
    if (error) {
      throw error;
    }

    if (movedMode === "unload") {
      pruneTrailerContentsAfterMove(ids, movedTrailerId);
      saveLocalState();
    }

    bulkConfirmDialog.close();
    pendingStandortChange = null;
    await refreshAll();
  } catch (error) {
    console.error("Standortzuweisung fehlgeschlagen.", error);
    bulkConfirmIntroEl.textContent = `Fehler: ${error.message || error}`;
  } finally {
    applyBulkConfirmEl.disabled = false;
  }
}

function applyPendingBoatDrop() {
  if (!pendingBoatDrop) {
    bundleDialog.close();
    return;
  }

  if (!ensureBoatUpgradeAvailable(pendingBoatDrop.boatId)) {
    pendingBoatDrop = null;
    bundleDialog.close();
    return;
  }

  const bundle = getBoatBundleByBoatId(pendingBoatDrop.boatId);
  if (!bundle) {
    pendingBoatDrop = null;
    bundleDialog.close();
    return;
  }

  const targetSlotIds = pendingBoatDrop.slotIds || getTargetSlotIdsForBoat(pendingBoatDrop.boatId, pendingBoatDrop.slotId);
  if (!targetSlotIds?.length) {
    pendingBoatDrop = null;
    bundleDialog.close();
    setTransientStatus("Dieses Boot kann hier nicht eingeplant werden, weil nicht genug passende Plätze frei sind.", true);
    return;
  }

  const trailerPlan = getTrailerPlanning();
  const previousSlotId = Object.keys(trailerPlan).find((slotId) => trailerPlan[slotId]?.boatId === bundle.boat.id);
  const preservedComment = trailerPlan[targetSlotIds[0]]?.comment || "";

  if (previousSlotId) {
    removeBoatAssignment(previousSlotId, false);
  }

  const moveConfig = {
    skullAusleger: includeSkullsEl.checked && bundle.availability.skullAusleger,
    riemenAusleger: includeSweepEl.checked && bundle.availability.riemenAusleger,
    rollsitze: includeSeatsEl.checked,
    huellen: includeCoverEl.checked,
  };

  assignBoatToSlots(targetSlotIds, bundle, moveConfig, preservedComment, getInfoBundleMaterialIds(bundle, moveConfig));
  selectedSlotId = targetSlotIds[0];
  pendingBoatDrop = null;
  bundleDialog.close();
  saveLocalState();
  renderAll();
}

function renderItemsBlock(title, items, extraFormatter = null) {
  return `
    <div class="details-section">
      <h3>${escapeHtml(title)}</h3>
      ${
        items.length
          ? `<div class="material-list">
              ${items
                .map(
                  (item) => `
                    <div class="material-card">
                      <div class="bundle-head">
                        <div>
                          <strong>${escapeHtml(item.name)}</strong>
                        </div>
                        <button type="button" class="info-btn slot-material-info-btn" data-item-id="${escapeHtml(item.id)}">Info</button>
                      </div>
                      ${typeof extraFormatter === "function" ? extraFormatter(item) : ""}
                    </div>
                  `,
                )
                .join("")}
            </div>`
          : '<div class="empty-state">Nicht eingeplant.</div>'
      }
    </div>
  `;
}

function renderSlotDetails() {
  const slotEntry = selectedSlotId ? resolveSlotEntry(selectedSlotId) : null;
  if (!slotEntry) {
    slotDetailsPanelEl.innerHTML = `
      <div class="details-section">
        <h3>Slot-Details</h3>
        <div class="empty-state">Wähle einen belegten Slot aus, um Boot und mitgezogene Bundle-Materialien zu sehen.</div>
      </div>
    `;
    return;
  }

  const byCategory = slotEntry.materialItems.reduce((acc, item) => {
    const category = item.kategorie || "Sonstiges";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  slotDetailsPanelEl.innerHTML = `
    <div class="details-section">
      <h3>Slot-Details</h3>
      <div class="material-card">
        <strong>${escapeHtml(slotEntry.occupiedSlots.length > 1 ? `Plätze ${slotEntry.occupiedSlots.join(" / ")}` : `Platz ${slotEntry.slotId}`)}</strong>
        <div class="subtle">${escapeHtml(slotEntry.boat.name)} · ${escapeHtml(getBoatType(slotEntry.boat))} · ${getBoatSeats(slotEntry.boat) ?? "–"} Plätze</div>
        ${slotEntry.comment ? `<div class="subtle" style="margin-top:6px;">Kommentar: ${escapeHtml(slotEntry.comment)}</div>` : ""}
      </div>
    </div>
    ${renderItemsBlock("Boot", [slotEntry.boat])}
    ${renderItemsBlock("Mitgezogene Materialien", slotEntry.materialItems, (item) =>
      item.kategorie === "Ausleger" ? `<div class="subtle">Typ: ${escapeHtml(classifyAusleger(item))}</div>` : "",
    )}
    ${renderItemsBlock("Rollsitze", byCategory.Rollsitze || [])}
    ${renderItemsBlock("Hüllen", byCategory["Hüllen"] || [])}
    ${renderItemsBlock("Ausleger", byCategory.Ausleger || [], (item) => `<div class="subtle">Typ: ${escapeHtml(classifyAusleger(item))}</div>`)}
  `;
  slotDetailsPanelEl.querySelectorAll(".slot-material-info-btn").forEach((buttonEl) => {
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMaterialInfo(buttonEl.dataset.itemId);
    });
  });
}

function renderSummaryPanel() {
  const slotEntries = getResolvedSlotEntries();
  const materialBoxItems = getMaterialBoxItems();

  if (!slotEntries.length && !materialBoxItems.length) {
    trailerSummaryPanelEl.innerHTML = `
      <div class="details-section">
        <h3>Gesamtliste für Export</h3>
        <div class="empty-state">Noch keine Boote oder Materialien im Anhänger eingeplant.</div>
      </div>
    `;
    return;
  }

  const grouped = materialBoxItems.reduce((acc, item) => {
    const category = item.kategorie || "Sonstiges";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  trailerSummaryPanelEl.innerHTML = `
    <div class="details-section">
      <h3>Gesamtliste für Export</h3>
      <div class="subtle">${slotEntries.length} Boote auf dem Anhänger · ${materialBoxItems.length} weitere Materialien in der Materialbox</div>
    </div>
    <div class="summary-section">
      <h3>Boote auf dem Anhänger</h3>
      <div class="slot-summary-list">
        ${slotEntries
          .map(
            (entry) => `
              <div class="slot-summary-card">
                <strong>${escapeHtml(entry.occupiedSlots.length > 1 ? `Plätze ${entry.occupiedSlots.join(" / ")}` : `Slot ${entry.slotId}`)} · ${escapeHtml(entry.boat.name)}</strong>
                <div class="subtle">${escapeHtml(getBoatType(entry.boat))} · ${escapeHtml(entry.bundle.standort || "ohne Standort")}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
    ${CATEGORY_ORDER.filter((category) => grouped[category]?.length).map((category) => {
      const items = grouped[category] || [];
      return `
        <div class="summary-section">
          <h3>${escapeHtml(category)}</h3>
          ${
            items.length
              ? `<ul>${items
                  .map((item) => `<li>${escapeHtml(item.name)}${item.kategorie === "Ausleger" ? ` (${escapeHtml(classifyAusleger(item))})` : ""}</li>`)
                  .join("")}</ul>`
              : '<div class="empty-state">Keine Einträge.</div>'
          }
        </div>
      `;
    }).join("")}
  `;
}

function renderPrintExport() {
  if (!printSchemaTableEl || !printMaterialTableEl) {
    return;
  }

  const template = getTrailerTemplate();
  const slotEntries = Object.fromEntries(getResolvedSlotEntries().map((entry) => [entry.slotId, entry]));
  const boxItems = getMaterialBoxItems();
  const materialRows = [];

  template.racks.forEach((rack) => {
    rack.main.forEach((slotId) => {
      const entry = slotEntries[slotId];
      if (entry) {
        materialRows.push({
          bereich: "Anhänger",
          platz: slotId,
          itemId: entry.boat.id,
          material: entry.boat.name,
          kategorie: entry.boat.kategorie || "Boote",
          standort: entry.bundle.standort || "ohne Standort",
          bemerkung: entry.comment || "",
        });
      }
      (getSlotLinkedMaterialIds(slotId) || []).map(getItemById).filter(Boolean).forEach((item) => {
        materialRows.push({
          bereich: "Mitgezogen",
          platz: slotId,
          itemId: item.id,
          material: item.name,
          kategorie: item.kategorie || "Sonstiges",
          standort: item.standort || "ohne Standort",
          bemerkung: item.kategorie === "Ausleger" ? classifyAusleger(item) : "",
        });
      });
    });
  });

  boxItems.forEach((item) => {
    materialRows.push({
      bereich: "Materialbox",
      platz: "-",
      itemId: item.id,
      material: item.name,
      kategorie: item.kategorie || "Sonstiges",
      standort: item.standort || "ohne Standort",
      bemerkung: item.kategorie === "Ausleger" ? classifyAusleger(item) : "",
    });
  });

  printSchemaTableEl.innerHTML = renderPrintPositionedSchema(template, slotEntries);
  printMaterialTableEl.innerHTML = materialRows.length
    ? `
      <table class="export-material-table">
        <thead>
          <tr>
            <th>Kategorie</th>
            <th>Material</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const groupedRows = materialRows.reduce((acc, row) => {
              const category = row.kategorie || "Sonstiges";
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(row);
              return acc;
            }, {});
            const exportOrder = ["Boote", "Skulls", "Riemen", "Ausleger", "Rollsitze", "Sonstiges", "HÃ¼llen"];
            return exportOrder
              .filter((category) => groupedRows[category]?.length)
              .map((category) => {
                const rows = summarizeExportRows(groupedRows[category]);
                return `
                  <tr>
                    <td>${escapeHtml(category)}</td>
                    <td>
                      <ul>
                        ${rows
                          .map((row) => {
                            return `<li>${escapeHtml(row.label)}${row.meta ? ` <span class="subtle">(${escapeHtml(row.meta)})</span>` : ""}</li>`;
                          })
                          .join("")}
                      </ul>
                    </td>
                  </tr>
                `;
              })
              .join("");
          })()}
        </tbody>
      </table>
    `
    : '<div class="empty-state">Kein Material für den Export vorhanden.</div>';
}

function renderExportSlotCell(slotId, entry, compact = false) {
  const resolvedEntry = entry || resolveSlotEntry(slotId);
  if (!resolvedEntry) {
    return `<div class="export-slot-label">Platz ${escapeHtml(slotId)}</div>`;
  }

  const roleSuffix = resolvedEntry.slotRole ? ` · ${escapeHtml(resolvedEntry.slotRole)}` : "";
  const seatClass = getBoatSeatClassName(resolvedEntry.boat);

  return `
    <div class="export-slot-fill ${seatClass}">
      <div class="export-slot-label">Platz ${escapeHtml(slotId)}${roleSuffix}</div>
      <div class="export-slot-boat">
      <strong>${escapeHtml(resolvedEntry.boat.name)}</strong><br>${escapeHtml(getBoatExportType(resolvedEntry.boat))}
      </div>
    </div>
  `;
}

function renderExportHangGroup(slotIds, slotEntries) {
  return slotIds
    .filter(Boolean)
    .map((slotId) => renderExportSlotCell(slotId, slotEntries[slotId], true))
    .join("");
}

function renderPrintPositionedSchema(template, slotEntries) {
  return `
    <div class="export-schema-wrap">
      ${template.racks
        .map((rack, index) => {
          const isTop = index === 0 || rack.hang.length === 0;
          const hangPositions =
            rack.hang.length === 2 ? ["25%", "75%"] : rack.hang.length === 3 ? ["25%", "50%", "75%"] : ["50%"];

          return `
            <div class="export-schema-rack ${isTop ? "top-only" : ""}">
              ${
                !isTop
                  ? `
                    <div class="export-hang-grid">
                      ${rack.hang
                        .map(
                          (slotId, hangIndex) => `
                            <div
                              class="export-hang-slot ${rack.hang.length === 2 ? "two-hang" : ""}"
                              style="left:${hangPositions[hangIndex] || "50%"}"
                            >
                              <div class="export-schema-slot hang">${renderExportSlotCell(slotId, slotEntries[slotId], true)}</div>
                            </div>
                          `,
                        )
                        .join("")}
                    </div>
                  `
                  : ""
              }
              <div class="export-main-grid">
                ${rack.main
                  .map((slotId) => `<div class="export-schema-slot">${renderExportSlotCell(slotId, slotEntries[slotId])}</div>`)
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function formatNumberSequence(numbers) {
  const uniqueSorted = [...new Set(numbers)].sort((a, b) => a - b);
  const parts = [];

  for (let index = 0; index < uniqueSorted.length; ) {
    let end = index;
    while (end + 1 < uniqueSorted.length && uniqueSorted[end + 1] === uniqueSorted[end] + 1) {
      end += 1;
    }

    parts.push(end > index ? `${uniqueSorted[index]}-${uniqueSorted[end]}` : `${uniqueSorted[index]}`);
    index = end + 1;
  }

  return parts.join(",");
}

function summarizeExportRows(rows) {
  const grouped = new Map();
  const loose = [];

  rows.forEach((row) => {
    const item = row.itemId ? getItemById(row.itemId) : null;
    const match = String(row.material || "").match(/^(.*?)(?:\s+(\d+))$/);
    const groupKey = item?.set_id || item?.bundle_id || "";

    if (!item || !groupKey || !match || row.kategorie === "Boote") {
      loose.push({
        label: row.material,
        meta: [row.platz && row.platz !== "-" ? `Platz ${row.platz}` : "", row.bemerkung || ""].filter(Boolean).join(" · "),
      });
      return;
    }

    const baseName = match[1].trim();
    const number = Number(match[2]);
    const key = `${groupKey}__${baseName}__${row.bemerkung || ""}`;

    if (!grouped.has(key)) {
      grouped.set(key, { baseName, numbers: [], bemerkung: row.bemerkung || "" });
    }
    grouped.get(key).numbers.push(number);
  });

  const summarized = [...grouped.values()].map((entry) => ({
    label: `${entry.baseName} ${formatNumberSequence(entry.numbers)}`,
    meta: entry.bemerkung || "",
  }));

  return [...summarized, ...loose].sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "de"));
}

function renderDefaultSchemaTable(template, slotEntries) {
  const schemaRows = template.racks
    .map((rack) => {
      const hangHtml = rack.hang.length
        ? renderDefaultHangRow(rack.hang, slotEntries)
        : "";

      return `
        ${hangHtml}
        <tr>
          ${rack.main
            .map((slotId) => {
              const seatClass = getExportSlotCellClass(slotId, slotEntries[slotId]);
              return `<td colspan="2"${seatClass ? ` class="${seatClass}"` : ""}>${renderExportSlotCell(slotId, slotEntries[slotId])}</td>`;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");

  return `
    <table class="export-schema-table">
      <colgroup>
        <col><col><col><col><col><col><col><col>
      </colgroup>
      <tbody>${schemaRows}</tbody>
    </table>
  `;
}

function renderExcelSchemaTable(template, slotEntries) {
  return template.hangSlots === 3 ? renderExcelThreeHangSchema(template, slotEntries) : renderExcelTwoHangSchema(template, slotEntries);
}

function renderExcelTwoHangSchema(template, slotEntries) {
  const rows = [];

  for (let level = template.levels; level >= 1; level -= 1) {
    if (level !== template.levels) {
      rows.push(`
        <tr>
          <td class="${getExportSlotCellClass(`${level}.5`, slotEntries[`${level}.5`])}">${renderExportSlotCell(`${level}.5`, slotEntries[`${level}.5`], true)}</td>
          <td class="export-empty-cell"></td>
          <td class="${getExportSlotCellClass(`${level}.6`, slotEntries[`${level}.6`])}">${renderExportSlotCell(`${level}.6`, slotEntries[`${level}.6`], true)}</td>
          <td class="export-empty-cell"></td>
        </tr>
      `);
    }

    rows.push(`
      <tr>
        ${[`1`, `2`, `3`, `4`]
          .map((suffix) => {
            const slotId = `${level}.${suffix}`;
            const seatClass = getExportSlotCellClass(slotId, slotEntries[slotId]);
            return `<td${seatClass ? ` class="${seatClass}"` : ""}>${renderExportSlotCell(slotId, slotEntries[slotId])}</td>`;
          })
          .join("")}
      </tr>
    `);
  }

  return `
    <table class="export-schema-table">
      <colgroup><col><col><col><col></colgroup>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderExcelThreeHangSchema(template, slotEntries) {
  const rows = [];

  for (let level = template.levels; level >= 1; level -= 1) {
    if (level !== template.levels) {
      rows.push(`
        <tr>
          <td class="export-empty-cell"></td>
          <td class="${getExportSlotCellClass(`${level}.5`, slotEntries[`${level}.5`])}">${renderExportSlotCell(`${level}.5`, slotEntries[`${level}.5`], true)}</td>
          <td class="export-empty-cell"></td>
          <td class="${getExportSlotCellClass(`${level}.6`, slotEntries[`${level}.6`])}">${renderExportSlotCell(`${level}.6`, slotEntries[`${level}.6`], true)}</td>
          <td class="export-empty-cell"></td>
          <td class="${getExportSlotCellClass(`${level}.7`, slotEntries[`${level}.7`])}">${renderExportSlotCell(`${level}.7`, slotEntries[`${level}.7`], true)}</td>
          <td class="export-empty-cell"></td>
        </tr>
      `);
    }

    rows.push(`
      <tr>
        ${[`1`, `2`, `3`, `4`]
          .map((suffix, index) => {
            const slotId = `${level}.${suffix}`;
            const seatClass = getExportSlotCellClass(slotId, slotEntries[slotId]);
            return `<td${seatClass ? ` class="${seatClass}"` : ""}>${renderExportSlotCell(slotId, slotEntries[slotId])}</td>${index < 3 ? '<td class="export-empty-cell"></td>' : ""}`;
          })
          .join("")}
      </tr>
    `);
  }

  return `
    <table class="export-schema-table">
      <colgroup><col><col><col><col><col><col><col></colgroup>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderDefaultHangRow(hangSlots, slotEntries) {
  if (hangSlots.length === 2) {
    return `
      <tr>
        <td class="export-empty-cell"></td>
        <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[0], slotEntries[hangSlots[0]])}" colspan="3">${renderExportSlotCell(hangSlots[0], slotEntries[hangSlots[0]], true)}</td>
        <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[1], slotEntries[hangSlots[1]])}" colspan="3">${renderExportSlotCell(hangSlots[1], slotEntries[hangSlots[1]], true)}</td>
        <td class="export-empty-cell"></td>
      </tr>
    `;
  }

  if (hangSlots.length === 1) {
    return `
      <tr>
        <td class="export-empty-cell" colspan="2"></td>
        <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[0], slotEntries[hangSlots[0]])}" colspan="4">${renderExportSlotCell(hangSlots[0], slotEntries[hangSlots[0]], true)}</td>
        <td class="export-empty-cell" colspan="2"></td>
      </tr>
    `;
  }

  return `
    <tr>
      <td class="export-empty-cell"></td>
      <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[0], slotEntries[hangSlots[0]])}" colspan="2">${renderExportSlotCell(hangSlots[0], slotEntries[hangSlots[0]], true)}</td>
      <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[1], slotEntries[hangSlots[1]])}" colspan="2">${hangSlots[1] ? renderExportSlotCell(hangSlots[1], slotEntries[hangSlots[1]], true) : ""}</td>
      <td class="export-hang-cell ${getExportSlotCellClass(hangSlots[2], slotEntries[hangSlots[2]])}" colspan="2">${hangSlots[2] ? renderExportSlotCell(hangSlots[2], slotEntries[hangSlots[2]], true) : ""}</td>
      <td class="export-empty-cell"></td>
    </tr>
  `;
}

function renderMappe1SchemaTable(slotEntries) {
  const rows = [
    [{ slotId: "5.1" }, { slotId: "5.2" }, { slotId: "5.3" }, { slotId: "5.4" }],
    [{ slotId: "4.5", colspan: 2, compact: true }, { slotId: "4.6", colspan: 2, compact: true }],
    [{ slotId: "4.1" }, { slotId: "4.2" }, { slotId: "4.3" }, { slotId: "4.4" }],
    [{ slotId: "3.5", colspan: 2, compact: true }, { slotId: "3.6", colspan: 2, compact: true }],
    [{ slotId: "3.1" }, { slotId: "3.2" }, { slotId: "3.3" }, { slotId: "3.4" }],
    [{ slotId: "2.5", colspan: 2, compact: true }, { slotId: "2.6", colspan: 2, compact: true }],
    [{ slotId: "2.1" }, { slotId: "2.2" }, { slotId: "2.3" }, { slotId: "2.4" }],
    [{ slotId: "1.5", colspan: 2, compact: true }, { slotId: "1.6", colspan: 2, compact: true }],
    [{ slotId: "1.1" }, { slotId: "1.2" }, { slotId: "1.3" }, { slotId: "1.4" }],
  ];

  const body = rows
    .map(
      (row) => `
        <tr>
          ${row
            .map((cell) => {
              const colspan = cell.colspan || 1;
              const seatClass = cell.slotId ? getExportSlotCellClass(cell.slotId, slotEntries[cell.slotId]) : "";
              const classes = [cell.empty ? "export-empty-cell" : "", cell.compact ? "export-hang-cell" : "", seatClass]
                .filter(Boolean)
                .join(" ");
              const content = cell.slotId ? renderExportSlotCell(cell.slotId, slotEntries[cell.slotId], !!cell.compact) : "";
              return `<td${colspan > 1 ? ` colspan="${colspan}"` : ""}${classes ? ` class="${classes}"` : ""}>${content}</td>`;
            })
            .join("")}
        </tr>
      `,
    )
    .join("");

  return `<table class="export-schema-table"><tbody>${body}</tbody></table>`;
}

function updateStatusLegacy() {
  const boatCount = getResolvedSlotEntries().length;
  const materialCount = getMaterialBoxItems().length;
  statusTextEl.textContent = `${boatBundles.length} Boote · ${skullGroups.length} Skull-Sätze · ${sweepGroups.length} Riemen-Sätze · ${boatCount} Boote im Anhänger · ${materialCount} Materialien in der Box`;
}

function updateStatusOld() {
  const boatCount = getResolvedSlotEntries().length;
  const materialCount = getMaterialBoxItems().length;

  if (transientStatusMessage) {
    statusTextEl.textContent = transientStatusMessage.message;
    statusTextEl.classList.toggle("is-error", !!transientStatusMessage.isError);
    return;
  }

  statusTextEl.textContent = `${boatBundles.length} Boote · ${skullGroups.length} Skull-Sätze · ${sweepGroups.length} Riemen-Sätze · ${boatCount} Boote im Anhänger · ${materialCount} Materialien in der Box`;
  statusTextEl.classList.remove("is-error");
  statusTextEl.classList.remove("is-success");
}

function renderAll() {
  renderTrailerMeta();
  renderSourceList();
  renderTrailer();
  renderMaterialBox();
  renderSlotDetails();
  renderSummaryPanel();
  renderPrintExport();
  updateStatus();
}

function updateStatus() {
  const boatCount = getResolvedSlotEntries().length;
  const materialCount = getMaterialBoxItems().length;
  if (!statusTextEl) {
    return;
  }

  if (transientStatusMessage) {
    statusTextEl.textContent = transientStatusMessage.message;
    if (transientStatusMessage.isError) {
      statusTextEl.classList.add("is-error");
    } else {
      statusTextEl.classList.remove("is-error");
    }
    return;
  }

  statusTextEl.textContent = `${boatBundles.length} Boote · ${skullGroups.length} Skull-Sätze · ${sweepGroups.length} Riemen-Sätze · ${boatCount} Boote im Anhänger · ${materialCount} Materialien in der Box`;
  statusTextEl.classList.remove("is-error");
}

async function loadCurrentProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  currentUser = user || null;
  currentProfile = null;

  if (!currentUser) {
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from(T_PROFILES)
    .select("id, trailer_tool_unlocked, trailer_tool_unlocked_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  currentProfile = profile || null;
}

async function handleCheckoutReturn() {
  const currentUrl = new URL(window.location.href);
  const checkoutState = currentUrl.searchParams.get("paypal_checkout");
  const orderId = currentUrl.searchParams.get("token");

  if (!checkoutState) {
    return;
  }

  currentUrl.searchParams.delete("paypal_checkout");
  currentUrl.searchParams.delete("token");
  currentUrl.searchParams.delete("PayerID");
  window.history.replaceState({}, "", currentUrl.toString());

  if (checkoutState === "cancel") {
    setTransientStatus("Der PayPal-Kauf wurde abgebrochen.", true);
    return;
  }

  if (checkoutState !== "success" || !orderId) {
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
      body: { orderId },
    });

    if (error) {
      throw error;
    }

    if (!data?.unlocked) {
      throw new Error(data?.error || "Freischaltung konnte nicht bestätigt werden.");
    }

    await loadCurrentProfile();
    transientStatusMessage = { message: "Trailer-Tool erfolgreich freigeschaltet.", isError: false };
    updateStatus();
    statusTextEl?.classList.add("is-success");
  } catch (error) {
    console.error("PayPal-Freischaltung fehlgeschlagen.", error);
    setTransientStatus(`Freischaltung fehlgeschlagen: ${error.message || error}`, true);
  }
}

async function startPaypalCheckout() {
  if (!currentUser) {
    setTransientStatus("Bitte zuerst anmelden, damit die Freischaltung deinem Profil zugeordnet werden kann.", true);
    paywallDialog?.close();
    return;
  }

  startPaypalCheckoutEl.disabled = true;
  try {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set("paypal_checkout", "success");
    const cancelUrl = new URL(window.location.href);
    cancelUrl.searchParams.set("paypal_checkout", "cancel");

    const { data, error } = await supabase.functions.invoke("create-paypal-order", {
      body: {
        returnUrl: returnUrl.toString(),
        cancelUrl: cancelUrl.toString(),
        itemName: "TGSB-Materialverwaltung Trailer-Upgrade",
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.approvalUrl) {
      throw new Error(data?.error || "PayPal-Weiterleitung konnte nicht erzeugt werden.");
    }

    window.location.href = data.approvalUrl;
  } catch (error) {
    console.error("PayPal-Checkout konnte nicht gestartet werden.", error);
    if (paywallMessageEl) {
      paywallMessageEl.textContent = `PayPal konnte nicht gestartet werden: ${error.message || error}`;
    }
  } finally {
    startPaypalCheckoutEl.disabled = false;
  }
}

async function loadMaterialData() {
  statusTextEl.textContent = "Lade Material und Details aus Supabase...";

  const [{ data: materialRows, error: materialError }, { data: detailsRows, error: detailsError }] = await Promise.all([
    supabase.from(T_MATERIAL).select("id, name, kategorie, standort, bundle_id, set_id, created_at"),
    supabase.from(T_DETAILS).select("material_id, values"),
  ]);

  if (materialError) {
    throw materialError;
  }

  if (detailsError) {
    throw detailsError;
  }

  materials = (materialRows || []).map((row) => ({
    ...row,
    standort: normalizeStandortKey(row.standort),
  }));

  detailsByMaterialId = Object.fromEntries((detailsRows || []).map((row) => [row.material_id, row.values || {}]));
  buildBoatBundles();
  skullGroups = buildCategoryGroups("Skulls");
  sweepGroups = buildCategoryGroups("Riemen");
}

function sanitizeLocalState() {
  Object.keys(planningByTrailer).forEach((trailerId) => {
    const validSlots = new Set(getTrailerTemplate(trailerId).racks.flatMap((rack) => [...rack.main, ...rack.hang]));
    const plan = getTrailerPlanning(trailerId);

    Object.keys(plan).forEach((slotId) => {
      const entry = plan[slotId];
      const hasBoat = !!entry?.boatId;
      const hasComment = !!entry?.comment;
      if (!validSlots.has(slotId)) {
        delete plan[slotId];
        return;
      }
      if (hasBoat && !getBoatBundleByBoatId(entry.boatId)) {
        delete plan[slotId];
        return;
      }
      if (!hasBoat && !hasComment) {
        delete plan[slotId];
      }
    });
  });

  Object.keys(materialBoxByTrailer).forEach((trailerId) => {
    const state = getMaterialBoxState(trailerId);

    state.manualItemIds = (state.manualItemIds || []).filter((itemId) => {
      const item = getItemById(itemId);
      return item && item.kategorie !== "Boote";
    });

    Object.keys(state.slotLinked || {}).forEach((slotId) => {
      state.slotLinked[slotId] = (state.slotLinked[slotId] || []).filter((itemId) => {
        const item = getItemById(itemId);
        return item && item.kategorie !== "Boote";
      });

      if (state.slotLinked[slotId].length === 0) {
        delete state.slotLinked[slotId];
      }
    });
  });
}

async function refreshAll() {
  try {
    await loadCurrentProfile();
    await loadMaterialData();
    await handleCheckoutReturn();
    sanitizeLocalState();
    renderTrailerSelect();
    renderAll();
    saveLocalState();
  } catch (error) {
    console.error("Trailer-Daten konnten nicht geladen werden.", error);
    statusTextEl.textContent = `Fehler beim Laden: ${error.message || error}`;
    bundleListEl.innerHTML = '<div class="empty-state">Materialdaten konnten nicht geladen werden.</div>';
    trailerContainerEl.innerHTML = '<div class="empty-state">Schema konnte nicht aufgebaut werden.</div>';
    materialBoxEl.innerHTML = '<div class="empty-state">Materialbox nicht verfügbar.</div>';
    slotDetailsPanelEl.innerHTML = "";
    trailerSummaryPanelEl.innerHTML = "";
  }
}

function initEventListeners() {
  trailerSelectEl.addEventListener("change", () => {
    selectedTrailerId = trailerSelectEl.value;
    selectedSlotId = null;
    saveLocalState();
    renderAll();
  });

  trailerPurposeEl.addEventListener("input", () => {
    getTrailerMeta().zweck = trailerPurposeEl.value;
    saveLocalState();
    renderTrailerMeta();
  });

  bundleSearchEl.addEventListener("input", renderSourceList);
  sourceStandortFilterEl.addEventListener("change", renderSourceList);

  clearTrailerBtnEl.addEventListener("click", () => {
    if (!window.confirm("Diesen Anhänger wirklich komplett leeren?")) {
      return;
    }

    planningByTrailer[selectedTrailerId] = {};
    materialBoxByTrailer[selectedTrailerId] = { manualItemIds: [], slotLinked: {} };
    selectedSlotId = null;
    saveLocalState();
    renderAll();
  });

  reloadBtnEl.addEventListener("click", refreshAll);
  assignStandortBtnEl.addEventListener("click", openTrailerStandortDialog);
  unloadTrailerBtnEl.addEventListener("click", openUnloadDialog);
  exportPdfBtnEl.addEventListener("click", () => window.print());

  cancelBundleDialogEl.addEventListener("click", () => {
    pendingBoatDrop = null;
    bundleDialog.close();
  });

  confirmBundleDialogEl.addEventListener("click", applyPendingBoatDrop);
  closePaywallDialogEl?.addEventListener("click", () => {
    pendingUpgradeBoatId = null;
    paywallDialog?.close();
  });
  startPaypalCheckoutEl?.addEventListener("click", startPaypalCheckout);
  cancelMaterialBundleDialogEl.addEventListener("click", () => {
    pendingMaterialBundleDrop = null;
    materialBundleDialog.close();
  });
  confirmMaterialBundleDialogEl.addEventListener("click", confirmMaterialBundleDialog);
  materialBundleSelectAllEl.addEventListener("change", () => {
    const nextChecked = materialBundleSelectAllEl.checked;
    materialBundleSelectAllEl.indeterminate = false;
    materialBundleDialogListEl.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((inputEl) => {
      inputEl.checked = nextChecked;
    });
  });

  slotSearchInputEl.addEventListener("input", renderSlotDialogResults);
  cancelSlotDialogEl.addEventListener("click", closeSlotDialog);
  saveSlotDialogEl.addEventListener("click", saveSlotDialog);
  removeSlotBoatBtnEl.addEventListener("click", removeBoatFromCurrentSlot);
  slotDialog.addEventListener("close", () => {
    currentSlotDialogId = null;
  });
  materialBundleDialog.addEventListener("close", () => {
    pendingMaterialBundleDrop = null;
    materialBundleSelectAllEl.checked = true;
    materialBundleSelectAllEl.indeterminate = false;
  });
  cancelUnloadDialogEl.addEventListener("click", () => unloadDialog.close());
  confirmUnloadDialogEl.addEventListener("click", confirmUnloadDialog);
  unloadSelectAllEl.addEventListener("change", () => {
    const nextChecked = unloadSelectAllEl.checked;
    unloadSelectAllEl.indeterminate = false;
    unloadSelectionListEl.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((inputEl) => {
      inputEl.checked = nextChecked;
    });
  });
  unloadDialog.addEventListener("close", () => {
    pendingUnloadItems = [];
    unloadSelectAllEl.checked = true;
    unloadSelectAllEl.indeterminate = false;
  });

  cancelAssignStandortEl.addEventListener("click", () => assignStandortDialog.close());
  confirmAssignStandortEl.addEventListener("click", confirmTrailerStandort);
  editBulkConfirmEl.addEventListener("click", () => {
    bulkConfirmDialog.close();
    if (pendingStandortChange?.mode === "unload") {
      openUnloadDialog();
      return;
    }
    openTrailerStandortDialog();
  });
  cancelBulkConfirmEl.addEventListener("click", () => {
    pendingStandortChange = null;
    bulkConfirmDialog.close();
  });
  applyBulkConfirmEl.addEventListener("click", applyAssignStandort);
  closeMaterialInfoEl.addEventListener("click", () => materialInfoDialog.close());
}

function init() {
  if (!bundleListEl || !trailerSelectEl || !trailerContainerEl || !materialBoxEl) {
    return;
  }

  loadLocalState();
  initEventListeners();
  renderTrailerSelect();
  renderTrailerMeta();
  refreshAll();
}

init();
