// src/App.jsx
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { detailsSchema, normalizeDetailsForCategory, standorte, uid, getBootCapacity } from "./lib/schema";
import { extractLastNumber } from "./lib/sort";

import "./App.css";

import brgLogo from "./assets/logo_BRG.png";
import srvLogo from "./assets/logo_SRV.jpg";

import Auth from "./components/Auth";
import AdminPanel from "./components/AdminPanel";
import MaterialList from "./components/MaterialList";

import DetailsModal from "./components/modals/DetailsModal";
import HistoryModal from "./components/modals/HistoryModal";
import DeleteModal from "./components/modals/DeleteModal";
import MoveBoatModal from "./components/modals/MoveBoatModal";
import MoveSetModal from "./components/modals/MoveSetModal";
import CapacityConfirmModal from "./components/modals/CapacityConfirmModal";
import BulkMoveConfirmModal from "./components/modals/BulkMoveConfirmModal";



function useOnlineCount(session) {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: session.user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState(); // { key: [metas...] }
      const uniqueUsers = Object.keys(state).length;
      setOnlineCount(uniqueUsers);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Tracke "ich bin online"
        await channel.track({
          user_id: session.user.id,
          ts: Date.now(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return onlineCount;
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [material, setMaterial] = useState([]);
  const [profile, setProfile] = useState(null);

  const isAdmin = profile?.role === "admin";

  const [history, setHistory] = useState({});
  const [openHistoryId, setOpenHistoryId] = useState(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  const [detailsByMaterialId, setDetailsByMaterialId] = useState({});
  const [openDetailsId, setOpenDetailsId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showSelectedList, setShowSelectedList] = useState(false);

  const onlineCount = useOnlineCount(session);

  const [moveBoatDialog, setMoveBoatDialog] = useState(null);
  const [moveSetDialog, setMoveSetDialog] = useState(null);

  const [bulkMoveConfirm, setBulkMoveConfirm] = useState(null);
  const [bulkTarget, setBulkTarget] = useState("");

  const [capacityConfirm, setCapacityConfirm] = useState(null);

  const [bulkCapacityConfirm, setBulkCapacityConfirm] = useState(null);

  // -----------------------------------------------------
  // MATERIAL + DETAILS (Batch)
  // -----------------------------------------------------
  const fetchMaterialAndDetails = useCallback(async () => {
    const { data: mat, error } = await supabase.from("material").select("*").order("name");
    if (error) {
      console.error("Material laden Fehler:", error);
      setMaterial([]);
      setDetailsByMaterialId({});
      return;
    }

    const list = mat || [];
    setMaterial(list);

    const ids = list.map((m) => m.id).filter(Boolean);
    const chunkSize = 400;
    const map = {};

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      // eslint-disable-next-line no-await-in-loop
      const { data: det, error: detError } = await supabase.from("material_details").select("material_id, values").in("material_id", chunk);

      if (detError) {
        console.error("Details laden Fehler:", detError);
        continue;
      }
      (det || []).forEach((row) => {
        map[row.material_id] = row.values || {};
      });
    }

    setDetailsByMaterialId(map);
  }, []);

  // -----------------------------------------------------
  // PROFILE
  // -----------------------------------------------------
  const loadProfile = useCallback(
    async (userId) => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) console.error("Profile Fehler:", error);
      setProfile(data || null);
      await fetchMaterialAndDetails();
    },
    [fetchMaterialAndDetails]
  );

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
        setDetailsByMaterialId({});
        setShowAdmin(false);
        setOpenHistoryId(null);
        setOpenDetailsId(null);
        setSelectedIds(new Set());
        setMoveBoatDialog(null);
        setMoveSetDialog(null);
        setCapacityConfirm(null);
        setBulkMoveConfirm(null);
        setBulkCapacityConfirm(null);
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------
  // HISTORY
  // -----------------------------------------------------
  const loadHistory = useCallback(async (materialId) => {
    const { data: hist, error: histError } = await supabase
      .from("material_history")
      .select("id, material_id, alter_standort, neuer_standort, geändert_am, geändert_von")
      .eq("material_id", materialId)
      .order("geändert_am", { ascending: false });

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
  }, []);

  // -----------------------------------------------------
  // DETAILS SAVE
  // -----------------------------------------------------
  const saveDetails = useCallback(async (materialId, newValues) => {
    const userId = await getCurrentUserId();
    const payload = { material_id: materialId, values: newValues, updated_by: userId };

    const { error } = await supabase.from("material_details").upsert(payload, { onConflict: "material_id" });
    if (error) {
      console.error("Details speichern Fehler:", error);
      alert("Speichern fehlgeschlagen: " + error.message);
      return false;
    }

    setDetailsByMaterialId((prev) => ({ ...prev, [materialId]: newValues }));
    return true;
  }, []);

  // -----------------------------------------------------
  // ✅ Admin: Name ändern
  // -----------------------------------------------------
  const saveItemName = useCallback(async (materialId, newName) => {
    const name = String(newName || "").trim();
    if (!name) return false;

    const { error } = await supabase.from("material").update({ name }).eq("id", materialId);
    if (error) {
      alert("Name speichern fehlgeschlagen: " + error.message);
      return false;
    }

    setMaterial((prev) => prev.map((m) => (m.id === materialId ? { ...m, name } : m)));
    return true;
  }, []);

  // -----------------------------------------------------
  // ✅ Admin: Satz/Bundlename umbenennen (Skulls/Riemen Bundle)
  // -----------------------------------------------------
  const renameBundleBaseName = useCallback(
    async (bundle_id, newBaseName) => {
      if (!bundle_id) return false;
      const base = String(newBaseName || "").trim();
      if (!base) return false;

      const items = material.filter((m) => m.bundle_id === bundle_id && (m.kategorie === "Skulls" || m.kategorie === "Riemen"));
      if (items.length === 0) return false;

      for (const it of items) {
        const old = it.name || "";
        const m = old.match(/^(.*?)(\s+\d+)(\s+-\s+.*)?$/);
        let nextName = base;
        if (m) nextName = `${base}${m[2]}${m[3] || ""}`;
        else nextName = `${base} ${old}`;

        // eslint-disable-next-line no-await-in-loop
        const { error } = await supabase.from("material").update({ name: nextName }).eq("id", it.id);
        if (error) {
          alert("Umbenennen fehlgeschlagen: " + error.message);
          return false;
        }
      }

      setMaterial((prev) =>
        prev.map((m) => {
          if (m.bundle_id !== bundle_id) return m;
          if (!(m.kategorie === "Skulls" || m.kategorie === "Riemen")) return m;
          const old = m.name || "";
          const mm = old.match(/^(.*?)(\s+\d+)(\s+-\s+.*)?$/);
          const nextName = mm ? `${base}${mm[2]}${mm[3] || ""}` : `${base} ${old}`;
          return { ...m, name: nextName };
        })
      );

      return true;
    },
    [material]
  );

  // -----------------------------------------------------
  // ✅ Boot + Zubehör anlegen
  // -----------------------------------------------------
  const addBoatWithSeatItems = useCallback(
    async ({
      boatName,
      standort,
      boatDetails,
      hasHuelle,
      huelleName,
      huelleNotiz,
      createSkullAusleger,
      createRiemenAusleger,
      auslegerSkullPerSeatDetails,
      auslegerRiemenPerSeatDetails,
      rollsitzPerSeatDetails,
    }) => {
      if (!showAdmin || !isAdmin) return;

      if (!createSkullAusleger && !createRiemenAusleger) {
        alert("Bitte mindestens Skullausleger oder Riemenausleger auswählen.");
        return;
      }

      const userId = await getCurrentUserId();
      const bundle_id = uid();
      const plaetze = Math.max(1, Number(boatDetails?.plaetze || 1));

      const rows = [];
      rows.push({ name: boatName, kategorie: "Boote", standort, bundle_id });

      if (hasHuelle) rows.push({ name: huelleName || `${boatName} - Hülle`, kategorie: "Hüllen", standort, bundle_id });

      for (let i = 1; i <= plaetze; i++) rows.push({ name: `${boatName} - Rollsitz ${i}`, kategorie: "Rollsitze", standort, bundle_id });

      if (createSkullAusleger) for (let i = 1; i <= plaetze; i++) rows.push({ name: `${boatName} - Skullausleger ${i}`, kategorie: "Ausleger", standort, bundle_id });

      if (createRiemenAusleger) for (let i = 1; i <= plaetze; i++) rows.push({ name: `${boatName} - Riemenausleger ${i}`, kategorie: "Ausleger", standort, bundle_id });

      const { data: inserted, error } = await supabase.from("material").insert(rows).select();
      if (error) {
        console.error("Boot+Zubehör anlegen Fehler:", error);
        alert("Fehler beim Hinzufügen: " + error.message);
        return;
      }

      const boatRow = inserted.find((r) => r.kategorie === "Boote");
      const huelleRow = inserted.find((r) => r.kategorie === "Hüllen");
      const rollsitzRows = inserted
        .filter((r) => r.kategorie === "Rollsitze")
        .sort((a, b) => (extractLastNumber(a.name) ?? 0) - (extractLastNumber(b.name) ?? 0));

      const auslegerRows = inserted
        .filter((r) => r.kategorie === "Ausleger")
        .sort((a, b) => (extractLastNumber(a.name) ?? 0) - (extractLastNumber(b.name) ?? 0));

      const boatValues = normalizeDetailsForCategory("Boote", {
        ...boatDetails,
        huelle_vorhanden: !!hasHuelle,
        huelle_notiz: hasHuelle ? (huelleNotiz || "") : "",
      });

      const detailsUpserts = [];
      if (boatRow) detailsUpserts.push({ material_id: boatRow.id, values: boatValues, updated_by: userId });

      if (hasHuelle && huelleRow) {
        const huelleValues = normalizeDetailsForCategory("Hüllen", { notiz: huelleNotiz || "" });
        detailsUpserts.push({ material_id: huelleRow.id, values: huelleValues, updated_by: userId });
      }

      for (let i = 0; i < rollsitzRows.length; i++) {
        const values = normalizeDetailsForCategory("Rollsitze", rollsitzPerSeatDetails?.[i] || {});
        detailsUpserts.push({ material_id: rollsitzRows[i].id, values, updated_by: userId });
      }

      for (const row of auslegerRows) {
        const n = (row.name || "").toLowerCase();
        const match = row.name?.match(/(\d+)\s*$/);
        const idx = match ? Math.max(0, Number(match[1]) - 1) : 0;

        if (n.includes("skullausleger")) {
          const base = auslegerSkullPerSeatDetails?.[idx] || {};
          const values = normalizeDetailsForCategory("Ausleger", { ...base, typ: "skull" });
          detailsUpserts.push({ material_id: row.id, values, updated_by: userId });
        } else if (n.includes("riemenausleger")) {
          const base = auslegerRiemenPerSeatDetails?.[idx] || {};
          const values = normalizeDetailsForCategory("Ausleger", { ...base, typ: "riemen" });
          detailsUpserts.push({ material_id: row.id, values, updated_by: userId });
        } else {
          detailsUpserts.push({ material_id: row.id, values: {}, updated_by: userId });
        }
      }

      if (detailsUpserts.some((d) => d.values && Object.keys(d.values).length > 0)) {
        const { error: detError } = await supabase.from("material_details").upsert(detailsUpserts, { onConflict: "material_id" });
        if (detError) console.error("Details upsert Fehler:", detError);
      }

      const historyRows = (inserted || []).map((r) => ({
        material_id: r.id,
        alter_standort: "",
        neuer_standort: standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
      }));
      await supabase.from("material_history").insert(historyRows);

      setMaterial((prev) => {
        const next = [...prev, ...(inserted || [])];
        next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return next;
      });

      setDetailsByMaterialId((prev) => {
        const next = { ...prev };
        for (const d of detailsUpserts) next[d.material_id] = d.values || {};
        return next;
      });
    },
    [isAdmin, showAdmin]
  );

  // -----------------------------------------------------
  // ✅ Skulls Satz
  // -----------------------------------------------------
  const addSkullsSet = useCallback(
    async ({ setName, count, standort, sharedDetails, perItemDetails }) => {
      if (!showAdmin || !isAdmin) return;
      const userId = await getCurrentUserId();

      const bundle_id = uid();
      const set_id = uid();

      const n = Math.max(1, Number(count || 1));
      const rows = Array.from({ length: n }).map((_, i) => ({
        name: `${setName} ${i + 1}`,
        kategorie: "Skulls",
        standort,
        bundle_id,
        set_id,
      }));

      const { data: inserted, error } = await supabase.from("material").insert(rows).select();
      if (error) {
        alert("Fehler: " + error.message);
        return;
      }

      const shared = normalizeDetailsForCategory("Skulls", sharedDetails || {});
      const detRows = (inserted || []).map((r, idx) => {
        const per = normalizeDetailsForCategory("Skulls", perItemDetails?.[idx] || {});
        const values = { ...shared, ...per };
        return { material_id: r.id, values, updated_by: userId };
      });

      if (detRows.some((d) => d.values && Object.keys(d.values).length > 0)) {
        const { error: detError } = await supabase.from("material_details").upsert(detRows, { onConflict: "material_id" });
        if (detError) console.error("Details upsert Fehler:", detError);
      }

      const historyRows = (inserted || []).map((r) => ({
        material_id: r.id,
        alter_standort: "",
        neuer_standort: standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
      }));
      await supabase.from("material_history").insert(historyRows);

      setMaterial((prev) => {
        const next = [...prev, ...(inserted || [])];
        next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return next;
      });

      setDetailsByMaterialId((prev) => {
        const next = { ...prev };
        for (const d of detRows) next[d.material_id] = d.values || {};
        return next;
      });
    },
    [isAdmin, showAdmin]
  );

  // -----------------------------------------------------
  // ✅ Riemen Satz
  // -----------------------------------------------------
  const addRiemenSetPairs = useCallback(
    async ({ setName, pairsCount, standort, sharedDetails, perPairDetails }) => {
      if (!showAdmin || !isAdmin) return;

      const userId = await getCurrentUserId();
      const n = Math.max(1, Number(pairsCount || 1));

      const bundle_id = n > 1 ? uid() : null;
      const set_id = n > 1 ? uid() : null;

      const allRows = [];

      for (let i = 1; i <= n; i++) {
        allRows.push({
          name: n > 1 ? `${setName} ${i}` : setName,
          kategorie: "Riemen",
          standort,
          bundle_id,
          set_id,
        });
      }

      const { data: inserted, error } = await supabase
        .from("material")
        .insert(allRows)
        .select();

      if (error) {
        alert("Fehler: " + error.message);
        return;
      }

      const shared = normalizeDetailsForCategory("Riemen", sharedDetails || {});

      const detRows = (inserted || []).map((r, idx) => {
        const rawPer = perPairDetails?.[idx] || {};
        const unterschiedlicheSeiten = !!rawPer.unterschiedliche_seiten;

        const meta = {};
        Object.entries(rawPer).forEach(([key, value]) => {
          if (
            key === "unterschiedliche_seiten" ||
            key === "backbord" ||
            key === "steuerbord"
          ) {
            return;
          }
          if (value !== "" && value !== null && value !== undefined) {
            meta[key] = value;
          }
        });

        const cleanSide = (sideObj = {}) => {
          const out = {};
          Object.entries(sideObj).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
              out[key] = value;
            }
          });
          return out;
        };

        const backbord = cleanSide(rawPer?.backbord || {});
        const steuerbord = cleanSide(
          unterschiedlicheSeiten ? rawPer?.steuerbord || {} : rawPer?.backbord || {}
        );

        const values = normalizeDetailsForCategory("Riemen", {
          ...shared,
          ...meta,
          unterschiedliche_seiten: unterschiedlicheSeiten,
          backbord,
          steuerbord,
        });

        return {
          material_id: r.id,
          values,
          updated_by: userId,
        };
      });

      if (detRows.some((d) => d.values && Object.keys(d.values).length > 0)) {
        const { error: detError } = await supabase
          .from("material_details")
          .upsert(detRows, { onConflict: "material_id" });

        if (detError) {
          console.error("Details upsert Fehler:", detError);
        }
      }

      const historyRows = (inserted || []).map((r) => ({
        material_id: r.id,
        alter_standort: "",
        neuer_standort: standort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
      }));

      await supabase.from("material_history").insert(historyRows);

      setMaterial((prev) => {
        const next = [...prev, ...(inserted || [])];
        next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return next;
      });

      setDetailsByMaterialId((prev) => {
        const next = { ...prev };
        for (const d of detRows) next[d.material_id] = d.values || {};
        return next;
      });
    },
    [isAdmin, showAdmin]
  );
  // -----------------------------------------------------
  // Standort ändern (bulk)
  // -----------------------------------------------------
  const updateStandortBulk = useCallback(
    async (ids, neuerStandort) => {
      const arr = Array.from(ids || []);
      if (arr.length === 0) return;

      const userId = await getCurrentUserId();

      const oldMap = {};
      for (const m of material) oldMap[m.id] = m.standort;

      const { error } = await supabase.from("material").update({ standort: neuerStandort }).in("id", arr);
      if (error) {
        alert("Bulk Update fehlgeschlagen: " + error.message);
        return;
      }

      const historyRows = arr.map((id) => ({
        material_id: id,
        alter_standort: oldMap[id] ?? "",
        neuer_standort: neuerStandort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
      }));
      await supabase.from("material_history").insert(historyRows);

      setMaterial((prev) => prev.map((m) => (arr.includes(m.id) ? { ...m, standort: neuerStandort } : m)));
      setSelectedIds(new Set());
    },
    [material]
  );

  // -----------------------------------------------------
  // Standort ändern (single)
  // -----------------------------------------------------
  const updateStandort = useCallback(
    async (item, neuerStandort) => {
      if (item.standort === neuerStandort) return;

      // Boot: Dialog
      if (item.kategorie === "Boote" && item.bundle_id) {
        const bundleItems = material.filter((m) => m.bundle_id === item.bundle_id);

        const hasSkullAusleger = bundleItems.some((it) => {
          if (it.kategorie !== "Ausleger") return false;
          const typ = (detailsByMaterialId?.[it.id]?.typ || "").toLowerCase();
          const n = (it.name || "").toLowerCase();
          return typ === "skull" || n.includes("skullausleger");
        });

        const hasRiemenAusleger = bundleItems.some((it) => {
          if (it.kategorie !== "Ausleger") return false;
          const typ = (detailsByMaterialId?.[it.id]?.typ || "").toLowerCase();
          const n = (it.name || "").toLowerCase();
          return typ === "riemen" || n.includes("riemenausleger");
        });

        setMoveBoatDialog({
          boat: item,
          newStandort: neuerStandort,
          move: {
            skullAusleger: hasSkullAusleger,
            riemenAusleger: hasRiemenAusleger,
            rollsitze: true,
            huellen: true,
          },
          availability: {
            skullAusleger: hasSkullAusleger,
            riemenAusleger: hasRiemenAusleger,
          },
        });
        return;
      }

      // Satz-Dialog (Skulls/Riemen)
      if ((item.kategorie === "Skulls" || item.kategorie === "Riemen") && item.bundle_id) {
        const setItems = material.filter((m) => m.bundle_id === item.bundle_id && m.kategorie === item.kategorie);
        setMoveSetDialog({
          item,
          newStandort: neuerStandort,
          items: setItems,
          selectedIds: new Set(setItems.map((x) => x.id)),
        });
        return;
      }

      // normal
      const alterStandort = item.standort;
      const userId = await getCurrentUserId();

      const { error: updateError } = await supabase.from("material").update({ standort: neuerStandort }).eq("id", item.id);
      if (updateError) {
        console.error("Material Update Fehler:", updateError);
        return;
      }

      await supabase.from("material_history").insert({
        material_id: item.id,
        alter_standort: alterStandort,
        neuer_standort: neuerStandort,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
      });

      setMaterial((prev) => prev.map((m) => (m.id === item.id ? { ...m, standort: neuerStandort } : m)));
    },
    [material, detailsByMaterialId]
  );

  // -----------------------------------------------------
  // Confirm Boot Move (inkl. Kapazitätswarnung)
  // -----------------------------------------------------
  const confirmMoveBoat = useCallback(async () => {
    if (!moveBoatDialog) return;

    const { boat, newStandort, move } = moveBoatDialog;
    const ids = new Set([boat.id]);

    const bundleItems = material.filter((m) => m.bundle_id && m.bundle_id === boat.bundle_id);

    for (const it of bundleItems) {
      if (it.id === boat.id) continue;

      if (it.kategorie === "Rollsitze" && move.rollsitze) ids.add(it.id);
      if (it.kategorie === "Hüllen" && move.huellen) ids.add(it.id);

      if (it.kategorie === "Ausleger") {
        const typ = (detailsByMaterialId?.[it.id]?.typ || "").toLowerCase();
        const n = (it.name || "").toLowerCase();

        const isSkull = typ === "skull" || n.includes("skullausleger");
        const isRiemen = typ === "riemen" || n.includes("riemenausleger");

        if (isSkull && move.skullAusleger) ids.add(it.id);
        if (isRiemen && move.riemenAusleger) ids.add(it.id);

        if (!isSkull && !isRiemen) {
          if (move.skullAusleger && move.riemenAusleger) ids.add(it.id);
        }
      }
    }

    const boatSeats = detailsByMaterialId?.[boat.id]?.plaetze;
    const cap = getBootCapacity(newStandort, boatSeats);

    if (typeof boatSeats === "number" && typeof cap === "number") {
      const used = material.filter((m) => {
        if (m.kategorie !== "Boote") return false;
        if (m.standort !== newStandort) return false;
        if (m.id === boat.id) return false;
        const seats = detailsByMaterialId?.[m.id]?.plaetze;
        return seats === boatSeats;
      }).length;

      if (used >= cap) {
        setCapacityConfirm({
          title: "Kein Bootsplatz frei",
          message: `Am Standort ${newStandort} sind für ${boatSeats}er-Boote ${cap} Plätze vorgesehen (belegt: ${used}). Soll das Boot trotzdem verschoben werden?`,
          ids,
          standort: newStandort,
        });
        return;
      }
    }

    await updateStandortBulk(ids, newStandort);
    setMoveBoatDialog(null);
  }, [moveBoatDialog, material, detailsByMaterialId, updateStandortBulk, getBootCapacity]);

  // ✅ BULK Kapazität prüfen (für mehrere Boote)
  const checkBulkCapacity = useCallback(
    (idsArray, targetStandort) => {
      const boatsToMove = (idsArray || [])
        .map((id) => material.find((m) => m.id === id))
        .filter((m) => m && m.kategorie === "Boote" && m.standort !== targetStandort);

      if (boatsToMove.length === 0) return null;

      const movingBySeats = {};
      for (const b of boatsToMove) {
        const seats = detailsByMaterialId?.[b.id]?.plaetze;
        if (typeof seats !== "number") continue;
        movingBySeats[seats] = (movingBySeats[seats] || 0) + 1;
      }

      const issues = [];

      for (const [seatsStr, countMoving] of Object.entries(movingBySeats)) {
        const seats = Number(seatsStr);
        const cap = getBootCapacity(targetStandort, seats);
        if (typeof cap !== "number") continue;

        const usedNow = material.filter((m) => {
          if (m.kategorie !== "Boote") return false;
          if (m.standort !== targetStandort) return false;
          const s = detailsByMaterialId?.[m.id]?.plaetze;
          return s === seats;
        }).length;

        const usedAfter = usedNow + countMoving;
        if (usedAfter > cap) {
          issues.push(`${seats}er: ${usedNow} belegt + ${countMoving} rein = ${usedAfter}/${cap}`);
        }
      }

      if (issues.length === 0) return null;

      return {
        title: "Kein Bootsplatz frei",
        message:
          `Am Standort ${targetStandort} wird die Kapazität überschritten:\n\n` +
          issues.map((x) => `• ${x}`).join("\n") +
          `\n\nTrotzdem verschieben?`,
      };
    },
    [material, detailsByMaterialId, getBootCapacity]
  );

  // -----------------------------------------------------
  // Auswahl-Listen für UI (gruppiert)
  // -----------------------------------------------------
  const selectedItemsList = Array.from(selectedIds)
    .map((id) => material.find((m) => m.id === id))
    .filter(Boolean);

  const selectedItemsByCategory = selectedItemsList.reduce((acc, it) => {
    const cat = it.kategorie || "Unbekannt";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(it);
    return acc;
  }, {});

  Object.keys(selectedItemsByCategory).forEach((cat) => {
    selectedItemsByCategory[cat].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  const selectedCategoryOrder = Object.keys(selectedItemsByCategory).sort((a, b) => a.localeCompare(b));

  const bulkSelectedItems = (bulkMoveConfirm?.ids || []).map((id) => material.find((m) => m.id === id)).filter(Boolean);

  const bulkItemsByCategory = bulkSelectedItems.reduce((acc, it) => {
    const cat = it.kategorie || "Unbekannt";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(it);
    return acc;
  }, {});

  Object.keys(bulkItemsByCategory).forEach((cat) => {
    bulkItemsByCategory[cat].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  const bulkCategoryOrder = Object.keys(bulkItemsByCategory).sort((a, b) => a.localeCompare(b));

  // -----------------------------------------------------
  // Confirm Set Move
  // -----------------------------------------------------
  const confirmMoveSet = useCallback(async () => {
    if (!moveSetDialog) return;
    const ids = new Set(Array.from(moveSetDialog.selectedIds || []));
    if (ids.size === 0) return setMoveSetDialog(null);
    await updateStandortBulk(ids, moveSetDialog.newStandort);
    setMoveSetDialog(null);
  }, [moveSetDialog, updateStandortBulk]);

  // -----------------------------------------------------
  // Bulk Auswahl
  // -----------------------------------------------------
  const toggleSelect = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectSet = useCallback(
    (set_id) => {
      if (!set_id) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.set_id === set_id).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material]
  );

  const selectBundle = useCallback(
    (bundle_id) => {
      if (!bundle_id) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.bundle_id === bundle_id).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material]
  );

  const selectPair = useCallback(
    (pair_id) => {
      if (!pair_id) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.pair_id === pair_id).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material]
  );

  // -----------------------------------------------------
  // LÖSCHEN
  // -----------------------------------------------------
  const openDeleteDialog = useCallback(
    (item) => {
      if (!showAdmin || !isAdmin) return;
      setDeleteItem(item);
    },
    [isAdmin, showAdmin]
  );

  const deleteMaterialConfirmed = useCallback(async () => {
    if (!deleteItem || !isAdmin) return;

    const { error } = await supabase.from("material").delete().eq("id", deleteItem.id);
    if (error) {
      alert("Löschen fehlgeschlagen: " + error.message);
      return;
    }

    setMaterial((prev) => prev.filter((m) => m.id !== deleteItem.id));
    setDetailsByMaterialId((prev) => {
      const copy = { ...prev };
      delete copy[deleteItem.id];
      return copy;
    });

    setDeleteItem(null);
  }, [deleteItem, isAdmin]);

  if (!session) return <Auth />;

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="header-logos">
            <img src={brgLogo} alt="Bonner Rudergesellschaft" className="club-logo" />
            <img src={srvLogo} alt="Siegburger Ruderverein" className="club-logo" />
          </div>
          <h1 className="header-title">TGSB Material Verwaltung</h1>
        </div>
        < div style= {{ display : "flex", gap: "10px", flexDirection: "column", alignItems: "flex-end" }}>
          {isAdmin && (
            <button
              onClick={() => window.open("/statistik.html", "_blank", "noopener,noreferrer")}>
              Statistik
            </button>
          )}
        <div>  
        <div>
          <button onClick={() => window.open("/tabelle.html", "_blank", "noopener,noreferrer")}>
            Tabelle
          </button>
        </div> 

        </div>
          <button onClick={() => window.open("/digitale-bootshalle.html", "_blank", "noopener,noreferrer")}>
            Digitale Bootshalle
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAdmin && (
            <button
              className={`admin-toggle ${showAdmin ? "is-on" : ""}`}
              onClick={() => setShowAdmin((s) => !s)}
            >
              {showAdmin ? "Admin verlassen" : "Admin"}
            </button>
          )}
          <button className="logout" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Online: <strong>{onlineCount}</strong>
        </div>
      </div>

      {isAdmin && showAdmin && (
        <AdminPanel addBoatWithSeatItems={addBoatWithSeatItems} addSkullsSet={addSkullsSet} addRiemenSetPairs={addRiemenSetPairs} />
      )}

      {selectedIds.size > 0 && (
        <div className="card" style={{ position: "sticky", top: 10, zIndex: 5 }}>
          <h3>Auswahl: {selectedIds.size} Elemente</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ opacity: 0.8 }}>Standort setzen:</span>

            <select
              value={bulkTarget}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;

                setBulkMoveConfirm({
                  newStandort: v,
                  ids: Array.from(selectedIds),
                });

                setBulkTarget("");
              }}
            >
              <option value="">— wählen —</option>
              {standorte.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowSelectedList(false);
              }}
              style={{ background: "var(--secondary-text)" }}
            >
              Auswahl leeren
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <button onClick={() => setShowSelectedList((s) => !s)} style={{ width: "fit-content" }} title="Auswahl-Liste auf-/zuklappen">
              {showSelectedList ? "▼ Auswahl anzeigen" : "▶ Auswahl anzeigen"}
            </button>

            {showSelectedList && (
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: 10,
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  {selectedCategoryOrder.map((cat) => {
                    const list = selectedItemsByCategory[cat] || [];
                    if (list.length === 0) return null;

                    return (
                      <div key={cat} style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>{cat}</div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{list.length}×</div>
                        </div>

                        <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
                          {list.map((it) => (
                            <li key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <span>
                                <strong>{it.name}</strong>{" "}
                                <span style={{ opacity: 0.75, fontSize: 12 }}>
                                  ({it.standort})
                                </span>
                              </span>

                              <button
                                onClick={() =>
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(it.id);
                                    return next;
                                  })
                                }
                                style={{ fontSize: 12, padding: "2px 8px", background: "rgba(255,255,255,0.08)" }}
                                title="Aus Auswahl entfernen"
                              >
                                Entfernen
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {selectedItemsList.length === 0 && <div style={{ opacity: 0.7 }}>Keine Auswahl.</div>}
              </div>
            )}
          </div>
        </div>
      )}

      <MaterialList
        material={material}
        detailsByMaterialId={detailsByMaterialId}
        updateStandort={updateStandort}
        openDeleteDialog={openDeleteDialog}
        setOpenHistoryId={setOpenHistoryId}
        showAdmin={showAdmin && isAdmin}
        loadHistory={loadHistory}
        onOpenDetails={(id) => setOpenDetailsId(id)}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        selectSet={selectSet}
        selectBundle={selectBundle}
        selectPair={selectPair}
      />

      {openHistoryId && (
        <HistoryModal
          materialName={material.find((m) => m.id === openHistoryId)?.name || "Unbekannt"}
          entries={history[openHistoryId] || []}
          onClose={() => setOpenHistoryId(null)}
        />
      )}

      {openDetailsId && (
        <DetailsModal
          item={material.find((m) => m.id === openDetailsId)}
          schema={detailsSchema}
          values={detailsByMaterialId[openDetailsId] || {}}
          onClose={() => setOpenDetailsId(null)}
          onSave={(vals) => saveDetails(openDetailsId, vals)}
          canEdit={true}
          isAdmin={isAdmin}
          onSaveName={saveItemName}
          onRenameBundleBaseName={renameBundleBaseName}
        />
      )}

      {deleteItem && <DeleteModal materialName={deleteItem?.name || "Unbekannt"} onCancel={() => setDeleteItem(null)} onConfirm={deleteMaterialConfirmed} />}

      {moveBoatDialog && (
        <MoveBoatModal
          boatName={moveBoatDialog.boat?.name || "Boot"}
          newStandort={moveBoatDialog.newStandort}
          move={moveBoatDialog.move}
          disabledSkullAusleger={!moveBoatDialog.availability?.skullAusleger}
          disabledRiemenAusleger={!moveBoatDialog.availability?.riemenAusleger}
          onToggle={(key) =>
            setMoveBoatDialog((prev) => {
              const avail = prev?.availability || {};
              if ((key === "skullAusleger" && !avail.skullAusleger) || (key === "riemenAusleger" && !avail.riemenAusleger)) return prev;
              return { ...prev, move: { ...prev.move, [key]: !prev.move[key] } };
            })
          }
          onCancel={() => setMoveBoatDialog(null)}
          onConfirm={confirmMoveBoat}
        />
      )}

      {moveSetDialog && (
        <MoveSetModal
          title={`${moveSetDialog.item?.kategorie || "Satz"} verschieben`}
          itemName={moveSetDialog.item?.name || ""}
          newStandort={moveSetDialog.newStandort}
          items={moveSetDialog.items || []}
          selectedIds={moveSetDialog.selectedIds || new Set()}
          onToggleId={(id, force) =>
            setMoveSetDialog((p) => {
              const next = new Set(p.selectedIds || []);
              const shouldCheck = typeof force === "boolean" ? force : !next.has(id);
              if (shouldCheck) next.add(id);
              else next.delete(id);
              return { ...p, selectedIds: next };
            })
          }
          onSelectAll={() => setMoveSetDialog((p) => ({ ...p, selectedIds: new Set((p.items || []).map((x) => x.id)) }))}
          onSelectOnlyThis={() => setMoveSetDialog((p) => ({ ...p, selectedIds: new Set([p.item?.id].filter(Boolean)) }))}
          onCancel={() => setMoveSetDialog(null)}
          onConfirm={confirmMoveSet}
        />
      )}

      {capacityConfirm && (
        <CapacityConfirmModal
          title={capacityConfirm.title}
          message={capacityConfirm.message}
          onCancel={() => setCapacityConfirm(null)}
          onConfirm={async () => {
            await updateStandortBulk(capacityConfirm.ids, capacityConfirm.standort);
            setCapacityConfirm(null);
            setMoveBoatDialog(null);
          }}
        />
      )}

      {bulkMoveConfirm && (
        <BulkMoveConfirmModal
          newStandort={bulkMoveConfirm.newStandort}
          itemsGrouped={bulkItemsByCategory}
          categoryOrder={bulkCategoryOrder}
          totalCount={bulkSelectedItems.length}
          onCancel={() => setBulkMoveConfirm(null)}
          onEdit={() => {
            setBulkMoveConfirm(null);
            setShowSelectedList(true);
          }}
          onConfirm={async () => {
            const idsArr = bulkMoveConfirm.ids;

            const warn = checkBulkCapacity(idsArr, bulkMoveConfirm.newStandort);
            if (warn) {
              setBulkCapacityConfirm({
                ...warn,
                ids: idsArr,
                standort: bulkMoveConfirm.newStandort,
              });
              return;
            }

            await updateStandortBulk(new Set(idsArr), bulkMoveConfirm.newStandort);
            setBulkMoveConfirm(null);
            setShowSelectedList(false);
          }}
        />
      )}

      {bulkCapacityConfirm && (
        <CapacityConfirmModal
          title={bulkCapacityConfirm.title}
          message={bulkCapacityConfirm.message}
          onCancel={() => setBulkCapacityConfirm(null)}
          onConfirm={async () => {
            await updateStandortBulk(new Set(bulkCapacityConfirm.ids), bulkCapacityConfirm.standort);
            setBulkCapacityConfirm(null);
            setBulkMoveConfirm(null);
            setShowSelectedList(false);
          }}
        />
      )}
    </div>
  );
}