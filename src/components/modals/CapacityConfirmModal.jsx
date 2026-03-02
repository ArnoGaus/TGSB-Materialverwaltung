// src/components/modals/CapacityConfirmModal.jsx
export default function CapacityConfirmModal({ title = "Achtung", message, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>

        <h3 style={{ marginBottom: 10 }}>{title}</h3>
        <p style={{ opacity: 0.9, marginBottom: 18 }}>{message}</p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ background: "var(--secondary-text)" }}>
            Abbrechen
          </button>
          <button onClick={onConfirm}>Trotzdem verschieben</button>
        </div>
      </div>
    </div>
  );
}