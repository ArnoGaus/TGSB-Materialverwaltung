export default function BulkMoveConfirmModal({
  newStandort,
  itemsGrouped,
  categoryOrder,
  totalCount,
  onConfirm,
  onCancel,
  onEdit,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>

        <h3>Standortwechsel bestätigen</h3>
        <p style={{ opacity: 0.85, marginTop: 6 }}>
          Es wird folgendes Material nach <strong>{newStandort}</strong> verschoben:
        </p>

        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: 10,
            maxHeight: "50vh",
            overflow: "auto",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Gesamt: <strong>{totalCount}</strong>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {categoryOrder.map((cat) => {
              const list = itemsGrouped[cat] || [];
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
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onEdit} style={{ background: "rgba(255,255,255,0.08)" }}>
            Material ändern
          </button>
          <button onClick={onCancel} style={{ background: "var(--secondary-text)" }}>
            Abbrechen
          </button>
          <button onClick={onConfirm}>Bestätigen</button>
        </div>
      </div>
    </div>
  );
}