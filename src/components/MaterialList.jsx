import { useCallback, useEffect, useMemo, useState } from "react";
import { kategorien, standorte, BOOT_CAPACITY_BY_STANDORT, normalizeStandortKey } from "../lib/schema";
import { extractLastNumber, extractPairNumber, sideOrder } from "../lib/sort";

export default function MaterialList({
  material,
  detailsByMaterialId,
  updateStandort,
  openDeleteDialog,
  setOpenHistoryId,
  showAdmin,
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

  // ✅ Standorte standardmäßig eingeklappt
  const [openStandorte, setOpenStandorte] = useState(() => new Set());
  // ✅ Kategorien werden vorbereitet (und sind offen sobald Standort offen ist)
  const [openCategories, setOpenCategories] = useState(() => ({})); // key: `${standort}__${cat}` -> bool

  // ✅ Bundle-Header (Skulls/Riemen/Ausleger/Rollsitze) standardmäßig eingeklappt
  const [openBundles, setOpenBundles] = useState(() => ({})); // key: bundle_id -> bool

  // ✅ Untergruppen innerhalb Ausleger pro Bundle (Skull/Riemen/Sonstige) standardmäßig eingeklappt
  const [openAuslegerGroups, setOpenAuslegerGroups] = useState(() => ({})); // key: `${bundleId}__skull|riemen|other` -> bool

  // ✅ Rollsitze pro Bundle (ein Block) standardmäßig eingeklappt
  const [openRollsitzeBundles, setOpenRollsitzeBundles] = useState(() => ({})); // key: bundle_id -> bool

  const tableCategories = useMemo(
    () => ["Boote", "Skulls", "Riemen", "Ausleger", "Hüllen", "Rollsitze", "Sonstiges"],
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

  // ---------------------------------------------
  // Helper: Ausleger typisieren (Skull / Riemen / other)
  // ---------------------------------------------
  const classifyAusleger = useCallback(
    (item) => {
      const typ = (detailsByMaterialId?.[item.id]?.typ || "").toLowerCase();
      const n = (item.name || "").toLowerCase();
      const isSkull = typ === "skull" || n.includes("skullausleger");
      const isRiemen = typ === "riemen" || n.includes("riemenausleger");
      if (isSkull) return "skull";
      if (isRiemen) return "riemen";
      return "other";
    },
    [detailsByMaterialId]
  );

  // ---------------------------------------------
  // Boot: Name von Boot pro bundle_id (für Zubehör-Hinweis)
  // ---------------------------------------------
  const boatNameByBundleId = useMemo(() => {
    const map = {};
    for (const m of material || []) {
      if (m.kategorie === "Boote" && m.bundle_id) map[m.bundle_id] = m.name || "Boot";
    }
    return map;
  }, [material]);

  // Boot: Boot-ID pro bundle_id
  const boatIdByBundleId = useMemo(() => {
    const map = {};
    for (const m of material || []) {
      if (m.kategorie === "Boote" && m.bundle_id) map[m.bundle_id] = m.id;
    }
    return map;
  }, [material]);

  // ---------------------------------------------
  // Boot: Ausleger pro bundle_id (Skull/Riemen vorhanden?)
  // ---------------------------------------------
  const auslegerByBundleId = useMemo(() => {
    const map = {};
    for (const it of material || []) {
      if (it.kategorie !== "Ausleger") continue;
      if (!it.bundle_id) continue;

      if (!map[it.bundle_id]) map[it.bundle_id] = { skull: false, riemen: false };
      const k = classifyAusleger(it);
      if (k === "skull") map[it.bundle_id].skull = true;
      if (k === "riemen") map[it.bundle_id].riemen = true;
    }
    return map;
  }, [material, classifyAusleger]);

  // ---------------------------------------------
  // Boot: Plätze pro Boot (aus Details)  ✅ robust gegen "1" als String
  // ---------------------------------------------
  const getBoatSeats = useCallback(
    (id) => {
      const v = detailsByMaterialId?.[id]?.plaetze;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    },
    [detailsByMaterialId]
  );

  // ---------------------------------------------
  // Boot: Badge Text (z.B. "4x/-+", "2+")
  // x = Skullausleger, - = Riemenausleger, + = Steuermann verfügbar
  // ---------------------------------------------
  const boatBadgeText = useCallback(
    (boatItem) => {
      if (!boatItem || boatItem.kategorie !== "Boote") return "";

      const seats = detailsByMaterialId?.[boatItem.id]?.plaetze;
      const p = Number.isFinite(Number(seats)) ? Number(seats) : null;
      if (!p) return "";

      const steer = !!detailsByMaterialId?.[boatItem.id]?.steuermann_verfuegbar;

      const bundle = boatItem.bundle_id ? auslegerByBundleId[boatItem.bundle_id] : null;
      const hasSkull = !!bundle?.skull;
      const hasRiemen = !!bundle?.riemen;

      let marker = "";
      if (hasSkull && hasRiemen) marker = "x/-";
      else if (hasSkull) marker = "x";
      else if (hasRiemen) marker = "-";

      const plus = steer ? "+" : "";
      return `${p}${marker}${plus}`;
    },
    [detailsByMaterialId, auslegerByBundleId]
  );

  // ---------------------------------------------
  // Suche
  // ---------------------------------------------
  const filterFn = useCallback(
    (item) => {
      const q = search.toLowerCase().trim();
      const badge = item.kategorie === "Boote" ? boatBadgeText(item) : "";
      const hay = `${item.name || ""} ${badge}`.toLowerCase();

      const matchesSearch = hay.includes(q);
      const matchesCat = filterKategorie === "Alle" || item.kategorie === filterKategorie;
      return matchesSearch && matchesCat;
    },
    [search, filterKategorie, boatBadgeText]
  );

  // ---------------------------------------------
  // Bootsplätze/Kapazitäten pro Standort
  // ---------------------------------------------
  const boatOccupancyByStandort = useMemo(() => {
    const result = {};
    for (const [standortName, items] of Object.entries(groupedByStandort || {})) {
      const boats = (items || []).filter((m) => m.kategorie === "Boote");
      const usedByClass = {};
      for (const b of boats) {
        const seats = Number(detailsByMaterialId?.[b.id]?.plaetze);
        if (!Number.isFinite(seats)) continue;
        usedByClass[seats] = (usedByClass[seats] || 0) + 1;
      }
      result[standortName] = usedByClass;
    }
    return result;
  }, [groupedByStandort, detailsByMaterialId]);

  // ---------------------------------------------
  // Render helpers
  // ---------------------------------------------
  function renderBelongsToBoat(item) {
    const isAccessory = item.kategorie === "Ausleger" || item.kategorie === "Hüllen" || item.kategorie === "Rollsitze";
    if (!isAccessory) return null;

    // ✅ Zubehör: "gehört zu" nicht mehr anzeigen
    return null;
  }

  function renderAuslegerTyp(item) {
    return null;
  }

  function renderNameWithBoatBadge(item) {
    return (
      <span>
        {item.name}
        {item.kategorie === "Boote" && boatBadgeText(item) ? (
          <span style={{ opacity: 0.8, marginLeft: 6, fontSize: 12 }}>({boatBadgeText(item)})</span>
        ) : null}
      </span>
    );
  }

  // ---------------------------------------------
  // Sortierung pro Kategorie
  // ---------------------------------------------
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

    if (cat === "Skulls") {
      return [...items].sort((a, b) => {
        const na = extractLastNumber(a.name) ?? 999999;
        const nb = extractLastNumber(b.name) ?? 999999;
        if (na !== nb) return na - nb;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    if (cat === "Riemen") {
      return [...items].sort((a, b) => {
        const na = extractPairNumber(a.name) ?? 999999;
        const nb = extractPairNumber(b.name) ?? 999999;
        if (na !== nb) return na - nb;

        const sa = sideOrder(a.side);
        const sb = sideOrder(b.side);
        if (sa !== sb) return sa - sb;

        return (a.name || "").localeCompare(b.name || "");
      });
    }

    return [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  // ---------------------------------------------
  // Ausklapp-Handler
  // ---------------------------------------------
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

  // ---------------------------------------------
  // Bundle Header Name
  // ---------------------------------------------
  function getBundleDisplayName(cat, itemsInBundle) {
    const first = itemsInBundle?.[0]?.name || "";
    if (!first) return "Unbenannt";

    if (cat === "Skulls") return first.replace(/\s+\d+\s*$/, "").trim() || first;
    if (cat === "Riemen") return first.replace(/\s+\d+\s*-\s*(Backbord|Steuerbord)\s*$/i, "").trim() || first;

    // Ausleger/Rollsitze: lieber Bootsname (falls vorhanden)
    if (cat === "Ausleger" || cat === "Rollsitze") {
      const bId = itemsInBundle?.[0]?.bundle_id;
      if (bId && boatNameByBundleId[bId]) return boatNameByBundleId[bId];
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
    // ✅ In der ausgeklappten Detail-Ansicht (Rows):
    // - Kein "Bundle" Button mehr (auch nicht für Skulls/Riemen)
    // - Kein "Satz" Button mehr (Skulls/Riemen)
    const showRowBundleButton = false; // komplett aus
    const showRowSetButton = false; // komplett aus (Satz)

    return (
      <tr key={item.id}>
        <td>
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={(e) => toggleSelect(item.id, e.target.checked)} />
        </td>

        <td>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {renderNameWithBoatBadge(item)}
              {renderAuslegerTyp(item)}

              {showRowBundleButton && item.bundle_id && (
                <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectBundle(item.bundle_id)}>
                  Bundle
                </button>
              )}

              {showRowSetButton && item.set_id && (item.kategorie === "Skulls" || item.kategorie === "Riemen") && (
                <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectSet(item.set_id)}>
                  Satz
                </button>
              )}

              {item.pair_id && item.kategorie === "Riemen" && (
                <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectPair(item.pair_id)}>
                  Paar
                </button>
              )}

              {item.kategorie === "Riemen" && item.side && <span style={{ fontSize: 12, opacity: 0.75 }}>({item.side})</span>}
            </div>

            {renderBelongsToBoat(item)}
          </div>
        </td>

        <td>
          <select value={item.standort} onChange={(e) => updateStandort(item, e.target.value)}>
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
          <button
            onClick={async () => {
              await loadHistory(item.id);
              setOpenHistoryId(item.id);
            }}
          >
            Verlauf
          </button>
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

      // ---- Ausleger-Sonderlogik vorbereiten ----
      let auslegerSeats = null;
      let auslegerHasBothTypes = false;

      if (cat === "Ausleger" && isRealBundle) {
        const boatId = boatIdByBundleId[bundleKey];
        auslegerSeats = boatId ? getBoatSeats(boatId) : null;

        const flags = auslegerByBundleId?.[bundleKey] || { skull: false, riemen: false };
        auslegerHasBothTypes = !!flags.skull && !!flags.riemen;
      }

      // ---- Rollsitze: Bootplätze vorbereiten ----
      let rollsitzeSeats = null;
      if (cat === "Rollsitze" && isRealBundle) {
        const boatId = boatIdByBundleId[bundleKey];
        rollsitzeSeats = boatId ? getBoatSeats(boatId) : null;
      }

      // ✅ Für 1-Sitzer: KEIN Header (Ausleger + Rollsitze)
      const suppressBundleHeader =
        isRealBundle &&
        ((cat === "Ausleger" && auslegerSeats === 1) || (cat === "Rollsitze" && rollsitzeSeats === 1));

      // Header rendern (je nach Kategorie) – aber ggf. unterdrücken
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
                  style={{ padding: "2px 8px", fontSize: 12, background: "rgba(255,255,255,0.08)" }}
                  title="Bundle auf-/zuklappen"
                >
                  {isHeaderOpen ? "▼" : "▶"}
                </button>

                <div style={{ fontWeight: 700, opacity: 0.95 }}>
                  {getBundleDisplayName(cat, list)} — {count} {count === 1 ? "Element" : "Elemente"}
                </div>

                {/* ✅ "Bundle auswählen" soll NUR bei Skulls & Riemen in der Überschrift bleiben */}
                {(cat === "Skulls" || cat === "Riemen") && (
                  <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectBundle(bundleKey)} title="Bundle auswählen">
                    Bundle auswählen
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      }

      // geschlossen -> skip (ABER: 1-Sitzer ignoriert skip, weil kein Header & immer sichtbar)
      if (!suppressBundleHeader) {
        if (cat === "Rollsitze") {
          if (!isRollsitzeOpen) continue;
        } else {
          if (!isOpen) continue;
        }
      }

      // ✅ Rollsitze: 1-Sitzer -> direkt sichtbar ohne Header/Ausklappen
      if (cat === "Rollsitze" && isRealBundle) {
        for (const it of sortCatItems("Rollsitze", list)) rows.push(renderRow(it));
        continue;
      }

      // ✅ Ausleger: Sonderlogik
      if (cat === "Ausleger" && isRealBundle) {
        // Fall A: 1 Platz -> flach, ohne Überschriften
        if (auslegerSeats === 1) {
          for (const it of sortCatItems("Ausleger", list)) rows.push(renderRow(it));
          continue;
        }

        // Fall B: Nur Skull ODER nur Riemen -> keine Unterteilung, ein Ausklappen zeigt alles
        if (!auslegerHasBothTypes) {
          for (const it of sortCatItems("Ausleger", list)) rows.push(renderRow(it));
          continue;
        }

        // Fall C: Beide Typen -> Untergruppen wie gehabt
        const skull = [];
        const riemen = [];
        const other = [];
        for (const it of list) {
          const k = classifyAusleger(it);
          if (k === "skull") skull.push(it);
          else if (k === "riemen") riemen.push(it);
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
                    style={{ padding: "2px 8px", fontSize: 12, background: "rgba(255,255,255,0.08)" }}
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

      // Default: Items rendern
      for (const item of list) rows.push(renderRow(item));
    }

    return rows;
  }

  return (
    <div>
      <div className="card">
        <h3>Suche & Filter</h3>
        <input placeholder="🔎 Suche nach Name / z.B. 4x/-+ ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterKategorie} onChange={(e) => setFilterKategorie(e.target.value)}>
          {kategorien.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
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
            {/* Standort Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => toggleStandortOpen(standortName)}
                  style={{ padding: "4px 10px", fontSize: 12, background: "rgba(255,255,255,0.08)" }}
                  title="Standort auf-/zuklappen"
                >
                  {standortOpen ? "▼" : "▶"}
                </button>

                <h2 style={{ margin: 0 }}>Standort: {standortName}</h2>
                <span style={{ opacity: 0.75 }}>({itemsAll.length})</span>
              </div>
            </div>

            {/* Bootsplätze Anzeige */}
            {capClasses.length > 0 ? (
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
            ) : null}

            {!standortOpen ? null : (
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: 12 }}>
                {tableCategories.map((cat) => {
                  const catKey = `${standortName}__${cat}`;
                  const catOpen = !!openCategories[catKey];
                  const catItems = itemsAll.filter((i) => i.kategorie === cat);

                  return (
                    <div key={cat} style={{ flex: "1 1 360px" }}>
                      {/* Kategorie Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <h3 style={{ margin: 0 }}>
                          {cat} <span style={{ opacity: 0.7 }}>({catItems.length})</span>
                        </h3>

                        <button
                          onClick={() => toggleCategoryOpen(standortName, cat)}
                          style={{ padding: "2px 10px", fontSize: 12, background: "rgba(255,255,255,0.08)" }}
                          title="Kategorie auf-/zuklappen"
                        >
                          {catOpen ? "▼" : "▶"}
                        </button>
                      </div>

                      {!catOpen ? null : (
                        <table className="material-table" style={{ marginTop: 8 }}>
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
                            {/* Skulls, Riemen, Ausleger, Rollsitze: je Bundle zusammenfassen & einklappen */}
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