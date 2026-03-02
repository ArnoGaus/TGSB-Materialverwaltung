export default function HistoryModal({ materialName, entries, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h3>Verlauf: {materialName}</h3>
        {entries.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Kein Verlauf vorhanden.</p>
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