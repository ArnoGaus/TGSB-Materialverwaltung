import { useEffect, useState } from "react";
import {
  kategorien,
  standorte,
  detailsSchema,
  SKULLS_SHARED_KEYS,
  SKULLS_PER_ITEM_KEYS,
  RIEMEN_SHARED_KEYS,
  RIEMEN_PER_PAIR_KEYS,
  shoeIndexToState,
  shoeStateToIndex,
} from "../lib/schema";

export default function AdminPanel({ addBoatWithSeatItems, addSkullsSet, addRiemenSetPairs }) {
  const [kategorie, setKategorie] = useState("Boote");
  const [standort, setStandort] = useState("BRG");
  const [name, setName] = useState("");

  // Skulls/Riemen
  const [count, setCount] = useState(4);
  const [setSharedDetails, setSetSharedDetails] = useState({});
  const [skullPerItemDetails, setSkullPerItemDetails] = useState([]);
  const [riemenPerPairDetails, setRiemenPerPairDetails] = useState([]);

  // Boot
  const [boatDetails, setBoatDetails] = useState({});
  const plaetze = Math.max(0, Number(boatDetails?.plaetze || 0));
  const shoes = Array.isArray(boatDetails?.schuhe) ? boatDetails.schuhe : [];
  const [hasSteuerplatz, setHasSteuerplatz] = useState(false);
  const [rollsitzPerSeat, setRollsitzPerSeat] = useState([]);

  const [createSkullAusleger, setCreateSkullAusleger] = useState(true);
  const [createRiemenAusleger, setCreateRiemenAusleger] = useState(false);
  const [auslegerSkullPerSeat, setAuslegerSkullPerSeat] = useState([]);
  const [auslegerRiemenPerSeat, setAuslegerRiemenPerSeat] = useState([]);

  // Hülle
  const [hasHuelle, setHasHuelle] = useState(true);
  const [huelleName, setHuelleName] = useState("");
  const [huelleNotiz, setHuelleNotiz] = useState("");

  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (kategorie !== "Boote") return;
    const base = name.trim();
    setHuelleName(base ? `${base} - Hülle` : "");
  }, [name, kategorie]);

  // Boot: Arrays pro Platz
  useEffect(() => {
    if (kategorie !== "Boote") return;
    if (!plaetze || plaetze < 1) {
      setAuslegerSkullPerSeat([]);
      setAuslegerRiemenPerSeat([]);
      setRollsitzPerSeat([]);
      return;
    }

    setAuslegerSkullPerSeat((prev) => {
      const next = prev.slice(0, plaetze);
      while (next.length < plaetze) next.push({});
      return next;
    });

    setAuslegerRiemenPerSeat((prev) => {
      const next = prev.slice(0, plaetze);
      while (next.length < plaetze) next.push({});
      return next;
    });

    setRollsitzPerSeat((prev) => {
      const next = prev.slice(0, plaetze);
      while (next.length < plaetze) next.push({});
      return next;
    });

    setBoatDetails((prev) => {
      const curShoes = Array.isArray(prev?.schuhe) ? prev.schuhe.slice(0, plaetze) : [];
      while (curShoes.length < plaetze) curShoes.push({ zustand: "gut", groesse: "" });
      return { ...prev, schuhe: curShoes };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plaetze, kategorie]);

  // Skulls/Riemen: Arrays auf count bringen
  useEffect(() => {
    if (kategorie !== "Skulls" && kategorie !== "Riemen") return;

    const n = Math.max(1, Number(count || 1));

    if (kategorie === "Skulls") {
      setSkullPerItemDetails((prev) => {
        const next = prev.slice(0, n);
        while (next.length < n) next.push({});
        return next;
      });
    }

    if (kategorie === "Riemen") {
      setRiemenPerPairDetails((prev) => {
        const next = prev.slice(0, n);
        while (next.length < n) next.push({});
        return next;
      });
    }
  }, [kategorie, count]);

  function setBoatField(key, val, type) {
    setBoatDetails((prev) => {
      const next = { ...prev };
      if (val === "" || val === null || val === undefined) {
        delete next[key];
        return next;
      }
      if (type === "number") {
        const num = Number(val);
        if (Number.isNaN(num)) return prev;
        next[key] = num;
        return next;
      }
      next[key] = val;
      return next;
    });
  }

  function setShoe(idx, patch) {
    const next = [...shoes];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setBoatDetails((prev) => ({ ...prev, schuhe: next }));
  }

  function setSharedField(key, val, type) {
    setSetSharedDetails((prev) => {
      const next = { ...prev };
      if (val === "" || val === null || val === undefined) {
        delete next[key];
        return next;
      }
      if (type === "number") {
        const num = Number(val);
        if (Number.isNaN(num)) return prev;
        next[key] = num;
        return next;
      }
      if (type === "bool") {
        next[key] = !!val;
        return next;
      }
      next[key] = val;
      return next;
    });
  }

  function setSkullItemField(idx, key, val, type) {
    setSkullPerItemDetails((prev) => {
      const next = [...prev];
      const cur = { ...(next[idx] || {}) };

      if (val === "" || val === null || val === undefined) delete cur[key];
      else if (type === "number") {
        const num = Number(val);
        if (!Number.isNaN(num)) cur[key] = num;
      } else if (type === "bool") cur[key] = !!val;
      else cur[key] = val;

      next[idx] = cur;
      return next;
    });
  }

  // Riemen pro Pair + Autofill: Paar 1 Längen -> Vorschlag für andere (nur wenn leer)
  function setRiemenPairField(pairIdx, key, val, type) {
    setRiemenPerPairDetails((prev) => {
      const next = [...prev];
      const cur = { ...(next[pairIdx] || {}) };

      if (val === "" || val === null || val === undefined) delete cur[key];
      else if (type === "number") {
        const num = Number(val);
        if (!Number.isNaN(num)) cur[key] = num;
      } else if (type === "bool") cur[key] = !!val;
      else cur[key] = val;

      next[pairIdx] = cur;

      const isLengthKey = key === "gesamtlaenge_cm" || key === "innenhebel_cm";
      const isPair1 = pairIdx === 0;
      const valueIsUsable =
        (type === "number" && val !== "" && val !== null && val !== undefined && !Number.isNaN(Number(val))) ||
        (type !== "number" && val !== "" && val !== null && val !== undefined);

      if (isPair1 && isLengthKey && valueIsUsable) {
        for (let i = 1; i < next.length; i++) {
          const t = { ...(next[i] || {}) };
          const hasAlready = t[key] !== undefined && t[key] !== null && t[key] !== "";
          if (!hasAlready) {
            t[key] = type === "number" ? Number(val) : val;
            next[i] = t;
          }
        }
      }

      return next;
    });
  }

  async function add() {
    setMsg("");
    const base = name.trim();
    if (!base) return setMsg("Bitte Name eingeben.");

    if (kategorie === "Boote") {
      const p = Number(boatDetails?.plaetze || 0);
      if (!p || p < 1) return setMsg("Bitte Plätze (>=1) eingeben.");
      if (!createSkullAusleger && !createRiemenAusleger) return setMsg("Bitte mindestens Skullausleger oder Riemenausleger auswählen.");

      await addBoatWithSeatItems({
        boatName: base,
        standort,
        boatDetails,
        hasHuelle,
        huelleName: (huelleName || `${base} - Hülle`).trim(),
        huelleNotiz: (huelleNotiz || "").trim(),
        createSkullAusleger,
        createRiemenAusleger,
        auslegerSkullPerSeatDetails: auslegerSkullPerSeat,
        auslegerRiemenPerSeatDetails: auslegerRiemenPerSeat,
        rollsitzPerSeatDetails: rollsitzPerSeat,
        hasSteuerplatz,
      });

      setName("");
      setBoatDetails({});
      setAuslegerSkullPerSeat([]);
      setAuslegerRiemenPerSeat([]);
      setRollsitzPerSeat([]);
      setHasHuelle(true);
      setHuelleName("");
      setHuelleNotiz("");
      setHasSteuerplatz(false);
      setMsg("Boot + Zubehör angelegt.");
      return;
    }

    if (kategorie === "Skulls") {
      const c = Math.max(1, Number(count || 1));
      await addSkullsSet({
        setName: base,
        count: c,
        standort,
        sharedDetails: setSharedDetails,
        perItemDetails: skullPerItemDetails,
      });
      setName("");
      setCount(4);
      setSetSharedDetails({});
      setSkullPerItemDetails([]);
      setMsg("Skulls-Satz angelegt.");
      return;
    }

    if (kategorie === "Riemen") {
      const c = Math.max(1, Number(count || 1));
      await addRiemenSetPairs({
        setName: base,
        pairsCount: c,
        standort,
        sharedDetails: setSharedDetails,
        perPairDetails: riemenPerPairDetails,
      });
      setName("");
      setCount(4);
      setSetSharedDetails({});
      setRiemenPerPairDetails([]);
      setMsg("Riemen-Satz angelegt.");
      return;
    }

    setMsg("Diese Kategorie wird hier aktuell nicht angelegt.");
  }

  return (
    <div className="card">
      <h3>Admin</h3>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            {kategorien.slice(1).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          <select value={standort} onChange={(e) => setStandort(e.target.value)}>
            {standorte.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <input placeholder={kategorie === "Boote" ? "Bootname" : "Satz-Name"} value={name} onChange={(e) => setName(e.target.value)} />

        {(kategorie === "Skulls" || kategorie === "Riemen") && (
          <div style={{ display: "grid", gap: 10, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 180, opacity: 0.9 }}>{kategorie === "Riemen" ? "Anzahl Paare" : "Anzahl Skulls"}</div>
              <input style={{ width: 120 }} type="number" min={1} step={1} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>

            {/* Shared */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Infos – für den kompletten Satz</div>

              <div style={{ display: "grid", gap: 10 }}>
                {(detailsSchema[kategorie] || [])
                  .filter((f) => (kategorie === "Skulls" ? SKULLS_SHARED_KEYS.includes(f.key) : RIEMEN_SHARED_KEYS.includes(f.key)))
                  .map((f) => {
                    const current = setSharedDetails?.[f.key];

                    if (f.type === "bool") {
                      return (
                        <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ width: 180, opacity: 0.9 }}>{f.label}</span>
                          <input type="checkbox" checked={!!current} onChange={(e) => setSharedField(f.key, e.target.checked, "bool")} />
                        </label>
                      );
                    }

                    return (
                      <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 180, opacity: 0.9 }}>
                          {f.label}
                          {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                        </div>

                        <div style={{ flex: 1 }}>
                          {f.type === "number" && (
                            <input style={{ width: "100%" }} type="number" value={current ?? ""} step={f.step ?? "any"} min={f.min ?? undefined} onChange={(e) => setSharedField(f.key, e.target.value, "number")} />
                          )}

                          {f.type === "text" && <input style={{ width: "100%" }} type="text" value={current ?? ""} placeholder={f.placeholder ?? ""} onChange={(e) => setSharedField(f.key, e.target.value, "text")} />}

                          {f.type === "select" && (
                            <select style={{ width: "100%" }} value={current ?? ""} onChange={(e) => setSharedField(f.key, e.target.value, "select")}>
                              {(f.options || [""]).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt === "" ? "—" : opt}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Per item/pair */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>{kategorie === "Skulls" ? "Pro Skull – individuelle Infos" : "Pro Paar – individuelle Infos"}</div>

              {kategorie === "Skulls" &&
                Array.from({ length: Math.max(1, Number(count || 1)) }).map((_, i) => {
                  const per = skullPerItemDetails[i] || {};
                  return (
                    <div key={i} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 10, display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Skull {i + 1}</div>

                      {(detailsSchema.Skulls || [])
                        .filter((f) => SKULLS_PER_ITEM_KEYS.includes(f.key))
                        .map((f) => {
                          const current = per?.[f.key];

                          if (f.type === "bool") {
                            return (
                              <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{ width: 180, opacity: 0.9 }}>{f.label}</span>
                                <input type="checkbox" checked={!!current} onChange={(e) => setSkullItemField(i, f.key, e.target.checked, "bool")} />
                              </label>
                            );
                          }

                          return (
                            <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <div style={{ width: 180, opacity: 0.9 }}>
                                {f.label}
                                {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                              </div>

                              <div style={{ flex: 1 }}>
                                {f.type === "number" && <input style={{ width: "100%" }} type="number" value={current ?? ""} step={f.step ?? "any"} min={f.min ?? undefined} onChange={(e) => setSkullItemField(i, f.key, e.target.value, "number")} />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}

              {kategorie === "Riemen" &&
                Array.from({ length: Math.max(1, Number(count || 1)) }).map((_, i) => {
                  const per = riemenPerPairDetails[i] || {};
                  return (
                    <div key={i} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 10, display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Paar {i + 1}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Gilt für Backbord + Steuerbord dieses Paars</div>

                      {(detailsSchema.Riemen || [])
                        .filter((f) => RIEMEN_PER_PAIR_KEYS.includes(f.key))
                        .map((f) => {
                          const current = per?.[f.key];

                          if (f.type === "bool") {
                            return (
                              <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{ width: 180, opacity: 0.9 }}>{f.label}</span>
                                <input type="checkbox" checked={!!current} onChange={(e) => setRiemenPairField(i, f.key, e.target.checked, "bool")} />
                              </label>
                            );
                          }

                          return (
                            <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <div style={{ width: 180, opacity: 0.9 }}>
                                {f.label}
                                {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                              </div>

                              <div style={{ flex: 1 }}>
                                {f.type === "number" && <input style={{ width: "100%" }} type="number" value={current ?? ""} step={f.step ?? "any"} min={f.min ?? undefined} onChange={(e) => setRiemenPairField(i, f.key, e.target.value, "number")} />}
                              </div>
                            </div>
                          );
                        })}

                      {i === 0 && (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Tipp: Längen aus <strong>Paar 1</strong> werden als Vorschlag in die anderen Paare übernommen (nur wenn dort leer).
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Boot UI bleibt groß, aber ausgelagert */}
        {kategorie === "Boote" && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 10 }}>
            <h4 style={{ margin: 0 }}>Boot Infos</h4>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 180, opacity: 0.9 }}>Plätze</div>
              <input style={{ width: 120 }} type="number" min={1} step={1} value={boatDetails?.plaetze ?? ""} onChange={(e) => setBoatField("plaetze", e.target.value, "number")} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 180, opacity: 0.9 }}>Gewicht </div>
              <input style={{ flex: 1 }} type="text" placeholder="z.B. 80-90" value={boatDetails?.gewicht_kg ?? ""} onChange={(e) => setBoatField("gewicht_kg", e.target.value, "text")} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 180, opacity: 0.9 }}>aktueller Nutzer </div>
              <input style={{ flex: 1 }} type="text" placeholder="z.B. Max Mustermann" value={boatDetails?.aktueller_nutzer ?? ""} onChange={(e) => setBoatField("aktueller_nutzer", e.target.value, "text")} />
            </div>

            {/* Hülle */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 8 }}>
              <h4 style={{ margin: 0 }}>Hülle</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={hasHuelle} onChange={(e) => setHasHuelle(e.target.checked)} />
                Hülle vorhanden
              </label>

              {hasHuelle && (
                <>
                  <input value={huelleName} onChange={(e) => setHuelleName(e.target.value)} placeholder="Hüllen-Name" />
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ width: 180, opacity: 0.9 }}>Notiz</div>
                    <input style={{ flex: 1 }} value={huelleNotiz} onChange={(e) => setHuelleNotiz(e.target.value)} placeholder="z.B. passt zu ..." />
                  </div>
                </>
              )}

              {!hasHuelle && (
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Hinweis: Es wird <strong>keine</strong> Hülle als eigenes Material angelegt. Im Boot wird gespeichert: „Hülle vorhanden = Nein“.
                </div>
              )}
            </div>
              {/* Steuerplatz */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 8 }}>
              <h4 style={{ margin: 0 }}>Hülle</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={hasSteuerplatz} onChange={(e) => setHasSteuerplatz(e.target.checked)} />
                Steuerplatz vorhanden
              </label>
            </div>

            {/* Ausleger Typen */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 8 }}>
              <h4 style={{ margin: 0 }}>Ausleger-Typen</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={createSkullAusleger} onChange={(e) => setCreateSkullAusleger(e.target.checked)} />
                Skullausleger anlegen
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={createRiemenAusleger} onChange={(e) => setCreateRiemenAusleger(e.target.checked)} />
                Riemenausleger anlegen
              </label>

              <div style={{ opacity: 0.75, fontSize: 12 }}>Hinweis: Mindestens einen Typ auswählen, sonst kann das Boot nicht gespeichert werden.</div>
            </div>

            {/* PRO SITZ */}
            {plaetze > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "grid", gap: 10 }}>
                <h4 style={{ margin: 0 }}>Pro Platz anlegen</h4>

                {Array.from({ length: plaetze }).map((_, i) => {
                  const sliderId = `shoe-zustand-${i}`;
                  const zustandIdx = shoeStateToIndex(shoes[i]?.zustand);

                  return (
                    <div key={i} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 10, display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>Platz {i + 1}</div>

                      {/* Schuhe */}
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 600, opacity: 0.9 }}>Schuhe</div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ opacity: 0.85 }}>Zustand:</span>
                            <strong>{shoeIndexToState(zustandIdx)}</strong>
                          </div>

                          <input id={sliderId} type="range" min="0" max="2" step="1" value={zustandIdx} list={`${sliderId}-list`} onChange={(e) => setShoe(i, { zustand: shoeIndexToState(e.target.value) })} />
                          <datalist id={`${sliderId}-list`}>
                            <option value="0" label="gut" />
                            <option value="1" label="ok" />
                            <option value="2" label="schlecht" />
                          </datalist>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
                            <span>gut</span>
                            <span>ok</span>
                            <span>schlecht</span>
                          </div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ width: 120, opacity: 0.85 }}>Größe</div>
                            <input
                              style={{ width: 120 }}
                              type="number"
                              step="0.5"
                              placeholder="z.B. 42.5"
                              value={shoes[i]?.groesse ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") return setShoe(i, { groesse: "" });
                                const num = Number(v);
                                if (!Number.isNaN(num)) setShoe(i, { groesse: num });
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Skullausleger */}
                      {createSkullAusleger && (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>Skullausleger (Platz {i + 1})</div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ width: 180, opacity: 0.9 }}>Dollenabstand (cm)</div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerSkullPerSeat[i]?.dollenabstand_cm ?? ""}
                              onChange={(e) =>
                                setAuslegerSkullPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...(next[i] || {}), dollenabstand_cm: e.target.value === "" ? "" : Number(e.target.value) };
                                  return next;
                                })
                              }
                            />
                          </div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ width: 180, opacity: 0.9 }}>Anlage (°)</div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerSkullPerSeat[i]?.anlage_deg ?? ""}
                              onChange={(e) =>
                                setAuslegerSkullPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...(next[i] || {}), anlage_deg: e.target.value === "" ? "" : Number(e.target.value) };
                                  return next;
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Riemenausleger */}
                      {createRiemenAusleger && (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>Riemenausleger (Platz {i + 1})</div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ width: 180, opacity: 0.9 }}>Dollenabstand (cm)</div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerRiemenPerSeat[i]?.dollenabstand_cm ?? ""}
                              onChange={(e) =>
                                setAuslegerRiemenPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...(next[i] || {}), dollenabstand_cm: e.target.value === "" ? "" : Number(e.target.value) };
                                  return next;
                                })
                              }
                            />
                          </div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ width: 180, opacity: 0.9 }}>Anlage (°)</div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerRiemenPerSeat[i]?.anlage_deg ?? ""}
                              onChange={(e) =>
                                setAuslegerRiemenPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...(next[i] || {}), anlage_deg: e.target.value === "" ? "" : Number(e.target.value) };
                                  return next;
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Rollsitz */}
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 600, opacity: 0.9 }}>Rollsitz (Platz {i + 1})</div>
                        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!rollsitzPerSeat[i]?.hochgebaut}
                            onChange={(e) =>
                              setRollsitzPerSeat((prev) => {
                                const next = [...prev];
                                next[i] = { ...(next[i] || {}), hochgebaut: e.target.checked };
                                return next;
                              })
                            }
                          />
                          Hochgebaut
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={add}>Speichern / Anlegen</button>
        {msg && <div style={{ opacity: 0.85 }}>{msg}</div>}
      </div>
    </div>
  );
}