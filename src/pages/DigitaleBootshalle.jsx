/*import { useMemo, useRef, useState } from "react";

const STANDORTE = [
  { id: "sbg", name: "Siegburg" },
  { id: "koeln", name: "Köln (Demo)" },
  { id: "bonn", name: "Bonn (Demo)" },
];

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function buildSiegburgLayout({ xLeft = 12, yRight = 12, twoHall = 10, fourHall = 10, cellarLeft = 8, cellarRight = 8, cellarUnder4 = 8 }) {
  return [
    {
      groupId: "regalhalle",
      title: "Siegburg – Regalhalle",
      columns: [
        {
          colId: "regal-left",
          title: `Links (X = ${xLeft} Stellagen übereinander)`,
          slots: Array.from({ length: xLeft }).map((_, i) => ({
            slotId: `regal-left-${i + 1}`,
            label: `L${i + 1}`,
          })),
        },
        {
          colId: "regal-right",
          title: `Rechts (Y = ${yRight} Stellagen übereinander)`,
          slots: Array.from({ length: yRight }).map((_, i) => ({
            slotId: `regal-right-${i + 1}`,
            label: `R${i + 1}`,
          })),
        },
      ],
    },
    {
      groupId: "hallen",
      title: "Siegburg – Hallen",
      columns: [
        {
          colId: "halle-2",
          title: "2er-Halle",
          slots: Array.from({ length: twoHall }).map((_, i) => ({
            slotId: `halle-2-${i + 1}`,
            label: `2H-${i + 1}`,
          })),
        },
        {
          colId: "halle-4",
          title: "4er-Halle",
          slots: Array.from({ length: fourHall }).map((_, i) => ({
            slotId: `halle-4-${i + 1}`,
            label: `4H-${i + 1}`,
          })),
        },
      ],
    },
    {
      groupId: "keller",
      title: "Siegburg – Keller",
      columns: [
        {
          colId: "keller-left",
          title: "Keller links",
          slots: Array.from({ length: cellarLeft }).map((_, i) => ({
            slotId: `keller-left-${i + 1}`,
            label: `KL-${i + 1}`,
          })),
        },
        {
          colId: "keller-right",
          title: "Keller rechts",
          slots: Array.from({ length: cellarRight }).map((_, i) => ({
            slotId: `keller-right-${i + 1}`,
            label: `KR-${i + 1}`,
          })),
        },
        {
          colId: "keller-under4",
          title: "Unter der 4er-Halle",
          slots: Array.from({ length: cellarUnder4 }).map((_, i) => ({
            slotId: `keller-under4-${i + 1}`,
            label: `U4-${i + 1}`,
          })),
        },
      ],
    },
  ];
}

function buildGenericLayout(name = "Standort") {
  return [
    {
      groupId: "generic",
      title: `${name} – Demo-Halle`,
      columns: [
        {
          colId: "demo",
          title: "Demo Plätze",
          slots: Array.from({ length: 12 }).map((_, i) => ({
            slotId: `demo-${i + 1}`,
            label: `P-${i + 1}`,
          })),
        },
      ],
    },
  ];
}

export default function DigitaleBootshalle() {
  const [standortId, setStandortId] = useState("sbg");

  // Boote am Standort
  const [boatsBySite, setBoatsBySite] = useState(INITIAL_BOATS);

  // Slot-Belegung: { [slotId]: boatId }
  const [occupancy, setOccupancy] = useState({});

  // Desktop Drag
  const [dragBoatId, setDragBoatId] = useState(null);

  // Mobile Long-Press
  const [selectedBoatId, setSelectedBoatId] = useState(null);
  const longPressTimer = useRef(null);

  // UI: Slot-Add Dialog
  const [slotPicker, setSlotPicker] = useState(null); // { slotId, open: true }
  const [slotSearch, setSlotSearch] = useState("");

  const layout = useMemo(() => {
    const siteName = STANDORTE.find((s) => s.id === standortId)?.name || "Standort";
    if (standortId === "sbg") return buildSiegburgLayout({ xLeft: 12, yRight: 12 });
    return buildGenericLayout(siteName);
  }, [standortId]);

  const boatsHere = boatsBySite[standortId] || [];

  const boatById = useMemo(() => {
    const map = new Map();
    Object.values(boatsBySite).flat().forEach((b) => map.set(b.id, b));
    return map;
  }, [boatsBySite]);

  const usedBoatIds = useMemo(() => new Set(Object.values(occupancy)), [occupancy]);

  const unassignedBoatsHere = useMemo(
    () => boatsHere.filter((b) => !usedBoatIds.has(b.id)),
    [boatsHere, usedBoatIds]
  );

  function assignBoatToSlot(boatId, slotId) {
    if (!boatId || !slotId) return;

    // Boot darf nur an einem Slot hängen -> ggf. vorherige Belegung entfernen
    const next = { ...occupancy };
    for (const [sId, bId] of Object.entries(next)) {
      if (bId === boatId) delete next[sId];
    }
    // Slot überschreiben (oder du könntest blocken, wenn schon belegt)
    next[slotId] = boatId;
    setOccupancy(next);

    // Mobile Auswahl zurücksetzen
    setSelectedBoatId(null);
  }

  function clearSlot(slotId) {
    const next = { ...occupancy };
    delete next[slotId];
    setOccupancy(next);
  }

  function onBoatPointerDown(boatId) {
    // Long-press: nach 450ms auswählen (mobile)
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedBoatId(boatId);
    }, 450);
  }

  function onBoatPointerUp() {
    clearTimeout(longPressTimer.current);
  }

  function openSlotPicker(slotId) {
    setSlotSearch("");
    setSlotPicker({ slotId, open: true });
  }

  const slotPickerBoats = useMemo(() => {
    const q = slotSearch.trim().toLowerCase();
    const list = unassignedBoatsHere;
    if (!q) return list;
    return list.filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }, [slotSearch, unassignedBoatsHere]);

  return (
    <div className="container bootshalle-page">
      <div className="bootshalle-top">
        <h1 style={{ margin: 0 }}>Digitale Bootshalle</h1>

        <div className="bootshalle-warning">
          Diese Seite befindet sich in der Bearbeitung
        </div>

        <div className="bootshalle-controls">
          <div style={{ minWidth: 260 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Standort</div>
            <select value={standortId} onChange={(e) => setStandortId(e.target.value)}>
              {STANDORTE.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBoatId ? (
            <div className="bootshalle-selected">
              Ausgewählt (Mobile):{" "}
              <strong>{boatById.get(selectedBoatId)?.name || selectedBoatId}</strong>
              <button className="secondary" onClick={() => setSelectedBoatId(null)}>
                Auswahl aufheben
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Desktop: Ziehen & Ablegen. Mobile: Boot lange halten → Lagerplatz antippen.
            </div>
          )}
        </div>
      </div>

      <div className="bootshalle-grid">
        {/* Linke Seite: Bootliste */}/*
        <div className="bootshalle-panel">
          <div className="bootshalle-panel-title">Boote am Standort</div>

          {unassignedBoatsHere.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Keine freien Boote (alle sind eingelagert).</div>
          ) : (
            <div className="boot-list">
              {unassignedBoatsHere.map((b) => (
                <div
                  key={b.id}
                  className={`boot-chip ${selectedBoatId === b.id ? "is-selected" : ""}`}
                  draggable
                  onDragStart={() => setDragBoatId(b.id)}
                  onDragEnd={() => setDragBoatId(null)}
                  onPointerDown={() => onBoatPointerDown(b.id)}
                  onPointerUp={onBoatPointerUp}
                  onPointerCancel={onBoatPointerUp}
                  title="Desktop: ziehen. Mobile: lange halten zum Auswählen."
                >
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{b.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rechte Seite: Lager-Layout */}/*
        <div className="bootshalle-panel">
          <div className="bootshalle-panel-title">Lager</div>

          {layout.map((group) => (
            <div key={group.groupId} className="lager-group">
              <div className="lager-group-title">{group.title}</div>

              <div className="lager-columns">
                {group.columns.map((col) => (
                  <div key={col.colId} className="lager-col">
                    <div className="lager-col-title">{col.title}</div>

                    <div className="lager-slots">
                      {col.slots.map((s) => {
                        const boatId = occupancy[s.slotId];
                        const boat = boatId ? boatById.get(boatId) : null;

                        return (
                          <div
                            key={s.slotId}
                            className={`lager-slot ${boat ? "is-full" : "is-empty"}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (dragBoatId) assignBoatToSlot(dragBoatId, s.slotId);
                            }}
                            onClick={() => {
                              // Mobile: wenn ein Boot ausgewählt ist -> zuweisen
                              if (selectedBoatId) {
                                assignBoatToSlot(selectedBoatId, s.slotId);
                                return;
                              }
                              // Sonst Slot-Picker öffnen
                              openSlotPicker(s.slotId);
                            }}
                            title={
                              boat
                                ? "Klick: Boot ändern/entfernen"
                                : "Klick: Boot hinzufügen (oder mobile: zuweisen)"
                            }
                          >
                            <div className="lager-slot-head">
                              <strong>{s.label}</strong>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>
                                {s.slotId}
                              </span>
                            </div>

                            {boat ? (
                              <div className="lager-slot-body">
                                <div style={{ fontWeight: 700 }}>{boat.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}>{boat.id}</div>

                                <div className="lager-slot-actions">
                                  <button
                                    className="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSlotPicker(s.slotId);
                                    }}
                                  >
                                    Ändern
                                  </button>
                                  <button
                                    className="delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearSlot(s.slotId);
                                    }}
                                  >
                                    Entfernen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="lager-slot-emptyhint">
                                {selectedBoatId ? "Antippen zum Einlagern" : "Klick zum Hinzufügen"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slot Picker Modal */}/*
      {slotPicker?.open ? (
        <div className="modal-overlay" onClick={() => setSlotPicker(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSlotPicker(null)}>
              ×
            </button>

            <h3 style={{ marginTop: 0 }}>Boot hinzufügen / ändern</h3>
            <p style={{ opacity: 0.8, marginTop: 4 }}>
              Lagerplatz: <strong>{slotPicker.slotId}</strong>
            </p>

            <input
              style={{ width: "100%", marginRight: 0 }}
              placeholder="Suchen nach Name oder ID..."
              value={slotSearch}
              onChange={(e) => setSlotSearch(e.target.value)}
            />

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {slotPickerBoats.length === 0 ? (
                <div style={{ opacity: 0.8 }}>
                  Keine passenden freien Boote am Standort.
                </div>
              ) : (
                slotPickerBoats.map((b) => (
                  <button
                    key={b.id}
                    className="admin-btn"
                    style={{ textAlign: "left" }}
                    onClick={() => {
                      assignBoatToSlot(b.id, slotPicker.slotId);
                      setSlotPicker(null);
                    }}
                  >
                    {b.name} <span style={{ opacity: 0.75, fontSize: 12 }}>({b.id})</span>
                  </button>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="secondary" onClick={() => setSlotPicker(null)}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}