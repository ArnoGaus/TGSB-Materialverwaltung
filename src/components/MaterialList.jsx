// src/components/MaterialList.jsx
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

  // ✅ Ausklapp-Zustände
  // Standorte sollen standardmäßig eingeklappt sein
  const [openStandorte, setOpenStandorte] = useState(() => new Set());
  const [openCategories, setOpenCategories] = useState(() => ({})); // key: `${standort}__${cat}` -> bool
  const [openBundles, setOpenBundles] = useState(() => ({})); // key: bundle_id -> bool

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

  // ✅ Kategorien-Default setzen (Standorte bleiben zu; Kategorien werden "bereit" initialisiert)
  useEffect(() => {
    const standortKeys = Object.keys(groupedByStandort || {});
    if (standortKeys.length === 0) return;

    setOpenCategories((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next = {};
      for (const s of standortKeys) {
        for (const c of tableCategories) next[`${s}__${c}`] = true; // Kategorien offen, sobald Standort geöffnet wird
      }
      return next;
    });
  }, [groupedByStandort, tableCategories]);

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

  // ---------------------------------------------
  // Boot: Ausleger pro bundle_id (Skull/Riemen vorhanden?)
  // ---------------------------------------------
  const auslegerByBundleId = useMemo(() => {
    // bundle_id -> { skull: boolean, riemen: boolean }
    const map = {};
    for (const it of material || []) {
      if (it.kategorie !== "Ausleger") continue;
      if (!it.bundle_id) continue;

      if (!map[it.bundle_id]) map[it.bundle_id] = { skull: false, riemen: false };

      const typ = (detailsByMaterialId?.[it.id]?.typ || "").toLowerCase();
      const n = (it.name || "").toLowerCase();

      const isSkull = typ === "skull" || n.includes("skullausleger");
      const isRiemen = typ === "riemen" || n.includes("riemenausleger");

      if (isSkull) map[it.bundle_id].skull = true;
      if (isRiemen) map[it.bundle_id].riemen = true;
    }
    return map;
  }, [material, detailsByMaterialId]);

  // ---------------------------------------------
  // Boot: Plätze pro Boot (aus Details)
  // ---------------------------------------------
  const getBoatSeats = useCallback(
    (id) => {
      const v = detailsByMaterialId?.[id]?.plaetze;
      return typeof v === "number" ? v : null;
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
      const p = typeof seats === "number" ? seats : null;
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
  // Suche: auch auf Boot-Badge reagieren
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
  // Bootsplätze/Kapazitäten pro Standort ausrechnen
  // ---------------------------------------------
  const boatOccupancyByStandort = useMemo(() => {
    const result = {};
    for (const [standortName, items] of Object.entries(groupedByStandort || {})) {
      const boats = (items || []).filter((m) => m.kategorie === "Boote");
      const usedByClass = {};
      for (const b of boats) {
        const seats = detailsByMaterialId?.[b.id]?.plaetze;
        if (typeof seats !== "number") continue;
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
    if (!item.bundle_id) return <span style={{ fontSize: 12, opacity: 0.65 }}>(kein Boot)</span>;

    const boatName = boatNameByBundleId[item.bundle_id];
    if (!boatName) return <span style={{ fontSize: 12, opacity: 0.65 }}>(Boot nicht gefunden)</span>;

    return (
      <span style={{ fontSize: 12, opacity: 0.85 }}>
        gehört zu:{" "}
        <button style={{ padding: "2px 6px", fontSize: 12 }} onClick={() => selectBundle(item.bundle_id)} title="Bundle auswählen">
          {boatName}
        </button>
      </span>
    );
  }

  function renderAuslegerTyp(item) {
    if (item.kategorie !== "Ausleger") return null;
    const typ = detailsByMaterialId?.[item.id]?.typ;
    if (!typ) return null;
    return <span style={{ fontSize: 12, opacity: 0.75 }}>({typ})</span>;
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

  // ---------------------------------------------
  // Bundle Header Name
  // ---------------------------------------------
  function getBundleDisplayName(cat, itemsInBundle) {
    const first = itemsInBundle?.[0]?.name || "";
    if (!first) return "Unbenannt";

    if (cat === "Skulls") return first.replace(/\s+\d+\s*$/, "").trim() || first;
    if (cat === "Riemen") return first.replace(/\s+\d+\s*-\s*(Backbord|Steuerbord)\s*$/i, "").trim() || first;

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
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={(e) => toggleSelect(item.id, e.target.checked)} />
        </td>

        <td>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {renderNameWithBoatBadge(item)}
              {renderAuslegerTyp(item)}

              {item.bundle_id && (
                <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectBundle(item.bundle_id)}>
                  Bundle
                </button>
              )}

              {item.set_id && (item.kategorie === "Skulls" || item.kategorie === "Riemen") && (
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

      if (isRealBundle) {
        const count = list.length;
        rows.push(
          <tr key={`bundle-header-${bundleKey}`}>
            <td colSpan={showAdmin ? 6 : 5} style={{ background: "rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px", flexWrap: "wrap" }}>
                <button
                  onClick={() => toggleBundleOpen(bundleKey)}
                  style={{ padding: "2px 8px", fontSize: 12, background: "rgba(255,255,255,0.08)" }}
                  title="Bundle auf-/zuklappen"
                >
                  {isOpen ? "▼" : "▶"}
                </button>

                <div style={{ fontWeight: 700, opacity: 0.95 }}>
                  {getBundleDisplayName(cat, list)} — {count} {count === 1 ? "Element" : "Elemente"}
                </div>

                <button style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => selectBundle(bundleKey)} title="Bundle auswählen">
                  Bundle auswählen
                </button>
              </div>
            </td>
          </tr>
        );
      }

      if (!isOpen) continue;

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
                            {cat === "Skulls" || cat === "Riemen" ? (
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