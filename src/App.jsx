import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const kategorien = ["Alle", "Boote", "Skulls", "Riemen", "Ausleger", "Sonstiges"];
const standorte = ["BRG", "SRV", "Fühlingen", "Extern"];


const detailsSchema = {
  Boote: [
    { key: "plaetze", label: "Plätze", type: "number", step: 1, min: 0 },
    { key: "gewicht_kg", label: "Gewicht", type: "number", step: 0.1, min: 0, unit: "kg" },
  ],
  Skulls: [
    { key: "gesamtlaenge_cm", label: "Gesamtlänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "innenhebel_cm", label: "Innenhebellänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    {
      key: "schafttyp",
      label: "Schafttyp",
      type: "select",
      options: ["", "Skinny", "Ultralight"],
    },
    {
      key: "blattform",
      label: "Blattform", 
      type: "select",
     options: ["", "Smoothy2", "Plain", "Comp", 'Fat2', "Macon"],
    },
  ],
  Riemen: [
    { key: "gesamtlaenge_cm", label: "Gesamtlänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "innenhebel_cm", label: "Innenhebellänge", type: "number", step: 0.1, min: 0, unit: "cm" },
    {
      key: "schafttyp",
      label: "Schafttyp",
      type: "select",
      options: ["", "Skinny", "Ultralight"],
    },
        {
      key: "blattform",
      label: "Blattform", 
      type: "select",
     options: ["", "Smoothy2", "Plain", "Comp", "Fat2", "Macon",],
    },
  ],
  Ausleger: [
    { key: "dollenabstand_cm", label: "Dollenabstand", type: "number", step: 0.1, min: 0, unit: "cm" },
    { key: "anlage_°", label: "Anlage", type: "number", step: 0.1, min: 0, unit: "°" },
  ],
  Sonstiges: [{ key: "notiz", label: "Notiz", type: "text", placeholder: "Freitext..." }],
};

function normalizeDetailsForCategory(category, values) {
  const fields = detailsSchema[category] || [];
  const allowed = new Set(fields.map((f) => f.key));
  const out = {};
  for (const [k, v] of Object.entries(values || {})) {
    if (allowed.has(k) && v !== "" && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [material, setMaterial] = useState([]);
  const [profile, setProfile] = useState(null);

  const [history, setHistory] = useState({});
  const [openHistoryId, setOpenHistoryId] = useState(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  const isAdmin = profile?.role === "admin";

  //Details State je Material
  const [detailsByMaterialId, setDetailsByMaterialId] = useState({});
  const [openDetailsId, setOpenDetailsId] = useState(null);

  //Login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else {
        setProfile(null);
        setMaterial([]);
        setShowAdmin(false);
        setOpenHistoryId(null);
        setOpenDetailsId(null);
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) console.error("Profile Fehler:", error);

    setProfile(data || null);
    fetchMaterial();
  }

  // MATERIAL LADEN
  async function fetchMaterial() {
    const { data, error } = await supabase.from("material").select("*").order("name");
    if (error) console.error("Material laden Fehler:", error);
    setMaterial(data || []);
  }

  //Verlauf laden
  async function loadHistory(materialId) {
    const { data: hist, error: histError } = await supabase
      .from("material_history")
      .select("id, material_id, alter_standort, neuer_standort, geändert_am, geändert_von")
      .eq("material_id", materialId)
      .order("geändert_am", { ascending: true });

    if (histError) {
      console.error("History Fehler:", histError);
      setHistory((prev) => ({ ...prev, [materialId]: [] }));
      return;
    }

    if (!hist || hist.length === 0) {
      setHistory((prev) => ({ ...prev, [materialId]: [] }));
      return;
    }

    const userIds = [...new Set(hist.map((h) => h.geändert_von).filter(Boolean))];

    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profs, error: profError } = await supabase.from("profiles").select("id, name").in("id", userIds);
      if (profError) console.error("Profiles Fehler:", profError);
      else profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p.name]));
    }

    const formatted = hist.map((h) => {
      const userName = profileMap[h.geändert_von] || "Unbekannt";
      return `${new Date(h.geändert_am).toLocaleString("de-DE")} – ${userName}: ${h.alter_standort} → ${h.neuer_standort}`;
    });

    setHistory((prev) => ({ ...prev, [materialId]: formatted }));
  }

  // DETAILS LADEN / SPEICHERN
  async function loadDetails(materialId) {
    const { data, error } = await supabase
      .from("material_details")
      .select("material_id, values")
      .eq("material_id", materialId)
      .single();

    if (error) {
      setDetailsByMaterialId((prev) => ({ ...prev, [materialId]: {} }));
      return;
    }

    setDetailsByMaterialId((prev) => ({ ...prev, [materialId]: data?.values || {} }));
  }

  async function saveDetails(materialId, newValues) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      material_id: materialId,
      values: newValues,
      updated_by: user?.id ?? null,
    };

    const { error } = await supabase.from("material_details").upsert(payload, { onConflict: "material_id" });

    if (error) {
      console.error("Details speichern Fehler:", error);
      alert("Speichern fehlgeschlagen: " + error.message);
      return false;
    }

    setDetailsByMaterialId((prev) => ({ ...prev, [materialId]: newValues }));
    return true;
  }


  // MATERIAL HINZUFÜGEN (nur Admin) + DETAILS direkt mit speichern
  async function addMaterialWithDetails({ name, kategorie, standort, details }) {
    if (!name || !showAdmin || !isAdmin) return;

    const { data: inserted, error } = await supabase
      .from("material")
      .insert({ name, kategorie, standort })
      .select()
      .single();

    if (error) {
      console.error("Material hinzufügen Fehler:", error);
      alert("Fehler beim Hinzufügen: " + error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // optional: Standort-History
    const { error: historyError } = await supabase.from("material_history").insert({
      material_id: inserted.id,
      alter_standort: "",
      neuer_standort: standort,
      geändert_von: user?.id ?? null,
      geändert_am: new Date().toISOString(),
    });
    if (historyError) console.error("History hinzufügen Fehler:", historyError);

    // ✅ Details direkt anlegen (upsert)
    const cleaned = normalizeDetailsForCategory(kategorie, details);
    if (Object.keys(cleaned).length > 0) {
      const { error: detError } = await supabase.from("material_details").upsert(
        {
          material_id: inserted.id,
          values: cleaned,
          updated_by: user?.id ?? null,
        },
        { onConflict: "material_id" }
      );
      if (detError) console.error("Details anlegen Fehler:", detError);
    }

    fetchMaterial();
  }

  // STANDORT ÄNDERN (für alle erlaubt)
  async function updateStandort(item, neuerStandort) {
    if (item.standort === neuerStandort) return;

    const alterStandort = item.standort;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase.from("material").update({ standort: neuerStandort }).eq("id", item.id);
    if (updateError) {
      console.error("Material Update Fehler:", updateError);
      return;
    }

    const { error: historyError } = await supabase.from("material_history").insert({
      material_id: item.id,
      alter_standort: alterStandort,
      neuer_standort: neuerStandort,
      geändert_von: user?.id ?? null,
      geändert_am: new Date().toISOString(),
    });
    if (historyError) console.error("History Fehler:", historyError);

    fetchMaterial();
  }

  // LÖSCHEN (nur Admin)
  function openDeleteDialog(item) {
    if (!showAdmin || !isAdmin) return;
    setDeleteItem(item);
  }

  async function deleteMaterialConfirmed() {
    if (!deleteItem || !isAdmin) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("material").delete().eq("id", deleteItem.id);
    if (error) {
      console.error("Material löschen Fehler:", error);
      return;
    }

    const { error: historyError } = await supabase.from("material_history").insert({
      material_id: deleteItem.id,
      alter_standort: deleteItem.standort,
      neuer_standort: "GELÖSCHT",
      geändert_von: user?.id ?? null,
      geändert_am: new Date().toISOString(),
    });
    if (historyError) console.error("Delete-History Fehler:", historyError);

    setDeleteItem(null);
    fetchMaterial();
  }

  // LOGIN SCREEN
  if (!session) return <Auth />;

  // APP UI
  return (
    <div className="container">
      <div className="header">
        <h1>TGSB Material Verwaltung</h1>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAdmin && (
            <button onClick={() => setShowAdmin(!showAdmin)}>{showAdmin ? "Admin verlassen" : "Admin"}</button>
          )}

          <button className="logout" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </div>

      {/* Admin Panel sichtbar wenn showAdmin */}
      {isAdmin && showAdmin && <AdminPanel onAddMaterial={addMaterialWithDetails} detailsSchema={detailsSchema} />}

      <MaterialList
        material={material}
        updateStandort={updateStandort}
        openDeleteDialog={openDeleteDialog}
        setOpenHistoryId={setOpenHistoryId}
        showAdmin={showAdmin && isAdmin}
        loadHistory={loadHistory}
        onOpenDetails={async (id) => {
          await loadDetails(id);
          setOpenDetailsId(id);
        }}
      />

      {/* Verlauf Modal */}
      {openHistoryId && (
        <HistoryModal
          materialName={material.find((m) => m.id === openHistoryId)?.name || "Unbekannt"}
          entries={history[openHistoryId] || []}
          onClose={() => setOpenHistoryId(null)}
        />
      )}

      {/* Details Modal (Änderung für ALLE möglich) */}
      {openDetailsId && (
        <DetailsModal
          item={material.find((m) => m.id === openDetailsId)}
          schema={detailsSchema}
          values={detailsByMaterialId[openDetailsId] || {}}
          onClose={() => setOpenDetailsId(null)}
          onSave={(vals) => saveDetails(openDetailsId, vals)}
          canEdit={true}
        />
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <DeleteModal
          materialName={deleteItem?.name || "Unbekannt"}
          onCancel={() => setDeleteItem(null)}
          onConfirm={deleteMaterialConfirmed}
        />
      )}
    </div>
  );
}

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function login() {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg("E-Mail-Adresse oder Passwort ist falsch.");
  }

  return (
    <div className="login-card">
      <h2>TGSB Materialverwaltung</h2>
      <h2>Login</h2>

      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button onClick={login}>Login</button>

      {errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(255,0,0,0.12)",
            border: "1px solid rgba(255,0,0,0.25)",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function MaterialList({ material, updateStandort, openDeleteDialog, setOpenHistoryId, showAdmin, loadHistory, onOpenDetails }) {
  const [search, setSearch] = useState("");
  const [filterKategorie, setFilterKategorie] = useState("Alle");

  const groupedByStandort = useMemo(() => {
    const grouped = {};
    (material || []).forEach((item) => {
      if (!grouped[item.standort]) grouped[item.standort] = [];
      grouped[item.standort].push(item);
    });
    return grouped;
  }, [material]);

  const tableCategories = ["Boote", "Skulls", "Riemen", "Ausleger", "Sonstiges"];

  return (
    <div>
      <div className="card">
        <h3>Suche & Filter</h3>
        <input placeholder="🔎 Suche nach Name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterKategorie} onChange={(e) => setFilterKategorie(e.target.value)}>
          {kategorien.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>

      {Object.keys(groupedByStandort).map((standortName) => {
        const items = groupedByStandort[standortName].filter(
          (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) &&
            (filterKategorie === "Alle" || item.kategorie === filterKategorie)
        );

        return (
          <div key={standortName} className="card">
            <h2>Standort: {standortName}</h2>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {tableCategories.map((cat) => {
                const catItems = items.filter((i) => i.kategorie === cat);

                return (
                  <div key={cat} style={{ flex: "1 1 300px" }}>
                    <h3>{cat}</h3>

                    <table className="material-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Standort</th>
                          <th>Info</th>
                          <th>Verlauf</th>
                          {showAdmin && <th>Löschen</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {catItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>

                            <td>
                              <select value={item.standort} onChange={(e) => updateStandort(item, e.target.value)}>
                                {standorte.map((s) => (
                                  <option key={s}>{s}</option>
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
                        ))}

                        {catItems.length === 0 && (
                          <tr>
                            <td colSpan={showAdmin ? 5 : 4} style={{ opacity: 0.5 }}>
                              Keine Einträge
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryModal({ materialName, entries, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h3>Verlauf: {materialName}</h3>

        {entries.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Kein Verlauf vorhanden (oder keine Rechte zum Lesen).</p>
        ) : (
          <ul>
            {entries.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailsModal({ item, schema, values, onClose, onSave, canEdit = true }) {
  const [edit, setEdit] = useState(false);
  const [local, setLocal] = useState(values || {});
  const fields = schema[item?.kategorie] || [];

  useEffect(() => setLocal(values || {}), [values]);

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
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  if (!item) return null;

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

        {fields.length === 0 ? (
          <p style={{ marginTop: 16, opacity: 0.7 }}>Für diese Kategorie sind keine Info-Felder definiert.</p>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {fields.map((f) => {
              const current = local?.[f.key];
              return (
                <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 180, opacity: 0.9 }}>{f.label}</div>

                  {!edit ? (
                    <div style={{ flex: 1 }}>
                      {current === undefined ? (
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
                          max={f.max ?? undefined}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          {!edit ? (
            <>
              {canEdit && <button onClick={() => setEdit(true)}>Ändern</button>}
              <button onClick={onClose} style={{ background: "var(--secondary-text)" }}>
                Schließen
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setLocal(values || {});
                  setEdit(false);
                }}
                style={{ background: "var(--secondary-text)" }}
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

/**
 * ✅ Admin Panel: Material hinzufügen + Kategorie wählen + dynamische Detailfelder
 * (Nur sichtbar für Admin, aber Details bearbeiten später im Info-Modal für alle möglich)
 */
function AdminPanel({ onAddMaterial, detailsSchema }) {
  const [name, setName] = useState("");
  const [kategorie, setKategorie] = useState("Boote");
  const [standort, setStandort] = useState("BRG");
  const [details, setDetails] = useState({});
  const [msg, setMsg] = useState("");

  const fields = detailsSchema[kategorie] || [];

  useEffect(() => {
    // wenn Kategorie wechselt, alte keys die nicht passen entfernen
    const allowed = new Set(fields.map((f) => f.key));
    const cleaned = {};
    for (const [k, v] of Object.entries(details || {})) {
      if (allowed.has(k)) cleaned[k] = v;
    }
    setDetails(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategorie]);

  function setField(key, val, type) {
    if (val === "" || val === null || val === undefined) {
      setDetails((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      return;
    }
    if (type === "number") {
      const num = Number(val);
      if (Number.isNaN(num)) return;
      setDetails((prev) => ({ ...prev, [key]: num }));
      return;
    }
    setDetails((prev) => ({ ...prev, [key]: val }));
  }

  async function add() {
    setMsg("");
    if (!name) {
      setMsg("Bitte Materialname eingeben.");
      return;
    }
    await onAddMaterial({ name, kategorie, standort, details });
    setName("");
    setDetails({});
    setMsg("Material hinzugefügt.");
  }

  return (
    <div className="card">
      <h3>Admin: Material hinzufügen (mit Infos)</h3>

      <div style={{ display: "grid", gap: 10 }}>
        <input placeholder="Materialname" value={name} onChange={(e) => setName(e.target.value)} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            {kategorien.slice(1).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          <select value={standort} onChange={(e) => setStandort(e.target.value)}>
            {standorte.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Dynamische Detailfelder je Kategorie */}
        {fields.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10 }}>
            <h4 style={{ margin: "6px 0 10px" }}>Zusätzliche Infos ({kategorie})</h4>

            <div style={{ display: "grid", gap: 10 }}>
              {fields.map((f) => {
                const current = details?.[f.key];

                return (
                  <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                          max={f.max ?? undefined}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={add}>Hinzufügen</button>

        {msg && <div style={{ opacity: 0.85 }}>{msg}</div>}
      </div>
    </div>
  );
}

function DeleteModal({ materialName, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>

        <h3 style={{ marginBottom: "10px" }}>Wirklich löschen?</h3>
        <p style={{ marginBottom: "20px" }}>
          Soll <strong>{materialName}</strong> dauerhaft gelöscht werden?
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onCancel} style={{ background: "var(--secondary-text)" }}>
            Abbrechen
          </button>
          <button className="delete" onClick={onConfirm}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}