import { useMemo } from "react";
import { extractLastNumber, extractPairNumber, sideOrder } from "../../lib/sort";

export default function MoveSetModal({ title, itemName, newStandort, items, selectedIds, onToggleId, onSelectAll, onSelectOnlyThis, onCancel, onConfirm }) {
  const isRiemen = (items?.[0]?.kategorie || "") === "Riemen";

  const sortedItems = useMemo(() => {
    const arr = [...(items || [])];
    if (!isRiemen) {
      return arr.sort((a, b) => (extractLastNumber(a.name) ?? 999999) - (extractLastNumber(b.name) ?? 999999) || (a.name || "").localeCompare(b.name || ""));
    }
    return arr.sort(
      (a, b) =>
        (extractPairNumber(a.name) ?? 999999) - (extractPairNumber(b.name) ?? 999999) ||
        sideOrder(a.side) - sideOrder(b.side) ||
        (a.name || "").localeCompare(b.name || "")
    );
  }, [items, isRiemen]);

  const groupedPairs = useMemo(() => {
    if (!isRiemen) return [];
    const map = {};
    for (const it of sortedItems) {
      const pid = it.pair_id || it.id;
      if (!map[pid]) map[pid] = [];
      map[pid].push(it);
    }
    return Object.entries(map)
      .map(([pid, arr]) => ({ pid, arr }))
      .sort((a, b) => (extractPairNumber(a.arr?.[0]?.name) ?? 999999) - (extractPairNumber(b.arr?.[0]?.name) ?? 999999));
  }, [sortedItems, isRiemen]);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>

        <h3>{title}</h3>
        <p style={{ opacity: 0.85, marginTop: 6 }}>
          Auslöser: <strong>{itemName}</strong>
        </p>
        <p style={{ opacity: 0.85, marginTop: 6 }}>
          Neuer Standort: <strong>{newStandort}</strong>
        </p>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onSelectAll}>Alle auswählen</button>
          <button onClick={onSelectOnlyThis} style={{ background: "var(--secondary-text)" }}>
            Nur dieses auswählen
          </button>
          <div style={{ opacity: 0.8, alignSelf: "center" }}>
            Ausgewählt: <strong>{selectedIds?.size || 0}</strong>
          </div>
        </div>

        <div style={{ marginTop: 14, maxHeight: "45vh", overflow: "auto", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }}>
          {!isRiemen && (
            <div style={{ display: "grid", gap: 8 }}>
              {sortedItems.map((it) => (
                <label key={it.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={selectedIds?.has(it.id)} onChange={() => onToggleId(it.id)} />
                  <span>{it.name}</span>
                </label>
              ))}
            </div>
          )}

          {isRiemen && (
            <div style={{ display: "grid", gap: 12 }}>
              {groupedPairs.map((g, idx) => {
                const ids = g.arr.map((x) => x.id);
                const allChecked = ids.every((id) => selectedIds?.has(id));
                const label = `Paar ${idx + 1}`;

                return (
                  <div key={g.pid} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 10 }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => {
                          if (!allChecked) ids.forEach((id) => onToggleId(id, true));
                          else ids.forEach((id) => onToggleId(id, false));
                        }}
                      />
                      {label}
                    </label>

                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      {g.arr
                        .slice()
                        .sort((a, b) => sideOrder(a.side) - sideOrder(b.side) || (a.name || "").localeCompare(b.name || ""))
                        .map((it) => (
                          <label key={it.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="checkbox" checked={selectedIds?.has(it.id)} onChange={() => onToggleId(it.id)} />
                            <span style={{ opacity: 0.95 }}>{it.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} style={{ background: "var(--secondary-text)" }}>
            Abbrechen
          </button>
          <button onClick={onConfirm}>Verschieben</button>
        </div>
      </div>
    </div>
  );
}