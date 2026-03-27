const { jsPDF } = window.jspdf;
/**
 * ============================================
 * Mock-Daten / Beispiel-Datenmodell
 * ============================================
 * Diese Daten bitte später an dein echtes System anbinden.
 */
const materials = [
  {
    id: "boot-1",
    name: "Einer 101",
    type: "boot",
    location: "Bootshaus A",
    bundleComponents: [
      { id: "cmp-1", name: "Rollsitz Einer 101", type: "seat", location: "Bootshaus A" },
      { id: "cmp-2", name: "Skulls Satz A", type: "scull", location: "Riemenraum" },
      { id: "cmp-3", name: "Ausleger Einer 101", type: "outrigger", location: "Werkstatt" }
    ]
  },
  {
    id: "boot-2",
    name: "Doppelzweier 202",
    type: "boot",
    location: "Halle 1",
    bundleComponents: [
      { id: "cmp-4", name: "2 Rollsitze DZ 202", type: "seat", location: "Halle 1" },
      { id: "cmp-5", name: "2x Skulls Carbon", type: "scull", location: "Skullregal" },
      { id: "cmp-6", name: "Ausleger-Set DZ 202", type: "outrigger", location: "Werkstatt" }
    ]
  },
  {
    id: "boot-3",
    name: "Vierer 17",
    type: "boot",
    location: "Bootshaus B",
    bundleComponents: [
      { id: "cmp-7", name: "4 Rollsitze Vierer 17", type: "seat", location: "Bootshaus B" },
      { id: "cmp-8", name: "4x Riemen Big Blade", type: "sweep", location: "Riemenraum" },
      { id: "cmp-9", name: "Ausleger Vierer 17", type: "outrigger", location: "Werkstatt" }
    ]
  },
  {
    id: "boot-4",
    name: "Achter 1",
    type: "boot",
    location: "Große Halle",
    bundleComponents: [
      { id: "cmp-10", name: "8 Rollsitze Achter 1", type: "seat", location: "Große Halle" },
      { id: "cmp-11", name: "8x Riemen Ultralight", type: "sweep", location: "Riemenraum" },
      { id: "cmp-12", name: "Ausleger Achter 1", type: "outrigger", location: "Werkstatt" }
    ]
  }
];
/**
 * Anhänger-Layouts
 * Positionen in Prozent oder Pixel-ähnlicher Darstellung.
 * Diese Vorlage bildet dein Schema grob nach.
 */
const trailers = [
  {
    id: "trailer-1",
    name: "Anhänger A",
    slots: [
      { id: "5.1", x: 2, y: 0, w: 46, h: 7 },
      { id: "5.4", x: 52, y: 0, w: 46, h: 7 },
      { id: "4.1", x: 2, y: 10, w: 46, h: 10 },
      { id: "4.6", x: 48, y: 10, w: 50, h: 10 },
      { id: "2.5", x: 22, y: 28, w: 26, h: 10 },
      { id: "2.6", x: 58, y: 28, w: 26, h: 10 },
      { id: "2.1", x: 2, y: 35, w: 22, h: 10 },
      { id: "2.2", x: 24, y: 35, w: 24, h: 10 },
      { id: "2.3", x: 52, y: 35, w: 22, h: 10 },
      { id: "2.4", x: 74, y: 35, w: 24, h: 10 },
      { id: "1.5", x: 18, y: 46, w: 30, h: 10 },
      { id: "1.6", x: 52, y: 46, w: 30, h: 10 },
      { id: "1.1", x: 2, y: 52, w: 22, h: 10 },
      { id: "1.2", x: 24, y: 52, w: 24, h: 10 },
      { id: "1.3", x: 52, y: 52, w: 22, h: 10 },
      { id: "1.4", x: 74, y: 52, w: 24, h: 10 }
    ]
  },
  {
    id: "trailer-2",
    name: "Anhänger B",
    slots: [
      { id: "3.1", x: 5, y: 5, w: 40, h: 12 },
      { id: "3.2", x: 55, y: 5, w: 40, h: 12 },
      { id: "2.1", x: 5, y: 24, w: 25, h: 12 },
      { id: "2.2", x: 30, y: 24, w: 15, h: 12 },
      { id: "2.3", x: 55, y: 24, w: 15, h: 12 },
      { id: "2.4", x: 70, y: 24, w: 25, h: 12 },
      { id: "1.1", x: 5, y: 45, w: 20, h: 12 },
      { id: "1.2", x: 25, y: 45, w: 20, h: 12 },
      { id: "1.3", x: 55, y: 45, w: 20, h: 12 },
      { id: "1.4", x: 75, y: 45, w: 20, h: 12 }
    ]
  }
];
/**
 * State
 */
const state = {
  selectedTrailerId: null,
  trailerAssignments: {
    // trailerId: {
    //   slotId: {
    //     boatId,
    //     boatName,
    //     originLocation,
    //     selectedComponents: [{id, name, type, location}]
    //   }
    // }
  },
  dragBoatId: null,
  pendingDrop: null,
  searchText: ""
};
/**
 * DOM
 */
const trailerSelect = document.getElementById("trailerSelect");
const currentTrailerName = document.getElementById("currentTrailerName");
const materialList = document.getElementById("materialList");
const trailerCanvas = document.getElementById("trailerCanvas");
const restMaterialList = document.getElementById("restMaterialList");
const searchInput = document.getElementById("searchInput");
const btnClearTrailer = document.getElementById("btnClearTrailer");
const btnExportPdf = document.getElementById("btnExportPdf");
const bundleDialog = document.getElementById("bundleDialog");
const bundleDialogText = document.getElementById("bundleDialogText");
const componentList = document.getElementById("componentList");
const btnBundleCancel = document.getElementById("btnBundleCancel");
const btnBundleConfirm = document.getElementById("btnBundleConfirm");
const pdfRenderArea = document.getElementById("pdfRenderArea");
/**
 * Initialisierung
 */
function init() {
  populateTrailerSelect();
  if (trailers.length > 0) {
    state.selectedTrailerId = trailers[0].id;
    trailerSelect.value = state.selectedTrailerId;
  }
  bindEvents();
  renderAll();
}
function bindEvents() {
  trailerSelect.addEventListener("change", (e) => {
    state.selectedTrailerId = e.target.value;
    renderAll();
  });
  searchInput.addEventListener("input", (e) => {
    state.searchText = e.target.value.toLowerCase().trim();
    renderMaterialList();
  });
  btnClearTrailer.addEventListener("click", () => {
    if (!state.selectedTrailerId) return;
    state.trailerAssignments[state.selectedTrailerId] = {};
    renderAll();
  });
  btnExportPdf.addEventListener("click", exportPdf);
  btnBundleCancel.addEventListener("click", () => {
    state.pendingDrop = null;
    bundleDialog.close();
  });
  btnBundleConfirm.addEventListener("click", confirmBundleSelection);
}
function populateTrailerSelect() {
  trailerSelect.innerHTML = "";
  trailers.forEach((trailer) => {
    const option = document.createElement("option");
    option.value = trailer.id;
    option.textContent = trailer.name;
    trailerSelect.appendChild(option);
  });
}
/**
 * Rendering
 */
function renderAll() {
  renderTrailerHeader();
  renderMaterialList();
  renderTrailerCanvas();
  renderRestMaterial();
}
function renderTrailerHeader() {
  const trailer = getSelectedTrailer();
  currentTrailerName.textContent = trailer ? trailer.name : "Kein Anhänger gewählt";
}
function renderMaterialList() {
  materialList.innerHTML = "";
  const availableBoats = getAvailableBoats()
    .filter((item) => {
      if (!state.searchText) return true;
      const haystack = `${item.name} ${item.location} ${item.type}`.toLowerCase();
      return haystack.includes(state.searchText);
    });
  if (availableBoats.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Kein passendes verfügbares Material gefunden.";
    materialList.appendChild(empty);
    return;
  }
  availableBoats.forEach((boat) => {
    const card = document.createElement("div");
    card.className = "material-card";
    card.draggable = true;
    card.dataset.boatId = boat.id;
    card.innerHTML = `
      <div class="material-title">${escapeHtml(boat.name)}</div>
      <div class="material-meta">Typ: ${escapeHtml(boat.type)}</div>
      <div class="material-meta">Standort: ${escapeHtml(boat.location)}</div>
      <div class="material-meta">Komponenten: ${boat.bundleComponents?.length || 0}</div>
    `;
    card.addEventListener("dragstart", () => {
      state.dragBoatId = boat.id;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      state.dragBoatId = null;
      card.classList.remove("dragging");
    });
    materialList.appendChild(card);
  });
}
function renderTrailerCanvas() {
  trailerCanvas.innerHTML = "";
  const trailer = getSelectedTrailer();
  if (!trailer) {
    trailerCanvas.innerHTML = `<div class="muted">Kein Anhänger ausgewählt.</div>`;
    return;
  }
  const assignments = getAssignmentsForTrailer(trailer.id);
  trailer.slots.forEach((slot) => {
    const slotEl = document.createElement("div");
    slotEl.className = "slot";
    slotEl.style.left = `${slot.x}%`;
    slotEl.style.top = `${slot.y}%`;
    slotEl.style.width = `${slot.w}%`;
    slotEl.style.height = `${slot.h}%`;
    slotEl.dataset.slotId = slot.id;
    const assignment = assignments[slot.id];
    let innerHtml = `
      <div class="slot-label">Platz ${escapeHtml(slot.id)}</div>
      <div class="slot-content">
    `;
    if (!assignment) {
      innerHtml += `<div class="slot-empty">frei</div>`;
    } else {
      innerHtml += `
        <div class="slot-boat-name">${escapeHtml(assignment.boatName)}</div>
        <div class="slot-components">
          ${assignment.selectedComponents.length > 0
            ? assignment.selectedComponents.map(c => escapeHtml(c.name)).join(", ")
            : "Keine Zusatzkomponenten"}
        </div>
        <div class="danger-link" data-remove-slot="${escapeHtml(slot.id)}">Entfernen</div>
      `;
    }
    innerHtml += `</div>`;
    slotEl.innerHTML = innerHtml;
    slotEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      slotEl.classList.add("drag-over");
    });
    slotEl.addEventListener("dragleave", () => {
      slotEl.classList.remove("drag-over");
    });
    slotEl.addEventListener("drop", (e) => {
      e.preventDefault();
      slotEl.classList.remove("drag-over");
      if (!state.dragBoatId) return;
      const boat = materials.find((m) => m.id === state.dragBoatId && m.type === "boot");
      if (!boat) return;
      openBundleDialog(boat, slot.id);
    });
    trailerCanvas.appendChild(slotEl);
  });
  trailerCanvas.querySelectorAll("[data-remove-slot]").forEach((el) => {
    el.addEventListener("click", () => {
      const slotId = el.getAttribute("data-remove-slot");
      removeAssignment(slotId);
    });
  });
}
function renderRestMaterial() {
  restMaterialList.innerHTML = "";
  const trailer = getSelectedTrailer();
  if (!trailer) return;
  const assignments = Object.values(getAssignmentsForTrailer(trailer.id));
  const components = assignments.flatMap((a) =>
    a.selectedComponents.map((c) => ({
      ...c,
      boatName: a.boatName
    }))
  );
  if (components.length === 0) {
    restMaterialList.innerHTML = `<div class="muted">Noch kein Restmaterial ausgewählt.</div>`;
    return;
  }
  components.forEach((item) => {
    const el = document.createElement("div");
    el.className = "rest-item";
    el.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong><br>
      <span class="muted">Typ: ${escapeHtml(item.type)} | Zugeordnet zu: ${escapeHtml(item.boatName)} | Ursprungsort: ${escapeHtml(item.location)}</span>
    `;
    restMaterialList.appendChild(el);
  });
}
/**
 * Dialog
 */
function openBundleDialog(boat, slotId) {
  state.pendingDrop = { boatId: boat.id, slotId };
  bundleDialogText.textContent =
    `${boat.name} wird auf Platz ${slotId} gelegt. Welche Komponenten sollen mit auf den Anhänger?`;
  componentList.innerHTML = "";
  const components = boat.bundleComponents || [];
  if (components.length === 0) {
    componentList.innerHTML = `<div class="muted">Für dieses Boot sind keine Bundle-Komponenten hinterlegt.</div>`;
  } else {
    components.forEach((component, index) => {
      const row = document.createElement("label");
      row.className = "component-row";
      row.innerHTML = `
        <input type="checkbox" value="${escapeHtml(component.id)}" ${index === 0 ? "checked" : ""} />
        <div>
          <div><strong>${escapeHtml(component.name)}</strong></div>
          <div class="muted">Typ: ${escapeHtml(component.type)} | Standort: ${escapeHtml(component.location)}</div>
        </div>
      `;
      componentList.appendChild(row);
    });
  }
  bundleDialog.showModal();
}
function confirmBundleSelection() {
  if (!state.pendingDrop) {
    bundleDialog.close();
    return;
  }
  const { boatId, slotId } = state.pendingDrop;
  const boat = materials.find((m) => m.id === boatId);
  const trailer = getSelectedTrailer();
  if (!boat || !trailer) {
    state.pendingDrop = null;
    bundleDialog.close();
    return;
  }
  const selectedIds = Array.from(
    componentList.querySelectorAll('input[type="checkbox"]:checked')
  ).map((input) => input.value);
  const selectedComponents = (boat.bundleComponents || []).filter((c) =>
    selectedIds.includes(c.id)
  );
  const assignments = getAssignmentsForTrailer(trailer.id);
  assignments[slotId] = {
    boatId: boat.id,
    boatName: boat.name,
    originLocation: boat.location,
    selectedComponents
  };
  state.trailerAssignments[trailer.id] = assignments;
  state.pendingDrop = null;
  bundleDialog.close();
  renderAll();
}
/**
 * Logik
 */
function getSelectedTrailer() {
  return trailers.find((t) => t.id === state.selectedTrailerId) || null;
}
function getAssignmentsForTrailer(trailerId) {
  if (!state.trailerAssignments[trailerId]) {
    state.trailerAssignments[trailerId] = {};
  }
  return state.trailerAssignments[trailerId];
}
function getAvailableBoats() {
  const assignedBoatIds = Object.values(state.trailerAssignments)
    .flatMap((assignments) => Object.values(assignments))
    .map((a) => a.boatId);
  return materials.filter((m) => m.type === "boot" && !assignedBoatIds.includes(m.id));
}
function removeAssignment(slotId) {
  const trailer = getSelectedTrailer();
  if (!trailer) return;
  const assignments = getAssignmentsForTrailer(trailer.id);
  delete assignments[slotId];
  renderAll();
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
/**
 * PDF Export
 */
async function exportPdf() {
  const trailer = getSelectedTrailer();
  if (!trailer) return;
  const assignments = getAssignmentsForTrailer(trailer.id);
  const assignmentRows = trailer.slots.map((slot) => {
    const a = assignments[slot.id];
    return {
      slotId: slot.id,
      boatName: a?.boatName || "",
      components: a?.selectedComponents?.map((c) => c.name).join(", ") || "",
      originLocation: a?.originLocation || ""
    };
  });
  const allComponents = Object.values(assignments).flatMap((a) =>
    a.selectedComponents.map((c) => ({
      boatName: a.boatName,
      componentName: c.name,
      type: c.type,
      location: c.location
    }))
  );
  pdfRenderArea.innerHTML = createPdfMarkup(trailer, assignmentRows, allComponents);
  const canvasTarget = pdfRenderArea.querySelector(".pdf-export-wrapper");
  const canvas = await html2canvas(canvasTarget, {
    scale: 2,
    backgroundColor: "#ffffff"
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }
  pdf.save(`${trailer.name.replace(/\s+/g, "_")}_Planung.pdf`);
}
function createPdfMarkup(trailer, assignmentRows, allComponents) {
  return `
    <div class="pdf-export-wrapper">
      <div class="pdf-title">Anhängerplanung: ${escapeHtml(trailer.name)}</div>
      <div class="pdf-section">
        <h2>Schema</h2>
        <div style="
          position: relative;
          width: 100%;
          height: 700px;
          border: 2px solid #222;
          background:
            linear-gradient(to right, transparent 49.7%, #222 49.7%, #222 50.3%, transparent 50.3%);
          background-color: #fff;
        ">
          ${trailer.slots.map(slot => {
            const row = assignmentRows.find(r => r.slotId === slot.id);
            return `
              <div style="
                position:absolute;
                left:${slot.x}%;
                top:${slot.y}%;
                width:${slot.w}%;
                height:${slot.h}%;
                border:2px solid #222;
                background:#f5f9ff;
                padding:6px;
                font-size:12px;
                overflow:hidden;
              ">
                <div style="font-weight:bold; font-size:11px;">Platz ${escapeHtml(slot.id)}</div>
                <div style="margin-top:8px;">
                  ${row.boatName ? `<strong>${escapeHtml(row.boatName)}</strong>` : `<em>frei</em>`}
                </div>
                <div style="font-size:10px; margin-top:4px;">
                  ${escapeHtml(row.components || "")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
      <div class="pdf-section">
        <h2>Belegung der Plätze</h2>
        <table class="pdf-list">
          <thead>
            <tr>
              <th>Platz</th>
              <th>Boot</th>
              <th>Ursprungsstandort</th>
              <th>Komponenten</th>
            </tr>
          </thead>
          <tbody>
            ${assignmentRows.map(row => `
              <tr>
                <td>${escapeHtml(row.slotId)}</td>
                <td>${escapeHtml(row.boatName || "-")}</td>
                <td>${escapeHtml(row.originLocation || "-")}</td>
                <td>${escapeHtml(row.components || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="pdf-section">
        <h2>Mitgeführtes Material</h2>
        <table class="pdf-list">
          <thead>
            <tr>
              <th>Material</th>
              <th>Typ</th>
              <th>Zugeordnet zu Boot</th>
              <th>Ursprungsstandort</th>
            </tr>
          </thead>
          <tbody>
            ${allComponents.length > 0
              ? allComponents.map(item => `
                <tr>
                  <td>${escapeHtml(item.componentName)}</td>
                  <td>${escapeHtml(item.type)}</td>
                  <td>${escapeHtml(item.boatName)}</td>
                  <td>${escapeHtml(item.location)}</td>
                </tr>
              `).join("")
              : `
                <tr>
                  <td colspan="4">Kein zusätzliches Material ausgewählt.</td>
                </tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}
init();