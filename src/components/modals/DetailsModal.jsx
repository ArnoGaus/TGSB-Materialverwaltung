import { useEffect, useState } from "react";
import { shoeIndexToState, shoeStateToIndex } from "../../lib/schema";

export default function DetailsModal({
  item,
  schema,
  values,
  onClose,
  onSave,
  canEdit = false,
  isAdmin = false,
  onSaveName,
  onRenameBundleBaseName,
}) {
  const [edit, setEdit] = useState(false);
  const [local, setLocal] = useState(values || {});
  const rawFields = schema[item?.kategorie] || [];

  const [nameEdit, setNameEdit] = useState(item?.name || "");
  const [bundleRename, setBundleRename] = useState("");

  const isRiemen = item?.kategorie === "Riemen";
  const unterschiedlicheSeiten = isRiemen && !!local?.unterschiedliche_seiten;

  const riemenMetaFields = rawFields.filter((f) => {
    if (!isRiemen) return true;
    return ![
      "unterschiedliche_seiten",
      "unterschiedliche_laenge",
      "gesamtlaenge_cm",
      "innenhebel_cm",
      "gesamtlaenge_backbord_cm",
      "gesamtlaenge_steuerbord_cm",
      "innenhebel_backbord_cm",
      "innenhebel_steuerbord_cm",
    ].includes(f.key);
  });

  useEffect(() => {
    setLocal(values || {});
  }, [values]);

  useEffect(() => {
    setNameEdit(item?.name || "");
    setBundleRename("");
    setEdit(false);
  }, [item?.id, item?.name]);

  function setField(key, val, type) {
    if (val === "" || val === null || val === undefined) {
      const copy = { ...local };
      delete copy[key];
      setLocal(copy);
      return;
    }

    if (type === "number") {
      const num = Number(val);
      if (Number.isNaN(num)) return;
      setLocal((prev) => ({ ...prev, [key]: num }));
      return;
    }

    if (type === "bool") {
      setLocal((prev) => ({ ...prev, [key]: !!val }));
      return;
    }

    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function setRiemenSideField(side, key, val, type) {
    setLocal((prev) => {
      const next = {
        ...prev,
        backbord: { ...(prev?.backbord || {}) },
        steuerbord: { ...(prev?.steuerbord || {}) },
      };

      const sideData = { ...(next?.[side] || {}) };

      if (val === "" || val === null || val === undefined) {
        delete sideData[key];
      } else if (type === "number") {
        const num = Number(val);
        if (Number.isNaN(num)) return prev;
        sideData[key] = num;
      } else if (type === "bool") {
        sideData[key] = !!val;
      } else {
        sideData[key] = val;
      }

      next[side] = sideData;

      if (!next.unterschiedliche_seiten) {
        const otherSide = side === "backbord" ? "steuerbord" : "backbord";
        next[otherSide] = {
          ...(next[otherSide] || {}),
          [key]: sideData[key],
        };
      }

      return next;
    });
  }

  const plaetze = item?.kategorie === "Boote" ? Number(local?.plaetze ?? 0) : 0;
  const shoes = Array.isArray(local?.schuhe) ? local.schuhe : [];

  function setShoe(idx, patch) {
    const next = [...shoes];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setLocal((prev) => ({ ...prev, schuhe: next }));
  }

  if (!item) return null;

  const canRenameBundle = isAdmin && item.bundle_id && (item.kategorie === "Skulls" || item.kategorie === "Riemen");
  const fields = (isRiemen ? riemenMetaFields : rawFields).filter((f) => !["backbord", "steuerbord"].includes(f.key));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h3>Info: {item.name}</h3>
        <p style={{ opacity: 0.8, marginTop: 4 }}>
          Kategorie: <strong>{item.kategorie}</strong>
        </p>

        {isAdmin && (
          <div
            style={{
              marginTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Admin: Namen verwalten</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 180, opacity: 0.9 }}>Name</div>
              <input style={{ flex: 1 }} value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} />
              <button
                className="admin-btn"
                onClick={async () => {
                  const ok = await onSaveName?.(item.id, nameEdit);
                  if (ok) alert("Name gespeichert.");
                }}
              >
                Name speichern
              </button>
            </div>

            {canRenameBundle && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 180, opacity: 0.9 }}>Satz-Name (Bundle)</div>
                <input
                  style={{ flex: 1 }}
                  value={bundleRename}
                  onChange={(e) => setBundleRename(e.target.value)}
                  placeholder="z.B. BRG Blau"
                />
                <button
                  className="admin-btn"
                  onClick={async () => {
                    const ok = await onRenameBundleBaseName?.(item.bundle_id, bundleRename);
                    if (ok) alert("Satz umbenannt.");
                  }}
                >
                  Satz umbenennen
                </button>
              </div>
            )}
          </div>
        )}

        {!canEdit && (
          <div className="readonly-note" style={{ marginTop: 12 }}>
            Besucher können Details nur ansehen. Änderungen sind für User und Admins erlaubt.
          </div>
        )}

        {fields.length === 0 && !isRiemen ? (
          <p style={{ marginTop: 16, opacity: 0.7 }}>Für diese Kategorie sind keine Info-Felder definiert.</p>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {fields.map((f) => {
              const current = local?.[f.key];

              return (
                <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 180, opacity: 0.9 }}>
                    {f.label}
                    {f.unit ? <span style={{ opacity: 0.7 }}> ({f.unit})</span> : null}
                  </div>

                  {!edit ? (
                    <div style={{ flex: 1 }}>
                      {f.type === "bool" ? (
                        current === undefined || current === false ? "Nein" : "Ja"
                      ) : current === undefined ? (
                        <span style={{ opacity: 0.6 }}>–</span>
                      ) : (
                        <>
                          {String(current)}
                          {f.unit ? <span style={{ opacity: 0.7 }}> {f.unit}</span> : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      {f.type === "number" && (
                        <input
                          style={{ width: "100%" }}
                          type="number"
                          value={current ?? ""}
                          step={f.step ?? "any"}
                          min={f.min ?? undefined}
                          onChange={(e) => setField(f.key, e.target.value, "number")}
                        />
                      )}

                      {f.type === "text" && (
                        <input
                          style={{ width: "100%" }}
                          type="text"
                          value={current ?? ""}
                          placeholder={f.placeholder ?? ""}
                          onChange={(e) => setField(f.key, e.target.value, "text")}
                        />
                      )}

                      {f.type === "select" && (
                        <select
                          style={{ width: "100%" }}
                          value={current ?? ""}
                          onChange={(e) => setField(f.key, e.target.value, "select")}
                        >
                          {(f.options || [""]).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt === "" ? "—" : opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {f.type === "bool" && (
                        <input
                          type="checkbox"
                          checked={!!current}
                          onChange={(e) => setLocal((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isRiemen && (
              <div
                style={{
                  marginTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  paddingTop: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>Riemenmaße</div>

                {!edit ? (
                  <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 180, opacity: 0.9 }}>Seiten unterschiedlich</div>
                      <div>{unterschiedlicheSeiten ? "Ja" : "Nein"}</div>
                    </div>

                    {!unterschiedlicheSeiten ? (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge</div>
                          <div>{local?.backbord?.gesamtlaenge_cm ?? local?.steuerbord?.gesamtlaenge_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel</div>
                          <div>{local?.backbord?.innenhebel_cm ?? local?.steuerbord?.innenhebel_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge Backbord</div>
                          <div>{local?.backbord?.gesamtlaenge_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge Steuerbord</div>
                          <div>{local?.steuerbord?.gesamtlaenge_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel Backbord</div>
                          <div>{local?.backbord?.innenhebel_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel Steuerbord</div>
                          <div>{local?.steuerbord?.innenhebel_cm ?? <span style={{ opacity: 0.6 }}>–</span>} cm</div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 180, opacity: 0.9 }}>Seiten unterschiedlich</div>
                      <input
                        type="checkbox"
                        checked={!!local?.unterschiedliche_seiten}
                        onChange={(e) =>
                          setLocal((prev) => {
                            const next = {
                              ...prev,
                              unterschiedliche_seiten: e.target.checked,
                              backbord: { ...(prev?.backbord || {}) },
                              steuerbord: { ...(prev?.steuerbord || {}) },
                            };

                            if (!e.target.checked) {
                              next.steuerbord = {
                                ...(next.steuerbord || {}),
                                gesamtlaenge_cm: next?.backbord?.gesamtlaenge_cm ?? next?.steuerbord?.gesamtlaenge_cm ?? "",
                                innenhebel_cm: next?.backbord?.innenhebel_cm ?? next?.steuerbord?.innenhebel_cm ?? "",
                              };
                            }

                            return next;
                          })
                        }
                      />
                    </div>

                    {!unterschiedlicheSeiten ? (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.backbord?.gesamtlaenge_cm ?? ""}
                            onChange={(e) => setRiemenSideField("backbord", "gesamtlaenge_cm", e.target.value, "number")}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.backbord?.innenhebel_cm ?? ""}
                            onChange={(e) => setRiemenSideField("backbord", "innenhebel_cm", e.target.value, "number")}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge Backbord</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.backbord?.gesamtlaenge_cm ?? ""}
                            onChange={(e) => setRiemenSideField("backbord", "gesamtlaenge_cm", e.target.value, "number")}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Gesamtlänge Steuerbord</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.steuerbord?.gesamtlaenge_cm ?? ""}
                            onChange={(e) => setRiemenSideField("steuerbord", "gesamtlaenge_cm", e.target.value, "number")}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel Backbord</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.backbord?.innenhebel_cm ?? ""}
                            onChange={(e) => setRiemenSideField("backbord", "innenhebel_cm", e.target.value, "number")}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 180, opacity: 0.9 }}>Innenhebel Steuerbord</div>
                          <input
                            style={{ flex: 1 }}
                            type="number"
                            min={0}
                            step="any"
                            value={local?.steuerbord?.innenhebel_cm ?? ""}
                            onChange={(e) => setRiemenSideField("steuerbord", "innenhebel_cm", e.target.value, "number")}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {item.kategorie === "Boote" && plaetze > 0 && (
              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: "10px 0" }}>Schuhe (pro Platz)</h4>
                <div style={{ display: "grid", gap: 10 }}>
                  {Array.from({ length: plaetze }).map((_, i) => {
                    const sliderId = `shoe-modal-${item.id}-${i}`;
                    const zustandIdx = shoeStateToIndex(shoes[i]?.zustand);

                    return (
                      <div
                        key={i}
                        style={{
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Platz {i + 1}</div>

                        {!edit ? (
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1 }}>
                              Zustand: <strong>{shoeIndexToState(zustandIdx)}</strong>
                            </div>
                            <div style={{ width: 180 }}>
                              Größe: {shoes[i]?.groesse ?? <span style={{ opacity: 0.6 }}>–</span>}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
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
                              onChange={(e) => setShoe(i, { zustand: shoeIndexToState(e.target.value) })}
                            />

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
                                style={{ width: 140 }}
                                type="number"
                                step="0.5"
                                placeholder="z.B. 42.5"
                                value={shoes[i]?.groesse ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") return setShoe(i, { groesse: "" });
                                  const num = Number(value);
                                  if (!Number.isNaN(num)) setShoe(i, { groesse: num });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          {!edit ? (
            <>
              {canEdit && <button onClick={() => setEdit(true)}>Ändern</button>}
              <button className="secondary" onClick={onClose}>
                Schließen
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary"
                onClick={() => {
                  setLocal(values || {});
                  setEdit(false);
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  const ok = await onSave(local);
                  if (ok) setEdit(false);
                }}
              >
                Speichern
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
