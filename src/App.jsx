import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { detailsSchema, standorte, uid, normalizeDetailsForCategory, getBootCapacity } from "./lib/schema";
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

function normalizeRole(rawRole) {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "user") return "user";
  return "visitor";
}

function getPermissions(role) {
  const normalized = normalizeRole(role);
  return {
    role: normalized,
    isVisitor: normalized === "visitor",
    isUser: normalized === "user",
    isAdmin: normalized === "admin",
    canEditStandort: normalized === "user" || normalized === "admin",
    canEditDetails: normalized === "user" || normalized === "admin",
    canRenameMaterial: normalized === "admin",
    canDeleteMaterial: normalized === "admin",
    canUseAdminPanel: normalized === "user" || normalized === "admin",
    canViewHistory: normalized === "user" || normalized === "admin",
    canViewStatistics: true,
    canEditTable: normalized === "user" || normalized === "admin",
    canEditBootshalle: normalized === "user" || normalized === "admin",
  };
}

function useOnlineCount(session) {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    if (!session?.user?.id) return undefined;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: session.user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const uniqueUsers = Object.keys(state).length;
      setOnlineCount(uniqueUsers);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
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

function stringifyHistoryValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function insertHistoryRows(rows) {
  if (!rows || rows.length === 0) return;
  const { error } = await supabase.from("material_history").insert(rows);
  if (error) {
    console.error("History insert Fehler:", error);
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [material, setMaterial] = useState([]);
  const [profile, setProfile] = useState(null);

  const permissions = useMemo(() => getPermissions(profile?.role), [profile?.role]);

  const [history, setHistory] = useState({});
  const [openHistoryId, setOpenHistoryId] = useState(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  const [detailsByMaterialId, setDetailsByMaterialId] = useState({});
  const [openDetailsId, setOpenDetailsId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showSelectedList, setShowSelectedList] = useState(false);

  const [moveBoatDialog, setMoveBoatDialog] = useState(null);
  const [moveSetDialog, setMoveSetDialog] = useState(null);
  const [bulkMoveConfirm, setBulkMoveConfirm] = useState(null);
  const [bulkTarget, setBulkTarget] = useState("");
  const [capacityConfirm, setCapacityConfirm] = useState(null);
  const [bulkCapacityConfirm, setBulkCapacityConfirm] = useState(null);

  const onlineCount = useOnlineCount(session);

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
    const map = {};
    const chunkSize = 400;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      // eslint-disable-next-line no-await-in-loop
      const { data: det, error: detError } = await supabase
        .from("material_details")
        .select("material_id, values")
        .in("material_id", chunk);

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

  const loadProfile = useCallback(
    async (userId) => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) {
        console.error("Profile Fehler:", error);
      }
      setProfile(data || null);
      await fetchMaterialAndDetails();
    },
    [fetchMaterialAndDetails]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        loadProfile(nextSession.user.id);
      } else {
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
  }, [loadProfile]);

  const loadHistory = useCallback(
    async (materialId) => {
      if (!permissions.canViewHistory) return;

      const { data: hist, error: histError } = await supabase
        .from("material_history")
        .select(`
          id,
          material_id,
          alter_standort,
          neuer_standort,
          geändert_am,
          geändert_von,
          field_key,
          old_value,
          new_value,
          action_type
        `)
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
        const ts = new Date(h.geändert_am).toLocaleString("de-DE");
        const type = String(h.action_type || "standort").toLowerCase();

        if (type === "standort") {
          return `${ts} – ${userName}: Standort ${h.alter_standort || "–"} → ${h.neuer_standort || "–"}`;
        }

        if (type === "detail") {
          return `${ts} – ${userName}: Detail "${h.field_key || "unbekannt"}" geändert: ${h.old_value || "–"} → ${h.new_value || "–"}`;
        }

        if (type === "name") {
          return `${ts} – ${userName}: Name geändert: ${h.old_value || "–"} → ${h.new_value || "–"}`;
        }

        if (type === "create") {
          return `${ts} – ${userName}: Material angelegt: ${h.new_value || "–"}`;
        }

        if (type === "delete") {
          return `${ts} – ${userName}: Material gelöscht: ${h.old_value || "–"}`;
        }

        return `${ts} – ${userName}: ${type} – ${h.old_value || "–"} → ${h.new_value || "–"}`;
      });

      setHistory((prev) => ({ ...prev, [materialId]: formatted }));
    },
    [permissions.canViewHistory]
  );

  const saveDetails = useCallback(
    async (materialId, newValues) => {
      if (!permissions.canEditDetails) return false;

      const userId = await getCurrentUserId();
      const oldValues = detailsByMaterialId?.[materialId] || {};

      const payload = {
        material_id: materialId,
        values: newValues,
        updated_by: userId,
      };

      const { error } = await supabase
        .from("material_details")
        .upsert(payload, { onConflict: "material_id" });

      if (error) {
        console.error("Details speichern Fehler:", error);
        alert("Speichern fehlgeschlagen: " + error.message);
        return false;
      }

      const changedKeys = [...new Set([
        ...Object.keys(oldValues || {}),
        ...Object.keys(newValues || {}),
      ])];

      const historyRows = changedKeys
        .filter((key) => {
          const oldVal = stringifyHistoryValue(oldValues?.[key]);
          const newVal = stringifyHistoryValue(newValues?.[key]);
          return oldVal !== newVal;
        })
        .map((key) => ({
          material_id: materialId,
          alter_standort: null,
          neuer_standort: null,
          geändert_von: userId,
          geändert_am: new Date().toISOString(),
          field_key: key,
          old_value: stringifyHistoryValue(oldValues?.[key]),
          new_value: stringifyHistoryValue(newValues?.[key]),
          action_type: "detail",
        }));

      await insertHistoryRows(historyRows);

      setDetailsByMaterialId((prev) => ({ ...prev, [materialId]: newValues }));
      return true;
    },
    [detailsByMaterialId, permissions.canEditDetails]
  );

  const saveItemName = useCallback(
    async (materialId, newName) => {
      if (!permissions.canRenameMaterial) return false;

      const userId = await getCurrentUserId();
      const item = material.find((m) => m.id === materialId);
      const oldName = item?.name || "";
      const name = String(newName || "").trim();

      if (!name) return false;
      if (oldName === name) return true;

      const { error } = await supabase
        .from("material")
        .update({ name })
        .eq("id", materialId);

      if (error) {
        alert("Name speichern fehlgeschlagen: " + error.message);
        return false;
      }

      await insertHistoryRows([
        {
          material_id: materialId,
          alter_standort: null,
          neuer_standort: null,
          geändert_von: userId,
          geändert_am: new Date().toISOString(),
          field_key: "name",
          old_value: oldName,
          new_value: name,
          action_type: "name",
        },
      ]);

      setMaterial((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, name } : m))
      );

      return true;
    },
    [material, permissions.canRenameMaterial]
  );

  const renameBundleBaseName = useCallback(
    async (bundleId, newBaseName) => {
      if (!permissions.canRenameMaterial || !bundleId) return false;

      const base = String(newBaseName || "").trim();
      if (!base) return false;

      const items = material.filter((m) => m.bundle_id === bundleId && (m.kategorie === "Skulls" || m.kategorie === "Riemen"));
      if (items.length === 0) return false;

      for (const it of items) {
        const old = it.name || "";
        const match = old.match(/^(.*?)(\s+\d+)(\s+-\s+.*)?$/);
        const nextName = match ? `${base}${match[2]}${match[3] || ""}` : `${base} ${old}`;

        // eslint-disable-next-line no-await-in-loop
        const { error } = await supabase.from("material").update({ name: nextName }).eq("id", it.id);
        if (error) {
          alert("Umbenennen fehlgeschlagen: " + error.message);
          return false;
        }
      }

      setMaterial((prev) =>
        prev.map((m) => {
          if (m.bundle_id !== bundleId) return m;
          if (!(m.kategorie === "Skulls" || m.kategorie === "Riemen")) return m;
          const old = m.name || "";
          const match = old.match(/^(.*?)(\s+\d+)(\s+-\s+.*)?$/);
          const nextName = match ? `${base}${match[2]}${match[3] || ""}` : `${base} ${old}`;
          return { ...m, name: nextName };
        })
      );

      return true;
    },
    [material, permissions.canRenameMaterial]
  );

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
      if (!(permissions.canUseAdminPanel && showAdmin)) return;

      if (!createSkullAusleger && !createRiemenAusleger) {
        alert("Bitte mindestens Skullausleger oder Riemenausleger auswählen.");
        return;
      }

      const userId = await getCurrentUserId();
      const bundleId = uid();
      const plaetze = Math.max(1, Number(boatDetails?.plaetze || 1));

      const rows = [{ name: boatName, kategorie: "Boote", standort, bundle_id: bundleId }];

      if (hasHuelle) {
        rows.push({ name: huelleName || `${boatName} - Hülle`, kategorie: "Hüllen", standort, bundle_id: bundleId });
      }

      for (let i = 1; i <= plaetze; i += 1) {
        rows.push({ name: `${boatName} - Rollsitz ${i}`, kategorie: "Rollsitze", standort, bundle_id: bundleId });
      }

      if (createSkullAusleger) {
        for (let i = 1; i <= plaetze; i += 1) {
          rows.push({ name: `${boatName} - Skullausleger ${i}`, kategorie: "Ausleger", standort, bundle_id: bundleId });
        }
      }

      if (createRiemenAusleger) {
        for (let i = 1; i <= plaetze; i += 1) {
          rows.push({ name: `${boatName} - Riemenausleger ${i}`, kategorie: "Ausleger", standort, bundle_id: bundleId });
        }
      }

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
        huelle_notiz: hasHuelle ? huelleNotiz || "" : "",
      });

      const detailsUpserts = [];
      if (boatRow) detailsUpserts.push({ material_id: boatRow.id, values: boatValues, updated_by: userId });

      if (hasHuelle && huelleRow) {
        detailsUpserts.push({
          material_id: huelleRow.id,
          values: normalizeDetailsForCategory("Hüllen", { notiz: huelleNotiz || "" }),
          updated_by: userId,
        });
      }

      for (let i = 0; i < rollsitzRows.length; i += 1) {
        detailsUpserts.push({
          material_id: rollsitzRows[i].id,
          values: normalizeDetailsForCategory("Rollsitze", rollsitzPerSeatDetails?.[i] || {}),
          updated_by: userId,
        });
      }

      for (const row of auslegerRows) {
        const lowerName = (row.name || "").toLowerCase();
        const match = row.name?.match(/(\d+)\s*$/);
        const idx = match ? Math.max(0, Number(match[1]) - 1) : 0;

        if (lowerName.includes("skullausleger")) {
          detailsUpserts.push({
            material_id: row.id,
            values: normalizeDetailsForCategory("Ausleger", { ...(auslegerSkullPerSeatDetails?.[idx] || {}), typ: "skull" }),
            updated_by: userId,
          });
        } else if (lowerName.includes("riemenausleger")) {
          detailsUpserts.push({
            material_id: row.id,
            values: normalizeDetailsForCategory("Ausleger", { ...(auslegerRiemenPerSeatDetails?.[idx] || {}), typ: "riemen" }),
            updated_by: userId,
          });
        } else {
          detailsUpserts.push({ material_id: row.id, values: {}, updated_by: userId });
        }
      }

      if (detailsUpserts.some((d) => d.values && Object.keys(d.values).length > 0)) {
        const { error: detError } = await supabase.from("material_details").upsert(detailsUpserts, { onConflict: "material_id" });
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
        field_key: "created",
        old_value: "",
        new_value: r.name || "",
        action_type: "create",
      }));
      await insertHistoryRows(historyRows);

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
    [permissions.canUseAdminPanel, showAdmin]
  );

  const addSkullsSet = useCallback(
    async ({ setName, count, standort, sharedDetails, perItemDetails }) => {
      if (!(permissions.canUseAdminPanel && showAdmin)) return;

      const userId = await getCurrentUserId();
      const bundleId = uid();
      const setId = uid();
      const n = Math.max(1, Number(count || 1));

      const rows = Array.from({ length: n }).map((_, i) => ({
        name: `${setName} ${i + 1}`,
        kategorie: "Skulls",
        standort,
        bundle_id: bundleId,
        set_id: setId,
      }));

      const { data: inserted, error } = await supabase.from("material").insert(rows).select();
      if (error) {
        alert("Fehler: " + error.message);
        return;
      }

      const shared = normalizeDetailsForCategory("Skulls", sharedDetails || {});
      const detRows = (inserted || []).map((r, idx) => ({
        material_id: r.id,
        values: { ...shared, ...normalizeDetailsForCategory("Skulls", perItemDetails?.[idx] || {}) },
        updated_by: userId,
      }));

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
        field_key: "created",
        old_value: "",
        new_value: r.name || "",
        action_type: "create",
      }));
      await insertHistoryRows(historyRows);

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
    [permissions.canUseAdminPanel, showAdmin]
  );

  const addRiemenSetPairs = useCallback(
    async ({ setName, pairsCount, standort, sharedDetails, perPairDetails }) => {
      if (!(permissions.canUseAdminPanel && showAdmin)) return;

      const userId = await getCurrentUserId();
      const n = Math.max(1, Number(pairsCount || 1));
      const bundleId = n > 1 ? uid() : null;
      const setId = n > 1 ? uid() : null;

      const allRows = Array.from({ length: n }).map((_, i) => ({
        name: n > 1 ? `${setName} ${i + 1}` : setName,
        kategorie: "Riemen",
        standort,
        bundle_id: bundleId,
        set_id: setId,
      }));

      const { data: inserted, error } = await supabase.from("material").insert(allRows).select();
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
          if (["unterschiedliche_seiten", "backbord", "steuerbord"].includes(key)) return;
          if (value !== "" && value !== null && value !== undefined) meta[key] = value;
        });

        const cleanSide = (sideObj = {}) => {
          const out = {};
          Object.entries(sideObj).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) out[key] = value;
          });
          return out;
        };

        return {
          material_id: r.id,
          values: normalizeDetailsForCategory("Riemen", {
            ...shared,
            ...meta,
            unterschiedliche_seiten: unterschiedlicheSeiten,
            backbord: cleanSide(rawPer?.backbord || {}),
            steuerbord: cleanSide(unterschiedlicheSeiten ? rawPer?.steuerbord || {} : rawPer?.backbord || {}),
          }),
          updated_by: userId,
        };
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
        field_key: "created",
        old_value: "",
        new_value: r.name || "",
        action_type: "create",
      }));
      await insertHistoryRows(historyRows);

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
    [permissions.canUseAdminPanel, showAdmin]
  );

  const updateStandortBulk = useCallback(
    async (ids, neuerStandort) => {
      if (!permissions.canEditStandort) return;

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
    [material, permissions.canEditStandort]
  );

  const updateStandort = useCallback(
    async (item, neuerStandort) => {
      if (!permissions.canEditStandort) return;
      if (item.standort === neuerStandort) return;

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
    [detailsByMaterialId, material, permissions.canEditStandort]
  );

  const confirmMoveBoat = useCallback(async () => {
    if (!moveBoatDialog || !permissions.canEditStandort) return;

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
        if (!isSkull && !isRiemen && move.skullAusleger && move.riemenAusleger) ids.add(it.id);
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
  }, [detailsByMaterialId, material, moveBoatDialog, permissions.canEditStandort, updateStandortBulk]);

  const checkBulkCapacity = useCallback(
    (idsArray, targetStandort) => {
      const boatsToMove = (idsArray || [])
        .map((id) => material.find((m) => m.id === id))
        .filter((m) => m && m.kategorie === "Boote" && m.standort !== targetStandort);

      if (boatsToMove.length === 0) return null;

      const movingBySeats = {};
      for (const boat of boatsToMove) {
        const seats = detailsByMaterialId?.[boat.id]?.plaetze;
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
        message: `Am Standort ${targetStandort} wird die Kapazität überschritten:\n\n${issues.map((x) => `• ${x}`).join("\n")}\n\nTrotzdem verschieben?`,
      };
    },
    [detailsByMaterialId, material]
  );

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

  const bulkSelectedItems = (bulkMoveConfirm?.ids || [])
    .map((id) => material.find((m) => m.id === id))
    .filter(Boolean);

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

  const confirmMoveSet = useCallback(async () => {
    if (!moveSetDialog || !permissions.canEditStandort) return;
    const ids = new Set(Array.from(moveSetDialog.selectedIds || []));
    if (ids.size === 0) {
      setMoveSetDialog(null);
      return;
    }
    await updateStandortBulk(ids, moveSetDialog.newStandort);
    setMoveSetDialog(null);
  }, [moveSetDialog, permissions.canEditStandort, updateStandortBulk]);

  const toggleSelect = useCallback((id, checked) => {
    if (!permissions.canEditStandort) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [permissions.canEditStandort]);

  const selectSet = useCallback(
    (setId) => {
      if (!permissions.canEditStandort || !setId) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.set_id === setId).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material, permissions.canEditStandort]
  );

  const selectBundle = useCallback(
    (bundleId) => {
      if (!permissions.canEditStandort || !bundleId) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.bundle_id === bundleId).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material, permissions.canEditStandort]
  );

  const selectPair = useCallback(
    (pairId) => {
      if (!permissions.canEditStandort || !pairId) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        material.filter((m) => m.pair_id === pairId).forEach((m) => next.add(m.id));
        return next;
      });
    },
    [material, permissions.canEditStandort]
  );

  const openDeleteDialog = useCallback(
    (item) => {
      if (!permissions.canDeleteMaterial || !(showAdmin && permissions.isAdmin)) return;
      setDeleteItem(item);
    },
    [permissions.canDeleteMaterial, permissions.isAdmin, showAdmin]
  );

  const deleteMaterialConfirmed = useCallback(async () => {
    if (!deleteItem || !permissions.canDeleteMaterial) return;

    const userId = await getCurrentUserId();

    await insertHistoryRows([
      {
        material_id: deleteItem.id,
        alter_standort: deleteItem.standort || null,
        neuer_standort: null,
        geändert_von: userId,
        geändert_am: new Date().toISOString(),
        field_key: "deleted",
        old_value: deleteItem.name || "",
        new_value: "",
        action_type: "delete",
      },
    ]);

    const { error } = await supabase
      .from("material")
      .delete()
      .eq("id", deleteItem.id);

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
  }, [deleteItem, permissions.canDeleteMaterial]);

  if (!session) return <Auth />;

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="header-logos">
            <img src={brgLogo} alt="Bonner Rudergesellschaft" className="club-logo" />
            <img src={srvLogo} alt="Siegburger Ruderverein" className="club-logo" />
          </div>

          <div>
            <h1 className="header-title">TGSB Material Verwaltung</h1>
            <div className="role-hint">
              Eingeloggt als <span className="role-badge">{permissions.role}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexDirection: "column", alignItems: "flex-end" }}>
          {permissions.canViewStatistics && (
            <button onClick={() => window.open("/statistik.html", "_blank", "noopener,noreferrer")}>
              Statistik
            </button>
          )}

          <button onClick={() => window.open("/tabelle.html", "_blank", "noopener,noreferrer")}>
            Tabelle
          </button>

          <button onClick={() => window.open("/materialverlauf.html", "_blank", "noopener,noreferrer")}>
            Materialverlauf
          </button>

          <button onClick={() => window.open("/trailer.html", "_blank","noopener,noreferrer")}>
            Anhängerplanung
          </button>

          <button onClick={() => window.open("/digitale-bootshalle.html", "_blank", "noopener,noreferrer")}>
            Digitale Bootshalle
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {permissions.canUseAdminPanel && (
              <button
                className={`admin-toggle ${showAdmin ? "is-on" : ""}`}
                onClick={() => setShowAdmin((s) => !s)}
              >
                {showAdmin ? "Bearbeitung verlassen" : "Material anlegen"}
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
      </div>

      {!permissions.canEditStandort && (
        <div className="readonly-note">
          Besucher-Modus: Standorte, Details, Tabelle und digitale Bootshalle sind nur lesbar. Statistik ist sichtbar.
        </div>
      )}

      {permissions.canUseAdminPanel && showAdmin && (
        <AdminPanel
          addBoatWithSeatItems={addBoatWithSeatItems}
          addSkullsSet={addSkullsSet}
          addRiemenSetPairs={addRiemenSetPairs}
        />
      )}

      {permissions.canEditStandort && selectedIds.size > 0 && (
        <div className="card" style={{ position: "sticky", top: 10, zIndex: 5 }}>
          <h3>Auswahl: {selectedIds.size} Elemente</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ opacity: 0.8 }}>Standort setzen:</span>

            <select
              value={bulkTarget}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;

                setBulkMoveConfirm({
                  newStandort: value,
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
            <button
              onClick={() => setShowSelectedList((s) => !s)}
              style={{ width: "fit-content" }}
              title="Auswahl-Liste auf-/zuklappen"
            >
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
        showAdmin={permissions.canDeleteMaterial && showAdmin}
        canEditStandort={permissions.canEditStandort}
        canViewHistory={permissions.canViewHistory}
        canOpenDetails
        loadHistory={loadHistory}
        onOpenDetails={(id) => setOpenDetailsId(id)}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        selectSet={selectSet}
        selectBundle={selectBundle}
        selectPair={selectPair}
      />

      {openHistoryId && permissions.canViewHistory && (
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
          canEdit={permissions.canEditDetails}
          isAdmin={permissions.isAdmin}
          onSaveName={saveItemName}
          onRenameBundleBaseName={renameBundleBaseName}
        />
      )}

      {deleteItem && (
        <DeleteModal
          materialName={deleteItem?.name || "Unbekannt"}
          onCancel={() => setDeleteItem(null)}
          onConfirm={deleteMaterialConfirmed}
        />
      )}

      {moveBoatDialog && permissions.canEditStandort && (
        <MoveBoatModal
          boatName={moveBoatDialog.boat?.name || "Boot"}
          newStandort={moveBoatDialog.newStandort}
          move={moveBoatDialog.move}
          disabledSkullAusleger={!moveBoatDialog.availability?.skullAusleger}
          disabledRiemenAusleger={!moveBoatDialog.availability?.riemenAusleger}
          onToggle={(key) =>
            setMoveBoatDialog((prev) => {
              const avail = prev?.availability || {};
              if ((key === "skullAusleger" && !avail.skullAusleger) || (key === "riemenAusleger" && !avail.riemenAusleger)) {
                return prev;
              }
              return { ...prev, move: { ...prev.move, [key]: !prev.move[key] } };
            })
          }
          onCancel={() => setMoveBoatDialog(null)}
          onConfirm={confirmMoveBoat}
        />
      )}

      {moveSetDialog && permissions.canEditStandort && (
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

      {capacityConfirm && permissions.canEditStandort && (
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

      {bulkMoveConfirm && permissions.canEditStandort && (
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

      {bulkCapacityConfirm && permissions.canEditStandort && (
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
