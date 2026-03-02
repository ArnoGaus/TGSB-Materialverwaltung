export default function MoveBoatModal({
  boatName,
  newStandort,
  move,
  disabledSkullAusleger = false,
  disabledRiemenAusleger = false,
  onToggle,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>

        <h3>Boot verschieben: {boatName}</h3>
        <p style={{ opacity: 0.85, marginTop: 6 }}>
          Neuer Standort: <strong>{newStandort}</strong>
        </p>

        <div style={{ marginTop: 14 }}>
          <p style={{ marginBottom: 8 }}>Welche Teile aus dem Bundle sollen mit verschoben werden?</p>

          <div style={{ display: "grid", gap: 8 }}>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                opacity: disabledSkullAusleger ? 0.45 : 1,
                cursor: disabledSkullAusleger ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!move.skullAusleger}
                disabled={disabledSkullAusleger}
                onChange={() => onToggle("skullAusleger")}
              />
              Skullausleger (alle Plätze)
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                opacity: disabledRiemenAusleger ? 0.45 : 1,
                cursor: disabledRiemenAusleger ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!move.riemenAusleger}
                disabled={disabledRiemenAusleger}
                onChange={() => onToggle("riemenAusleger")}
              />
              Riemenausleger (alle Plätze)
            </label>



            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={!!move.rollsitze} onChange={() => onToggle("rollsitze")} />
              Rollsitze (alle Plätze)
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={!!move.huellen} onChange={() => onToggle("huellen")} />
              Hülle
            </label>
          </div>
        </div>
        {(disabledSkullAusleger || disabledRiemenAusleger) && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Ausgegraute Ausleger sind für dieses Boot nicht vorhanden.
          </div>
        )}

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