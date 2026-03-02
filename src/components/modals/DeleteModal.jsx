export default function DeleteModal({ materialName, onCancel, onConfirm }) {
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