import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const kategorien = ["Alle", "Boote", "Skulls", "Riemen", "Ausleger", "Sonstiges"];
const standorte = ["BRG", "SRV", "Fühlingen", "Extern"];

export default function App() {
  const [session, setSession] = useState(null);
  const [material, setMaterial] = useState([]);
  const [profile, setProfile] = useState(null);

  const [history, setHistory] = useState({});
  const [openHistoryId, setOpenHistoryId] = useState(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  // ✅ Admin-Erkennung (bei dir heißt es in profiles: role = "admin")
  const isAdmin = profile?.role === "admin";

  // -----------------------------------------------------
  // LOGIN / SESSION
  // -----------------------------------------------------
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
      }
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) console.error("Profile Fehler:", error);

    setProfile(data || null);
    fetchMaterial();
  }

  // -----------------------------------------------------
  // MATERIAL LADEN
  // -----------------------------------------------------
  async function fetchMaterial() {
    const { data, error } = await supabase
      .from("material")
      .select("*")
      .order("name");

    if (error) console.error("Material laden Fehler:", error);

    setMaterial(data || []);
  }

  // -----------------------------------------------------
  // VERLAUF LADEN (Name aus profiles, OHNE FK-Join)
  // -----------------------------------------------------
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
      const { data: profs, error: profError } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      if (profError) {
        console.error("Profiles Fehler:", profError);
      } else {
        profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p.name]));
      }
    }

    const formatted = hist.map((h) => {
      const userName = profileMap[h.geändert_von] || "Unbekannt";
      return `${new Date(h.geändert_am).toLocaleString("de-DE")} – ${userName}: ${h.alter_standort} → ${h.neuer_standort}`;
    });

    setHistory((prev) => ({
      ...prev,
      [materialId]: formatted,
    }));
  }

  // -----------------------------------------------------
  // MATERIAL HINZUFÜGEN (nur Admin)
  // -----------------------------------------------------
  async function addMaterial(name, kategorie, standort) {
    if (!name || !showAdmin || !isAdmin) return;

    const { data, error } = await supabase
      .from("material")
      .insert({ name, kategorie, standort })
      .select()
      .single();

    if (error) {
      console.error("Material hinzufügen Fehler:", error);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Optional: History beim Hinzufügen
    const { error: historyError } = await supabase.from("material_history").insert({
      material_id: data.id,
      alter_standort: "",
      neuer_standort: standort,
      geändert_von: user?.id ?? null,
      geändert_am: new Date().toISOString(),
    });

    if (historyError) console.error("History hinzufügen Fehler:", historyError);

    fetchMaterial();
  }

  // -----------------------------------------------------
  // STANDORT ÄNDERN (für alle erlaubt)
  // -----------------------------------------------------
  async function updateStandort(item, neuerStandort) {
    if (item.standort === neuerStandort) return;

    const alterStandort = item.standort;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("material")
      .update({ standort: neuerStandort })
      .eq("id", item.id);

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

  // -----------------------------------------------------
  // LÖSCHEN (nur Admin)
  // -----------------------------------------------------
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

    // Optional: Delete-History
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

  // -----------------------------------------------------
  // LOGIN SCREEN
  // -----------------------------------------------------
  if (!session) {
    return <Auth />;
  }

  // -----------------------------------------------------
  // APP UI
  // -----------------------------------------------------
  return (
    <div className="container">
      <div className="header">
        <h1>TGSB Material Verwaltung</h1>

        {/* Rechts oben: Admin Button + Logout */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* ✅ Admin Button wird angezeigt, wenn profiles.role === "admin" */}
          {isAdmin && (
            <button onClick={() => setShowAdmin(!showAdmin)}>
              {showAdmin ? "Admin verlassen" : "Admin"}
            </button>
          )}

          <button className="logout" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </div>

      {/* ✅ Admin Panel sichtbar wenn showAdmin */}
      {isAdmin && showAdmin && <AdminPanel />}

      <MaterialList
        material={material}
        updateStandort={updateStandort}
        addMaterial={addMaterial}
        openDeleteDialog={openDeleteDialog}
        history={history}
        setOpenHistoryId={setOpenHistoryId}
        showAdmin={showAdmin && isAdmin}
        loadHistory={loadHistory}
      />

      {/* Verlauf Modal */}
      {openHistoryId && (
        <HistoryModal
          materialName={material.find((m) => m.id === openHistoryId)?.name || "Unbekannt"}
          entries={history[openHistoryId] || []}
          onClose={() => setOpenHistoryId(null)}
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

  // ✅ Fehlermeldung im UI
  const [errorMsg, setErrorMsg] = useState("");

  async function login() {
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // ✅ Supabase liefert hier "Invalid login credentials" o.ä.
    if (error) {
      setErrorMsg("E-Mail-Adresse oder Passwort ist falsch.");
      return;
    }
  }

  return (
    <div className="login-card">
      <h2>TGSB Materialverwaltung</h2>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>Login</button>

      {/* ✅ Fehlermeldung anzeigen */}
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

function MaterialList({
  material,
  updateStandort,
  addMaterial,
  openDeleteDialog,
  history,
  setOpenHistoryId,
  showAdmin,
  loadHistory,
}) {
  const [name, setName] = useState("");
  const [kategorie, setKategorie] = useState("Boote");
  const [standort, setStandort] = useState("BRG");
  const [search, setSearch] = useState("");
  const [filterKategorie, setFilterKategorie] = useState("Alle");

  const groupedByStandort = {};
  material.forEach((item) => {
    if (!groupedByStandort[item.standort]) groupedByStandort[item.standort] = [];
    groupedByStandort[item.standort].push(item);
  });

  const tableCategories = ["Boote", "Skulls", "Riemen", "Ausleger", "Sonstiges"];

  return (
    <div>
      {/* Material hinzufügen (nur Admin) */}
      {showAdmin && (
        <div className="card">
          <h3>Material hinzufügen</h3>
          <input
            placeholder="Materialname"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <button
            onClick={() => {
              addMaterial(name, kategorie, standort);
              setName("");
            }}
          >
            Hinzufügen
          </button>
        </div>
      )}

      {/* Suche & Filter */}
      <div className="card">
        <h3>Suche & Filter</h3>
        <input
          placeholder="🔎 Suche nach Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterKategorie} onChange={(e) => setFilterKategorie(e.target.value)}>
          {kategorien.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Tabellen nach Standort */}
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
                          <th>Verlauf</th>
                          {showAdmin && <th>Löschen</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {catItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>

                            <td>
                              <select
                                value={item.standort}
                                onChange={(e) => updateStandort(item, e.target.value)}
                              >
                                {standorte.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
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
                            <td colSpan={showAdmin ? 4 : 3} style={{ opacity: 0.5 }}>
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

function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // ⚠️ Hinweis:
  // supabase.auth.admin.createUser funktioniert NICHT mit dem normalen anon key im Browser.
  // Dafür brauchst du einen Server (Edge Function / Backend) mit service_role key.
  async function createUser() {
    setMsg("");
    setMsg(
      "Hinweis: Nutzer anlegen per admin.createUser geht im Browser i.d.R. nicht (Service Role Key nötig). " +
        "Nutze dafür eine Supabase Edge Function."
    );
  }

  return (
    <div className="card">
      <h3>Admin: Neuen Nutzer anlegen</h3>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={createUser}>Nutzer erstellen</button>

      {msg && <p style={{ marginTop: 10, opacity: 0.85 }}>{msg}</p>}
    </div>
  );
}