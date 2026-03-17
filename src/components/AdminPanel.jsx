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

export default function AdminPanel({
  addBoatWithSeatItems,
  addSkullsSet,
  addRiemenSetPairs,
}) {
  const [kategorie, setKategorie] = useState("Boote");
  const [standort, setStandort] = useState("BRG");
  const [name, setName] = useState("");

  // Skulls / Riemen
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
  const [isDefekt, setIsDefekt] = useState(false);

  const [createSkullAusleger, setCreateSkullAusleger] = useState(true);
  const [createRiemenAusleger, setCreateRiemenAusleger] = useState(false);
  const [auslegerSkullPerSeat, setAuslegerSkullPerSeat] = useState([]);
  const [auslegerRiemenPerSeat, setAuslegerRiemenPerSeat] = useState([]);
  const [boatBaujahr, setBoatBaujahr] = useState("");
  const [boatVerein, setBoatVerein] = useState("");

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

  // ---------------------------------------------
  // Boot: Arrays pro Platz
  // ---------------------------------------------
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
      while (curShoes.length < plaetze) {
        curShoes.push({ zustand: "gut", groesse: "" });
      }
      return { ...prev, schuhe: curShoes };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plaetze, kategorie]);

  // ---------------------------------------------
  // Skulls / Riemen: Arrays auf count bringen
  // ---------------------------------------------
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

        while (next.length < n) {
          next.push({
            unterschiedliche_seiten: false,
            backbord: {},
            steuerbord: {},
          });
        }

        return next.map((item) => ({
          unterschiedliche_seiten: false,
          backbord: {},
          steuerbord: {},
          ...item,
          backbord: { ...(item?.backbord || {}) },
          steuerbord: { ...(item?.steuerbord || {}) },
        }));
      });
    }
  }, [kategorie, count]);

  // ---------------------------------------------
  // Allgemeine Setter
  // ---------------------------------------------
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

      if (val === "" || val === null || val === undefined) {
        delete cur[key];
      } else if (type === "number") {
        const num = Number(val);
        if (!Number.isNaN(num)) cur[key] = num;
      } else if (type === "bool") {
        cur[key] = !!val;
      } else {
        cur[key] = val;
      }

      next[idx] = cur;
      return next;
    });
  }

  // ---------------------------------------------
  // Riemen: 1 Paar = 1 Item
  // Erweiterung: Backbord / Steuerbord getrennt
  // ---------------------------------------------
  function setRiemenPairMetaField(pairIdx, key, val, type) {
    setRiemenPerPairDetails((prev) => {
      const next = [...prev];
      const cur = {
        unterschiedliche_seiten: false,
        backbord: {},
        steuerbord: {},
        ...(next[pairIdx] || {}),
        backbord: { ...(next[pairIdx]?.backbord || {}) },
        steuerbord: { ...(next[pairIdx]?.steuerbord || {}) },
      };

      if (val === "" || val === null || val === undefined) {
        delete cur[key];
      } else if (type === "number") {
        const num = Number(val);
        if (!Number.isNaN(num)) cur[key] = num;
      } else if (type === "bool") {
        cur[key] = !!val;
      } else {
        cur[key] = val;
      }

      next[pairIdx] = cur;
      return next;
    });
  }

  function toggleRiemenDifferentSides(pairIdx) {
    setRiemenPerPairDetails((prev) => {
      const next = [...prev];
      const cur = {
        unterschiedliche_seiten: false,
        backbord: {},
        steuerbord: {},
        ...(next[pairIdx] || {}),
        backbord: { ...(next[pairIdx]?.backbord || {}) },
        steuerbord: { ...(next[pairIdx]?.steuerbord || {}) },
      };

      const nextValue = !cur.unterschiedliche_seiten;
      cur.unterschiedliche_seiten = nextValue;

      // Wenn zurück auf "gleich" gestellt wird:
      // Steuerbord aus Backbord spiegeln, damit wieder ein gemeinsamer Stand da ist
      if (!nextValue) {
        cur.steuerbord = {
          ...(cur.steuerbord || {}),
          gesamtlaenge_cm:
            cur?.backbord?.gesamtlaenge_cm ??
            cur?.steuerbord?.gesamtlaenge_cm ??
            "",
          innenhebel_cm:
            cur?.backbord?.innenhebel_cm ??
            cur?.steuerbord?.innenhebel_cm ??
            "",
        };
      }

      next[pairIdx] = cur;
      return next;
    });
  }

  function setRiemenSideField(pairIdx, side, key, val, type) {
    setRiemenPerPairDetails((prev) => {
      const next = [...prev];
      const cur = {
        unterschiedliche_seiten: false,
        backbord: {},
        steuerbord: {},
        ...(next[pairIdx] || {}),
        backbord: { ...(next[pairIdx]?.backbord || {}) },
        steuerbord: { ...(next[pairIdx]?.steuerbord || {}) },
      };

      const sideData = { ...(cur[side] || {}) };

      if (val === "" || val === null || val === undefined) {
        delete sideData[key];
      } else if (type === "number") {
        const num = Number(val);
        if (!Number.isNaN(num)) sideData[key] = num;
      } else if (type === "bool") {
        sideData[key] = !!val;
      } else {
        sideData[key] = val;
      }

      cur[side] = sideData;

      // Wenn Seiten NICHT unterschiedlich sind:
      // Werte immer auf die andere Seite spiegeln
      if (!cur.unterschiedliche_seiten) {
        const otherSide = side === "backbord" ? "steuerbord" : "backbord";
        cur[otherSide] = {
          ...(cur[otherSide] || {}),
          [key]: sideData[key],
        };
      }

      // Autofill nur aus Paar 1 in weitere Paare
      const isLengthKey = key === "gesamtlaenge_cm" || key === "innenhebel_cm";
      const isPair1 = pairIdx === 0;
      const valueIsUsable =
        (type === "number" &&
          val !== "" &&
          val !== null &&
          val !== undefined &&
          !Number.isNaN(Number(val))) ||
        (type !== "number" &&
          val !== "" &&
          val !== null &&
          val !== undefined);

      next[pairIdx] = cur;

      if (isPair1 && isLengthKey && valueIsUsable) {
        for (let i = 1; i < next.length; i++) {
          const t = {
            unterschiedliche_seiten: false,
            backbord: {},
            steuerbord: {},
            ...(next[i] || {}),
            backbord: { ...(next[i]?.backbord || {}) },
            steuerbord: { ...(next[i]?.steuerbord || {}) },
          };

          if (t.unterschiedliche_seiten) continue;

          const hasBackbord =
            t?.backbord?.[key] !== undefined &&
            t?.backbord?.[key] !== null &&
            t?.backbord?.[key] !== "";

          const hasSteuerbord =
            t?.steuerbord?.[key] !== undefined &&
            t?.steuerbord?.[key] !== null &&
            t?.steuerbord?.[key] !== "";

          if (!hasBackbord && !hasSteuerbord) {
            const newVal = type === "number" ? Number(val) : val;
            t.backbord[key] = newVal;
            t.steuerbord[key] = newVal;
            next[i] = t;
          }
        }
      }

      return next;
    });
  }

  function getRiemenPayload() {
    const c = Math.max(1, Number(count || 1));

    return Array.from({ length: c }).map((_, i) => {
      const per = riemenPerPairDetails[i] || {};
      const unterschiedlicheSeiten = !!per?.unterschiedliche_seiten;

      const cleanSide = (sideObj = {}) => {
        const out = {};
        Object.entries(sideObj).forEach(([k, v]) => {
          if (v !== "" && v !== null && v !== undefined) out[k] = v;
        });
        return out;
      };

      const backbord = cleanSide(per?.backbord || {});
      const steuerbord = cleanSide(
        unterschiedlicheSeiten ? per?.steuerbord || {} : per?.backbord || {}
      );

      const meta = {};
      Object.entries(per).forEach(([k, v]) => {
        if (k === "backbord" || k === "steuerbord" || k === "unterschiedliche_seiten") {
          return;
        }
        if (v !== "" && v !== null && v !== undefined) meta[k] = v;
      });

      return {
        ...meta,
        unterschiedliche_seiten: unterschiedlicheSeiten,
        backbord,
        steuerbord,
      };
    });
  }

  // ---------------------------------------------
  // Speichern
  // ---------------------------------------------
  async function add() {
    setMsg("");
    const base = name.trim();
    if (!base) return setMsg("Bitte Name eingeben.");

    if (kategorie === "Boote") {
      const p = Number(boatDetails?.plaetze || 0);
      if (!p || p < 1) return setMsg("Bitte Plätze (>=1) eingeben.");
      if (!createSkullAusleger && !createRiemenAusleger) {
        return setMsg("Bitte mindestens Skullausleger oder Riemenausleger auswählen.");
      }

      await addBoatWithSeatItems({
        boatName: base,
        standort,
        boatDetails: {
          ...boatDetails,
          defekt: isDefekt,
        },
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
      setIsDefekt(false);
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
        perPairDetails: getRiemenPayload(),
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
      <h3>Material anlegen</h3>

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

        <input
          placeholder={kategorie === "Boote" ? "Bootname" : "Satz-Name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {(kategorie === "Skulls" || kategorie === "Riemen") && (
          <div
            style={{
              display: "grid",
              gap: 10,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>
                {kategorie === "Riemen" ? "Anzahl Riemenpaare" : "Anzahl Skulls"}
              </div>
              <input
                style={{ width: 120 }}
                type="number"
                min={1}
                step={1}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>

            {/* Shared */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Infos – für den kompletten Satz
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {(detailsSchema[kategorie] || [])
                  .filter((f) =>
                    kategorie === "Skulls"
                      ? SKULLS_SHARED_KEYS.includes(f.key)
                      : RIEMEN_SHARED_KEYS.includes(f.key)
                  )
                  .map((f) => {
                    const current = setSharedDetails?.[f.key];

                    if (f.type === "bool") {
                      return (
                        <label
                          key={f.key}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ width: 180, opacity: 0.9 }}>{f.label}</span>
                          <input
                            type="checkbox"
                            checked={!!current}
                            onChange={(e) => setSharedField(f.key, e.target.checked, "bool")}
                          />
                        </label>
                      );
                    }

                    return (
                      <div
                        key={f.key}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ width: 180, opacity: 0.9 }}>
                          {f.label}
                          {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                        </div>

                        <div style={{ flex: 1 }}>
                          {f.type === "number" && (
                            <input
                              style={{ width: "100%" }}
                              type="number"
                              value={current ?? ""}
                              step={f.step ?? "any"}
                              min={f.min ?? undefined}
                              onChange={(e) => setSharedField(f.key, e.target.value, "number")}
                            />
                          )}

                          {f.type === "text" && (
                            <input
                              style={{ width: "100%" }}
                              type="text"
                              value={current ?? ""}
                              placeholder={f.placeholder ?? ""}
                              onChange={(e) => setSharedField(f.key, e.target.value, "text")}
                            />
                          )}

                          {f.type === "select" && (
                            <select
                              style={{ width: "100%" }}
                              value={current ?? ""}
                              onChange={(e) => setSharedField(f.key, e.target.value, "select")}
                            >
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

            {/* Per Item / Pair */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {kategorie === "Skulls"
                  ? "Pro Skull – individuelle Infos"
                  : "Pro Riemenpaar – individuelle Infos"}
              </div>

              {kategorie === "Skulls" &&
                Array.from({ length: Math.max(1, Number(count || 1)) }).map((_, i) => {
                  const per = skullPerItemDetails[i] || {};

                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>Skull {i + 1}</div>

                      {(detailsSchema.Skulls || [])
                        .filter((f) => SKULLS_PER_ITEM_KEYS.includes(f.key))
                        .map((f) => {
                          const current = per?.[f.key];

                          if (f.type === "bool") {
                            return (
                              <label
                                key={f.key}
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ width: 180, opacity: 0.9 }}>{f.label}</span>
                                <input
                                  type="checkbox"
                                  checked={!!current}
                                  onChange={(e) =>
                                    setSkullItemField(i, f.key, e.target.checked, "bool")
                                  }
                                />
                              </label>
                            );
                          }

                          return (
                            <div
                              key={f.key}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ width: 180, opacity: 0.9 }}>
                                {f.label}
                                {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                              </div>

                              <div style={{ flex: 1 }}>
                                {f.type === "number" && (
                                  <input
                                    style={{ width: "100%" }}
                                    type="number"
                                    value={current ?? ""}
                                    step={f.step ?? "any"}
                                    min={f.min ?? undefined}
                                    onChange={(e) =>
                                      setSkullItemField(i, f.key, e.target.value, "number")
                                    }
                                  />
                                )}
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
                  const unterschiedlicheSeiten = !!per?.unterschiedliche_seiten;

                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>Riemenpaar {i + 1}</div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Ein Riemenpaar wird als <strong>ein einziges Material-Item</strong>{" "}
                        gespeichert. Backbord und Steuerbord sind Teil dieses einen Eintrags.
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ width: 220, opacity: 0.9 }}>Seiten unterschiedlich</div>
                          <label
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                            title="Aktivieren, wenn Backbord und Steuerbord unterschiedliche Maße haben"
                          >
                            <input
                              type="checkbox"
                              checked={unterschiedlicheSeiten}
                              onChange={() => toggleRiemenDifferentSides(i)}
                            />
                            <span style={{ opacity: 0.9 }}>
                              {unterschiedlicheSeiten ? "Ja" : "Nein"}
                            </span>
                          </label>
                        </div>

                      {(detailsSchema.Riemen || [])
                        .filter(
                          (f) =>
                            RIEMEN_PER_PAIR_KEYS.includes(f.key) &&
                            ![
                              "unterschiedliche_seiten",
                              "unterschiedliche_laenge",
                              "gesamtlaenge_cm",
                              "innenhebel_cm",
                              "gesamtlaenge_backbord_cm",
                              "gesamtlaenge_steuerbord_cm",
                              "innenhebel_backbord_cm",
                              "innenhebel_steuerbord_cm",
                            ].includes(f.key)
                        )
                        .map((f) => {
                          const current = per?.[f.key];

                          if (f.type === "bool") {
                            return (
                              <label
                                key={f.key}
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ width: 220, opacity: 0.9 }}>{f.label}</span>
                                <input
                                  type="checkbox"
                                  checked={!!current}
                                  onChange={(e) =>
                                    setRiemenPairMetaField(i, f.key, e.target.checked, "bool")
                                  }
                                />
                              </label>
                            );
                          }

                          return (
                            <div
                              key={f.key}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ width: 220, opacity: 0.9 }}>
                                {f.label}
                                {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                              </div>

                              <div style={{ flex: 1 }}>
                                {f.type === "number" && (
                                  <input
                                    style={{ width: "100%" }}
                                    type="number"
                                    value={current ?? ""}
                                    step={f.step ?? "any"}
                                    min={f.min ?? undefined}
                                    onChange={(e) =>
                                      setRiemenPairMetaField(i, f.key, e.target.value, "number")
                                    }
                                  />
                                )}

                                {f.type === "text" && (
                                  <input
                                    style={{ width: "100%" }}
                                    type="text"
                                    value={current ?? ""}
                                    placeholder={f.placeholder ?? ""}
                                    onChange={(e) =>
                                      setRiemenPairMetaField(i, f.key, e.target.value, "text")
                                    }
                                  />
                                )}

                                {f.type === "select" && (
                                  <select
                                    style={{ width: "100%" }}
                                    value={current ?? ""}
                                    onChange={(e) =>
                                      setRiemenPairMetaField(i, f.key, e.target.value, "select")
                                    }
                                  >
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

                      {!unterschiedlicheSeiten && (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            borderTop: "1px solid rgba(255,255,255,0.15)",
                            paddingTop: 10,
                          }}
                        >
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>
                            Maße für beide Seiten gemeinsam
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>Gesamtlänge (cm)</div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.backbord?.gesamtlaenge_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "backbord",
                                  "gesamtlaenge_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>Innenhebel (cm)</div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.backbord?.innenhebel_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "backbord",
                                  "innenhebel_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {unterschiedlicheSeiten && (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            borderTop: "1px solid rgba(255,255,255,0.15)",
                            paddingTop: 10,
                          }}
                        >
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>
                            Seitenweise Maße
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>
                              Gesamtlänge Backbord (cm)
                            </div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.backbord?.gesamtlaenge_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "backbord",
                                  "gesamtlaenge_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>
                              Gesamtlänge Steuerbord (cm)
                            </div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.steuerbord?.gesamtlaenge_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "steuerbord",
                                  "gesamtlaenge_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>
                              Innenhebel Backbord (cm)
                            </div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.backbord?.innenhebel_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "backbord",
                                  "innenhebel_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ width: 220, opacity: 0.9 }}>
                              Innenhebel Steuerbord (cm)
                            </div>
                            <input
                              style={{ flex: 1 }}
                              type="number"
                              value={per?.steuerbord?.innenhebel_cm ?? ""}
                              step="any"
                              min={0}
                              onChange={(e) =>
                                setRiemenSideField(
                                  i,
                                  "steuerbord",
                                  "innenhebel_cm",
                                  e.target.value,
                                  "number"
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {i === 0 && (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Tipp: Maße aus <strong>Riemenpaar 1</strong> werden als Vorschlag
                          in die anderen Paare übernommen, wenn dort noch nichts eingetragen
                          ist und die Seiten nicht unterschiedlich sind.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Boot UI */}
        {kategorie === "Boote" && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: 10,
              display: "grid",
              gap: 10,
            }}
          >
            <h4 style={{ margin: 0 }}>Boot Infos</h4>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>Plätze</div>
              <input
                style={{ width: 120 }}
                type="number"
                min={1}
                step={1}
                value={boatDetails?.plaetze ?? ""}
                onChange={(e) => setBoatField("plaetze", e.target.value, "number")}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>Gewicht</div>
              <input
                style={{ flex: 1 }}
                type="text"
                placeholder="z.B. 80-90"
                value={boatDetails?.gewicht_kg ?? ""}
                onChange={(e) => setBoatField("gewicht_kg", e.target.value, "text")}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>Bootsform</div>
              <input
                style={{ flex: 1 }}
                type="text"
                placeholder="z.B. X25"
                value={boatDetails?.Bootsform ?? ""}
                onChange={(e) => setBoatField("Bootsform", e.target.value, "text")}
              />
            </div>
            
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>Baujahr</div>
              <input
                style={{ flex: 1 }}
                type="number"
                placeholder="z.B. 2020"
                value={boatDetails?.Baujahr ?? ""}
                onChange={(e) => setBoatField("Baujahr", e.target.value, "number")}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>Verein</div>
              <input
                style={{ flex: 1 }}
                type="text"
                placeholder="z.B. BonnerRG"
                value={boatDetails?.Bootsform ?? ""}
                onChange={(e) => setBoatField("Bootsform", e.target.value, "text")}
              />
            </div>          

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: 180, opacity: 0.9 }}>aktueller Nutzer</div>
              <input
                style={{ flex: 1 }}
                type="text"
                placeholder="z.B. Max Mustermann"
                value={boatDetails?.aktueller_nutzer ?? ""}
                onChange={(e) => setBoatField("aktueller_nutzer", e.target.value, "text")}
              />
            </div>

            {/* Hülle */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <h4 style={{ margin: 0 }}>Hülle</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={hasHuelle}
                  onChange={(e) => setHasHuelle(e.target.checked)}
                />
                Hülle vorhanden
              </label>

              {hasHuelle && (
                <>
                  <input
                    value={huelleName}
                    onChange={(e) => setHuelleName(e.target.value)}
                    placeholder="Hüllen-Name"
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ width: 180, opacity: 0.9 }}>Notiz</div>
                    <input
                      style={{ flex: 1 }}
                      value={huelleNotiz}
                      onChange={(e) => setHuelleNotiz(e.target.value)}
                      placeholder="z.B. passt zu ..."
                    />
                  </div>
                </>
              )}

              {!hasHuelle && (
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Hinweis: Es wird <strong>keine</strong> Hülle als eigenes Material
                  angelegt. Im Boot wird gespeichert: „Hülle vorhanden = Nein“.
                </div>
              )}
            </div>

            {/* Steuerplatz */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <h4 style={{ margin: 0 }}>Steuerplatz</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={hasSteuerplatz}
                  onChange={(e) => setHasSteuerplatz(e.target.checked)}
                />
                Steuerplatz vorhanden
              </label>
            </div>

            {/* Defekt */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <h4 style={{ margin: 0 }}>Defekt</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={isDefekt}
                  onChange={(e) => setIsDefekt(e.target.checked)}
                />
                Defekt
              </label>
            </div>

            {/* Ausleger Typen */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <h4 style={{ margin: 0 }}>Ausleger-Typen</h4>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={createSkullAusleger}
                  onChange={(e) => setCreateSkullAusleger(e.target.checked)}
                />
                Skullausleger anlegen
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={createRiemenAusleger}
                  onChange={(e) => setCreateRiemenAusleger(e.target.checked)}
                />
                Riemenausleger anlegen
              </label>

              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Hinweis: Mindestens einen Typ auswählen, sonst kann das Boot nicht
                gespeichert werden.
              </div>
            </div>

            {/* PRO SITZ */}
            {plaetze > 0 && (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  paddingTop: 10,
                  display: "grid",
                  gap: 10,
                }}
              >
                <h4 style={{ margin: 0 }}>Pro Platz anlegen</h4>

                {Array.from({ length: plaetze }).map((_, i) => {
                  const sliderId = `shoe-zustand-${i}`;
                  const zustandIdx = shoeStateToIndex(shoes[i]?.zustand);

                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>Platz {i + 1}</div>

                      {/* Schuhe */}
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 600, opacity: 0.9 }}>Schuhe</div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <span style={{ opacity: 0.85 }}>Zustand:</span>
                            <strong>{shoeIndexToState(zustandIdx)}</strong>
                          </div>

                          <input
                            id={sliderId}
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={zustandIdx}
                            list={`${sliderId}-list`}
                            onChange={(e) =>
                              setShoe(i, {
                                zustand: shoeIndexToState(e.target.value),
                              })
                            }
                          />

                          <datalist id={`${sliderId}-list`}>
                            <option value="0" label="gut" />
                            <option value="1" label="ok" />
                            <option value="2" label="schlecht" />
                          </datalist>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 12,
                              opacity: 0.8,
                            }}
                          >
                            <span>gut</span>
                            <span>ok</span>
                            <span>schlecht</span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
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
                                if (!Number.isNaN(num)) {
                                  setShoe(i, { groesse: num });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Skullausleger */}
                      {createSkullAusleger && (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>
                            Skullausleger (Platz {i + 1})
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ width: 180, opacity: 0.9 }}>
                              Dollenabstand (cm)
                            </div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerSkullPerSeat[i]?.dollenabstand_cm ?? ""}
                              onChange={(e) =>
                                setAuslegerSkullPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = {
                                    ...(next[i] || {}),
                                    dollenabstand_cm:
                                      e.target.value === "" ? "" : Number(e.target.value),
                                  };
                                  return next;
                                })
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
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
                                  next[i] = {
                                    ...(next[i] || {}),
                                    anlage_deg:
                                      e.target.value === "" ? "" : Number(e.target.value),
                                  };
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
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>
                            Riemenausleger (Platz {i + 1})
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ width: 180, opacity: 0.9 }}>
                              Dollenabstand (cm)
                            </div>
                            <input
                              style={{ width: 140 }}
                              type="number"
                              min={0}
                              step={0.1}
                              value={auslegerRiemenPerSeat[i]?.dollenabstand_cm ?? ""}
                              onChange={(e) =>
                                setAuslegerRiemenPerSeat((prev) => {
                                  const next = [...prev];
                                  next[i] = {
                                    ...(next[i] || {}),
                                    dollenabstand_cm:
                                      e.target.value === "" ? "" : Number(e.target.value),
                                  };
                                  return next;
                                })
                              }
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
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
                                  next[i] = {
                                    ...(next[i] || {}),
                                    anlage_deg:
                                      e.target.value === "" ? "" : Number(e.target.value),
                                  };
                                  return next;
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Rollsitz */}
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 600, opacity: 0.9 }}>
                          Rollsitz (Platz {i + 1})
                        </div>
                        <label
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!rollsitzPerSeat[i]?.hochgebaut}
                            onChange={(e) =>
                              setRollsitzPerSeat((prev) => {
                                const next = [...prev];
                                next[i] = {
                                  ...(next[i] || {}),
                                  hochgebaut: e.target.checked,
                                };
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