import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { kategorien, standorte, BOOT_CAPACITY_BY_STANDORT, normalizeStandortKey } from "../lib/schema";
import { extractLastNumber } from "../lib/sort";

export default function MaterialList({
  material,
  detailsByMaterialId,
  updateStandort,
  openDeleteDialog,
  setOpenHistoryId,
  showAdmin,
  canEditStandort = false,
  canViewHistory = false,
  loadHistory,
  onOpenDetails,
  selectedIds,
  toggleSelect,
  selectSet,
  selectBundle,
  selectPair,
}) {
  const [search, setSearch] = useState("");
  const [filterKategorie, setFilterKategorie] = useState("Alle");

  const [openStandorte, setOpenStandorte] = useState(() => new Set());
  const [openCategories, setOpenCategories] = useState(() => ({}));
  const [openBundles, setOpenBundles] = useState(() => ({}));
  const [openAuslegerGroups, setOpenAuslegerGroups] = useState(() => ({}));
  const [openRollsitzeBundles, setOpenRollsitzeBundles] = useState(() => ({}));

  const [movingTransport, setMovingTransport] = useState(null);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [highlightStandort, setHighlightStandort] = useState(null);

  const mapRef = useRef(null);
  const standortRefs = useRef({});

  const tableCategories = useMemo(
    () => ["Boote", "Skulls", "Riemen", "Ausleger", "Hüllen", "Rollsitze", "Sonstiges"],
    []
  );

  const toggleButtonStyle = useMemo(
    () => ({
      padding: "4px 10px",
      fontSize: 12,
      borderRadius: 8,
      cursor: "pointer",
      color: "inherit",
      background: "var(--toggle-btn-bg, rgba(0,0,0,0.06))",
      border: "1px solid var(--toggle-btn-border, rgba(0,0,0,0.14))",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      transition: "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
    }),
    []
  );

  const groupedByStandort = useMemo(() => {
    const grouped = {};
    (material || []).forEach((item) => {
      if (!grouped[item.standort]) grouped[item.standort] = [];
      grouped[item.standort].push(item);
    });
    return grouped;
  }, [material]);

  useEffect(() => {
    const standortKeys = Object.keys(groupedByStandort || {});
    if (standortKeys.length === 0) return;

    setOpenCategories((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next = {};
      for (const s of standortKeys) {
        for (const c of tableCategories) next[`${s}__${c}`] = true;
      }
      return next;
    });
  }, [groupedByStandort, tableCategories]);

  const classifyAusleger = useCallback(
    (item) => {
      const typ = (detailsByMaterialId?.[item.id]?.typ || "").toLowerCase();
      const name = (item.name || "").toLowerCase();

      const isSkull = typ === "skull" || name.includes("skullausleger");
      const isRiemen = typ === "riemen" || name.includes("riemenausleger");

      if (isSkull) return "skull";
      if (isRiemen) return "riemen";
      return "other";
    },
    [detailsByMaterialId]
  );

  const boatNameByBundleId = useMemo(() => {
    const map = {};
    for (const m of material || []) {
      if (m.kategorie === "Boote" && m.bundle_id) {
        map[m.bundle_id] = m.name || "Boot";
      }
    }
    return map;
  }, [material]);

  const boatIdByBundleId = useMemo(() => {
    const map = {};
    for (const m of material || []) {
      if (m.kategorie === "Boote" && m.bundle_id) {
        map[m.bundle_id] = m.id;
      }
    }
    return map;
  }, [material]);

  const auslegerByBundleId = useMemo(() => {
    const map = {};
    for (const it of material || []) {
      if (it.kategorie !== "Ausleger" || !it.bundle_id) continue;
      if (!map[it.bundle_id]) map[it.bundle_id] = { skull: false, riemen: false };

      const kind = classifyAusleger(it);
      if (kind === "skull") map[it.bundle_id].skull = true;
      if (kind === "riemen") map[it.bundle_id].riemen = true;
    }
    return map;
  }, [classifyAusleger, material]);

  const getBoatSeats = useCallback(
    (id) => {
      const value = detailsByMaterialId?.[id]?.plaetze;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    },
    [detailsByMaterialId]
  );

  const boatBadgeText = useCallback(
    (boatItem) => {
      if (!boatItem || boatItem.kategorie !== "Boote") return "";

      const seats = detailsByMaterialId?.[boatItem.id]?.plaetze;
      const parsedSeats = Number.isFinite(Number(seats)) ? Number(seats) : null;
      if (!parsedSeats) return "";

      const steer = !!detailsByMaterialId?.[boatItem.id]?.steuermann_verfuegbar;
      const bundle = boatItem.bundle_id ? auslegerByBundleId[boatItem.bundle_id] : null;
      const hasSkull = !!bundle?.skull;
      const hasRiemen = !!bundle?.riemen;

      let marker = "";
      if (hasSkull && hasRiemen) marker = "x/-";
      else if (hasSkull) marker = "x";
      else if (hasRiemen) marker = "-";

      return `${parsedSeats}${marker}${steer ? "+" : ""}`;
    },
    [auslegerByBundleId, detailsByMaterialId]
  );

  const addBundleToSelection = useCallback(
    (bundleId) => {
      if (!canEditStandort || !bundleId) return;

      const ids = (material || [])
        .filter((m) => m.bundle_id === bundleId)
        .map((m) => m.id);

      for (const id of ids) {
        if (!selectedIds?.has?.(id)) {
          toggleSelect(id, true);
        }
      }

      if (typeof selectBundle === "function") {
        selectBundle(bundleId);
      }
    },
    [canEditStandort, material, selectBundle, selectedIds, toggleSelect]
  );

  const filterFn = useCallback(
    (item) => {
      const query = search.toLowerCase().trim();
      const badge = item.kategorie === "Boote" ? boatBadgeText(item) : "";
      const haystack = `${item.name || ""} ${badge}`.toLowerCase();
      const matchesSearch = haystack.includes(query);
      const matchesCategory = filterKategorie === "Alle" || item.kategorie === filterKategorie;
      return matchesSearch && matchesCategory;
    },
    [boatBadgeText, filterKategorie, search]
  );

  const boatOccupancyByStandort = useMemo(() => {
    const result = {};
    for (const [standortName, items] of Object.entries(groupedByStandort || {})) {
      const boats = (items || []).filter((m) => m.kategorie === "Boote");
      const usedByClass = {};
      for (const boat of boats) {
        const seats = Number(detailsByMaterialId?.[boat.id]?.plaetze);
        if (!Number.isFinite(seats)) continue;
        usedByClass[seats] = (usedByClass[seats] || 0) + 1;
      }
      result[standortName] = usedByClass;
    }
    return result;
  }, [detailsByMaterialId, groupedByStandort]);

  const totalCapacityByStandort = useMemo(() => {
    const result = {};
    for (const s of standorte) {
      const key = normalizeStandortKey(s);
      const capObj = BOOT_CAPACITY_BY_STANDORT?.[key] || {};
      result[s] = Object.values(capObj).reduce((sum, n) => sum + Number(n || 0), 0);
    }
    return result;
  }, []);

  const usedBoatSlotsByStandort = useMemo(() => {
    const result = {};
    for (const [standortName, items] of Object.entries(groupedByStandort || {})) {
      result[standortName] = (items || []).filter((m) => m.kategorie === "Boote").length;
    }
    return result;
  }, [groupedByStandort]);

  function getStandortFillPercent(standortName) {
    const used = usedBoatSlotsByStandort?.[standortName] || 0;
    const cap = totalCapacityByStandort?.[standortName] || 0;
    if (!cap) return 0;
    return Math.max(0, Math.min(100, Math.round((used / cap) * 100)));
  }

  function getFillColor(percent) {
    if (percent < 50) return "linear-gradient(90deg, #22c55e, #4ade80)";
    if (percent < 80) return "linear-gradient(90deg, #f59e0b, #facc15)";
    return "linear-gradient(90deg, #ef4444, #f97316)";
  }

  const standortMapLayout = {
    BRG: { top: "22%", left: "18%" },
    SRV: { top: "22%", left: "72%" },
    Fühlingen: { top: "74%", left: "28%" },
    Extern: { top: "74%", left: "78%" },
  };

  const roadLines = [
    { x1: 18, y1: 22, x2: 72, y2: 22 },
    { x1: 18, y1: 22, x2: 28, y2: 74 },
    { x1: 72, y1: 22, x2: 78, y2: 74 },
    { x1: 28, y1: 74, x2: 78, y2: 74 },
  ];

  function getStandortCenter(standortName) {
    const mapEl = mapRef.current;
    const nodeEl = standortRefs.current[standortName];
    if (!mapEl || !nodeEl) return null;

    const mapRect = mapEl.getBoundingClientRect();
    const nodeRect = nodeEl.getBoundingClientRect();

    return {
      x: nodeRect.left - mapRect.left + nodeRect.width / 2,
      y: nodeRect.top - mapRect.top + nodeRect.height / 2,
    };
  }

  async function animateTransport(item, newStandort) {
    if (!canEditStandort) return;

    const from = getStandortCenter(item.standort);
    const to = getStandortCenter(newStandort);

    if (!from || !to) {
      await updateStandort(item, newStandort);
      return;
    }

    setHighlightStandort(newStandort);
    setMovingTransport({
      name: item.name,
      fromStandort: item.standort,
      toStandort: newStandort,
    });

    setVehiclePos({
      x: from.x - 46,
      y: from.y - 20,
      scale: 1,
      rotate: 0,
      opacity: 1,
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    setVehiclePos({
      x: to.x - 46,
      y: to.y - 20,
      scale: 1.05,
      rotate: angle,
      opacity: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    await updateStandort(item, newStandort);
    await new Promise((resolve) => setTimeout(resolve, 180));

    setVehiclePos((prev) => (prev ? { ...prev, opacity: 0, scale: 0.95 } : null));
    await new Promise((resolve) => setTimeout(resolve, 240));

    setMovingTransport(null);
    setVehiclePos(null);
    setHighlightStandort(null);
  }

  async function handleStandortChange(item, newStandort) {
    if (!canEditStandort) return;
    if (item.standort === newStandort) return;
    await animateTransport(item, newStandort);
  }

  function renderNameWithBoatBadge(item) {
    return (
      <span>
        {item.name}
        {item.kategorie === "Boote" && boatBadgeText(item) ? (
          <span style={{ opacity: 0.8, marginLeft: 6, fontSize: 12, color: "#ffe7a3" }}>
            ({boatBadgeText(item)})
          </span>
        ) : null}
      </span>
    );
  }

  function sortCatItems(cat, items) {
    if (cat === "Boote") {
      return [...items].sort((a, b) => {
        const sa = getBoatSeats(a.id);
        const sb = getBoatSeats(b.id);
        if (sa == null && sb == null) return (a.name || "").localeCompare(b.name || "");
        if (sa == null) return 1;
        if (sb == null) return -1;
        if (sa !== sb) return sa - sb;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    if (cat === "Skulls" || cat === "Riemen") {
      return [...items].sort((a, b) => {
        const na = extractLastNumber(a.name) ?? 999999;
        const nb = extractLastNumber(b.name) ?? 999999;
        if (na !== nb) return na - nb;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    return [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  const toggleStandortOpen = (standortName) => {
    setOpenStandorte((prev) => {
      const next = new Set(prev);
      if (next.has(standortName)) next.delete(standortName);
      else next.add(standortName);
      return next;
    });
  };

  const toggleCategoryOpen = (standortName, cat) => {
    const key = `${standortName}__${cat}`;
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleBundleOpen = (bundleId) => {
    setOpenBundles((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }));
  };

  const toggleAuslegerGroupOpen = (bundleId, group) => {
    const key = `${bundleId}__${group}`;
    setOpenAuslegerGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRollsitzeBundleOpen = (bundleId) => {
    setOpenRollsitzeBundles((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }));
  };

  function getBundleDisplayName(cat, itemsInBundle) {
    const first = itemsInBundle?.[0]?.name || "";
    if (!first) return "Unbenannt";

    if (cat === "Skulls" || cat === "Riemen") {
      return first.replace(/\s+\d+\s*$/, "").trim() || first;
    }

    if (cat === "Ausleger" || cat === "Rollsitze") {
      const bundleId = itemsInBundle?.[0]?.bundle_id;
      if (bundleId && boatNameByBundleId[bundleId]) return boatNameByBundleId[bundleId];
    }

    return first;
  }

  function groupByBundle(items) {
    const map = {};
    for (const it of items) {
      const key = it.bundle_id || `__no_bundle__${it.id}`;
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }

  function renderRow(item) {
    return (
      <tr key={item.id}>
        <td>
          {canEditStandort ? (
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={(e) => toggleSelect(item.id, e.target.checked)}
            />
          ) : (
            <span style={{ opacity: 0.45 }}>—</span>
          )}
        </td>

        <td>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {renderNameWithBoatBadge(item)}

              {item.kategorie === "Boote" && item.bundle_id && canEditStandort && (
                <button
                  style={{
                    padding: "2px 8px",
                    fontSize: 12,
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "inherit",
                    background: "var(--toggle-btn-bg, rgba(0,0,0,0.06))",
                    border: "1px solid var(--toggle-btn-border, rgba(0,0,0,0.14))",
                  }}
                  onClick={() => addBundleToSelection(item.bundle_id)}
                  title="Boot + gesamtes Bundle auswählen"
                >
                  Bundle
                </button>
              )}
            </div>
          </div>
        </td>

        <td>
          <select
            value={item.standort}
            onChange={(e) => handleStandortChange(item, e.target.value)}
            disabled={!canEditStandort}
          >
            {standorte.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>

        <td>
          <button onClick={() => onOpenDetails(item.id)}>ℹ️</button>
        </td>

        <td>
          {canViewHistory ? (
            <button
              onClick={async () => {
                await loadHistory(item.id);
                setOpenHistoryId(item.id);
              }}
            >
              Verlauf
            </button>
          ) : (
            <span style={{ opacity: 0.45 }}>—</span>
          )}
        </td>

        {showAdmin && (
          <td>
            <button className="delete" onClick={() => openDeleteDialog(item)}>
              Löschen
            </button>
          </td>
        )}
      </tr>
    );
  }

  function renderBundleRows(catItems, cat) {
    const sorted = sortCatItems(cat, catItems);
    const grouped = groupByBundle(sorted);

    const bundleKeys = Object.keys(grouped).sort((a, b) => {
      const aNo = a.startsWith("__no_bundle__");
      const bNo = b.startsWith("__no_bundle__");
      if (aNo && !bNo) return 1;
      if (!aNo && bNo) return -1;
      const aName = (grouped[a]?.[0]?.name || "").toString();
      const bName = (grouped[b]?.[0]?.name || "").toString();
      return aName.localeCompare(bName);
    });

    const rows = [];

    for (const bundleKey of bundleKeys) {
      const isRealBundle = !bundleKey.startsWith("__no_bundle__");
      const list = grouped[bundleKey] || [];
      const isOpen = isRealBundle ? !!openBundles[bundleKey] : true;
      const isRollsitzeOpen = isRealBundle ? !!openRollsitzeBundles[bundleKey] : true;

      let auslegerSeats = null;
      let auslegerHasBothTypes = false;

      if (cat === "Ausleger" && isRealBundle) {
        const boatId = boatIdByBundleId[bundleKey];
        auslegerSeats = boatId ? getBoatSeats(boatId) : null;
        const flags = auslegerByBundleId?.[bundleKey] || { skull: false, riemen: false };
        auslegerHasBothTypes = !!flags.skull && !!flags.riemen;
      }

      let rollsitzeSeats = null;
      if (cat === "Rollsitze" && isRealBundle) {
        const boatId = boatIdByBundleId[bundleKey];
        rollsitzeSeats = boatId ? getBoatSeats(boatId) : null;
      }

      const suppressBundleHeader =
        isRealBundle &&
        ((cat === "Riemen" && list.length === 1) ||
          (cat === "Ausleger" && auslegerSeats === 1) ||
          (cat === "Rollsitze" && rollsitzeSeats === 1));

      if (isRealBundle && !suppressBundleHeader) {
        const count = list.length;
        const isHeaderOpen = cat === "Rollsitze" ? isRollsitzeOpen : isOpen;
        const onToggle = cat === "Rollsitze" ? () => toggleRollsitzeBundleOpen(bundleKey) : () => toggleBundleOpen(bundleKey);

        rows.push(
          <tr key={`bundle-header-${cat}-${bundleKey}`}>
            <td colSpan={showAdmin ? 6 : 5} style={{ background: "rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px", flexWrap: "wrap" }}>
                <button
                  onClick={onToggle}
                  style={toggleButtonStyle}
                  className="toggle-btn"
                  title="Bundle auf-/zuklappen"
                >
                  {isHeaderOpen ? "▼" : "▶"}
                </button>

                <div style={{ fontWeight: 700, opacity: 0.95 }}>
                  {getBundleDisplayName(cat, list)} — {count} {count === 1 ? "Element" : "Elemente"}
                </div>

                {(cat === "Skulls" || cat === "Riemen") && canEditStandort && (
                  <button
                    style={{
                      padding: "2px 8px",
                      fontSize: 12,
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "inherit",
                      background: "var(--toggle-btn-bg, rgba(0,0,0,0.06))",
                      border: "1px solid var(--toggle-btn-border, rgba(0,0,0,0.14))",
                    }}
                    onClick={() => selectBundle(bundleKey)}
                    title="Satz auswählen"
                  >
                    Satz auswählen
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      }

      if (!suppressBundleHeader) {
        if (cat === "Rollsitze") {
          if (!isRollsitzeOpen) continue;
        } else if (!isOpen) {
          continue;
        }
      }

      if (cat === "Rollsitze" && isRealBundle) {
        for (const it of sortCatItems("Rollsitze", list)) rows.push(renderRow(it));
        continue;
      }

      if (cat === "Ausleger" && isRealBundle) {
        if (auslegerSeats === 1 || !auslegerHasBothTypes) {
          for (const it of sortCatItems("Ausleger", list)) rows.push(renderRow(it));
          continue;
        }

        const skull = [];
        const riemen = [];
        const other = [];

        for (const it of list) {
          const kind = classifyAusleger(it);
          if (kind === "skull") skull.push(it);
          else if (kind === "riemen") riemen.push(it);
          else other.push(it);
        }

        const sections = [
          { key: "skull", label: "Skullausleger", items: skull },
          { key: "riemen", label: "Riemenausleger", items: riemen },
          { key: "other", label: "Sonstige Ausleger", items: other },
        ];

        for (const sec of sections) {
          if (!sec.items.length) continue;

          const gKey = `${bundleKey}__${sec.key}`;
          const gOpen = !!openAuslegerGroups[gKey];

          rows.push(
            <tr key={`ausleger-subheader-${bundleKey}-${sec.key}`}>
              <td colSpan={showAdmin ? 6 : 5} style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleAuslegerGroupOpen(bundleKey, sec.key)}
                    style={toggleButtonStyle}
                    className="toggle-btn"
                    title="Gruppe auf-/zuklappen"
                  >
                    {gOpen ? "▼" : "▶"}
                  </button>

                  <div style={{ fontWeight: 600, opacity: 0.9 }}>
                    {sec.label} — {sec.items.length}
                  </div>
                </div>
              </td>
            </tr>
          );

          if (!gOpen) continue;
          for (const it of sortCatItems("Ausleger", sec.items)) rows.push(renderRow(it));
        }

        continue;
      }

      for (const item of list) rows.push(renderRow(item));
    }

    return rows;
  }

  return (
    <div>
      <style>{`
        @keyframes pulseTarget {
          0% { box-shadow: 0 0 0 0 rgba(92,160,255,0.26), 0 18px 34px rgba(92,160,255,0.16); }
          70% { box-shadow: 0 0 0 12px rgba(92,160,255,0), 0 18px 34px rgba(92,160,255,0.22); }
          100% { box-shadow: 0 0 0 0 rgba(92,160,255,0), 0 18px 34px rgba(92,160,255,0.16); }
        }

        .material-table tbody tr {
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .material-table tbody tr:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.035);
          box-shadow: 0 10px 18px rgba(0,0,0,0.10);
        }

        .toggle-btn {
          color: inherit;
          background: var(--toggle-btn-bg, rgba(0,0,0,0.06)) !important;
          border: 1px solid var(--toggle-btn-border, rgba(0,0,0,0.14)) !important;
        }

        .toggle-btn:hover {
          background: var(--toggle-btn-bg-hover, rgba(0,0,0,0.10)) !important;
          transform: translateY(-1px);
        }

        :root {
          --toggle-btn-bg: rgba(0,0,0,0.06);
          --toggle-btn-bg-hover: rgba(0,0,0,0.10);
          --toggle-btn-border: rgba(0,0,0,0.14);
        }

        .dark {
          --toggle-btn-bg: rgba(255,255,255,0.08);
          --toggle-btn-bg-hover: rgba(255,255,255,0.14);
          --toggle-btn-border: rgba(255,255,255,0.14);
        }
      `}</style>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Suche & Filter</h3>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              {canEditStandort ? "Standortänderungen und Sammelauswahl aktiv." : "Lesemodus für Besucher aktiv."}
            </div>
          </div>
        </div>

        <div
          ref={mapRef}
          style={{
            position: "relative",
            minHeight: 300,
            marginTop: 14,
            borderRadius: 20,
            overflow: "hidden",
            background:
              "radial-gradient(circle at 20% 20%, rgba(93,169,255,0.20), transparent 26%), radial-gradient(circle at 80% 30%, rgba(255,159,67,0.14), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              opacity: 0.55,
              pointerEvents: "none",
            }}
          />

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.7 }}
          >
            {roadLines.map((line, idx) => (
              <g key={idx}>
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.10)" strokeWidth="1.8" strokeLinecap="round" />
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.38)" strokeWidth="0.35" strokeDasharray="1.8 1.8" strokeLinecap="round" />
              </g>
            ))}
          </svg>

          {standorte.map((standortName) => {
            const items = groupedByStandort[standortName] || [];
            const boats = items.filter((m) => m.kategorie === "Boote").length;
            const pos = standortMapLayout[standortName] || { top: "50%", left: "50%" };
            const fillPercent = getStandortFillPercent(standortName);

            return (
              <div
                key={standortName}
                ref={(el) => {
                  standortRefs.current[standortName] = el;
                }}
                style={{
                  position: "absolute",
                  transform: highlightStandort === standortName ? "translate(-50%, -50%) scale(1.05)" : "translate(-50%, -50%)",
                  top: pos.top,
                  left: pos.left,
                  minWidth: 180,
                  padding: "14px 16px",
                  borderRadius: 20,
                  background: "rgba(20,28,48,0.84)",
                  border: highlightStandort === standortName ? "1px solid rgba(92,160,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: highlightStandort === standortName ? "0 18px 34px rgba(92,160,255,0.18)" : "0 12px 22px rgba(0,0,0,0.18)",
                  backdropFilter: "blur(6px)",
                  display: "grid",
                  gap: 7,
                  textAlign: "center",
                  color: "#eef4ff",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  animation: highlightStandort === standortName ? "pulseTarget 1.15s ease-in-out infinite" : "none",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>{standortName}</div>
                <div style={{ fontSize: 12, opacity: 0.82 }}>{items.length} Material</div>
                <div style={{ fontSize: 11, opacity: 0.72 }}>{boats} Boote</div>

                <div
                  style={{
                    width: "100%",
                    height: 12,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.26)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${fillPercent}%`,
                      borderRadius: 999,
                      transition: "width 0.35s ease",
                      background: getFillColor(fillPercent),
                    }}
                  />
                </div>

                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700 }}>{fillPercent}% belegt</div>
              </div>
            );
          })}

          {movingTransport && vehiclePos && (
            <div
              style={{
                position: "absolute",
                width: 92,
                height: 40,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, #ffe08b 0%, #ffb547 100%)",
                boxShadow: "0 10px 18px rgba(0,0,0,0.22)",
                transition: "transform 1.2s ease-in-out, opacity 0.24s ease-in-out",
                pointerEvents: "none",
                zIndex: 20,
                color: "#382100",
                fontWeight: 900,
                fontSize: 18,
                opacity: vehiclePos.opacity,
                transform: `translate(${vehiclePos.x}px, ${vehiclePos.y}px) rotate(${vehiclePos.rotate}deg) scale(${vehiclePos.scale})`,
              }}
            >
              🚗🛻
              <div
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: 11,
                  color: "#fff2d2",
                  background: "rgba(0,0,0,0.38)",
                  padding: "4px 8px",
                  borderRadius: 999,
                }}
              >
                {movingTransport.name}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 220px", gap: 12, marginTop: 16 }}>
          <input
            placeholder="🔎 Suche nach Name / z.B. 4x/-+ / Riemenlänge ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <select
            value={filterKategorie}
            onChange={(e) => setFilterKategorie(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            {kategorien.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {Object.keys(groupedByStandort).map((standortName) => {
        const itemsAll = groupedByStandort[standortName].filter(filterFn);
        const standortOpen = openStandorte.has(standortName);

        const capObj = BOOT_CAPACITY_BY_STANDORT?.[normalizeStandortKey(standortName)] || {};
        const usedObj = boatOccupancyByStandort?.[standortName] || {};
        const capClasses = Object.keys(capObj)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => a - b);

        return (
          <div key={standortName} className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => toggleStandortOpen(standortName)}
                  style={toggleButtonStyle}
                  className="toggle-btn"
                  title="Standort auf-/zuklappen"
                >
                  {standortOpen ? "▼" : "▶"}
                </button>

                <h2 style={{ margin: 0 }}>Standort: {standortName}</h2>
                <span style={{ opacity: 0.75 }}>({itemsAll.length})</span>
              </div>
            </div>

            {capClasses.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                <strong>Bootsplätze:</strong>{" "}
                {capClasses.map((cls, idx) => {
                  const used = usedObj[cls] || 0;
                  const cap = capObj[cls];
                  return (
                    <span key={cls}>
                      {idx > 0 ? " • " : ""}
                      {cls}er {used}/{cap}
                    </span>
                  );
                })}
              </div>
            )}

            {!standortOpen ? null : (
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: 12 }}>
                {tableCategories.map((cat) => {
                  const catKey = `${standortName}__${cat}`;
                  const catOpen = !!openCategories[catKey];
                  const catItems = itemsAll.filter((i) => i.kategorie === cat);

                  return (
                    <div key={cat} style={{ flex: "1 1 360px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <h3 style={{ margin: 0 }}>
                          {cat} <span style={{ opacity: 0.7 }}>({catItems.length})</span>
                        </h3>

                        <button
                          onClick={() => toggleCategoryOpen(standortName, cat)}
                          style={toggleButtonStyle}
                          className="toggle-btn"
                          title="Kategorie auf-/zuklappen"
                        >
                          {catOpen ? "▼" : "▶"}
                        </button>
                      </div>

                      {!catOpen ? null : (
                        <table className="material-table" style={{ marginTop: 8, width: "100%" }}>
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>✓</th>
                              <th>Name</th>
                              <th>Standort</th>
                              <th>Info</th>
                              <th>Verlauf</th>
                              {showAdmin && <th>Löschen</th>}
                            </tr>
                          </thead>

                          <tbody>
                            {cat === "Skulls" || cat === "Riemen" || cat === "Ausleger" || cat === "Rollsitze" ? (
                              catItems.length > 0 ? (
                                renderBundleRows(catItems, cat)
                              ) : (
                                <tr>
                                  <td colSpan={showAdmin ? 6 : 5} style={{ opacity: 0.5 }}>
                                    Keine Einträge
                                  </td>
                                </tr>
                              )
                            ) : (
                              <>
                                {sortCatItems(cat, catItems).map((item) => renderRow(item))}
                                {catItems.length === 0 && (
                                  <tr>
                                    <td colSpan={showAdmin ? 6 : 5} style={{ opacity: 0.5 }}>
                                      Keine Einträge
                                    </td>
                                  </tr>
                                )}
                              </>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
