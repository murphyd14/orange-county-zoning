// MapLibre GL JS app with PMTiles + true layer filters + robust analytics
// Colors preserved exactly as provided.

const state = {
  map: null,
  zoningData: null, // Only populated in GeoJSON fallback
  fluData: null,
  zoningMode: "unknown", // 'vector' | 'geojson'
  filters: {
    group: "ALL",
    yearMin: 1980,
    yearMax: 2030,
    areaMin: 0,
    areaMax: 1000,
    search: "",
    showZoning: true,
    showFLU: false,
  },
  charts: {},
  analyticsPanel: null,
  analyticsOpen: false,
  analyticsHandlersBound: false,
};

const colors = {
  Residential: "#6aa6ff",
  Commercial: "#ffb057",
  Industrial: "#b3b6c2",
  "Planned Development": "#c07bff",
  Agricultural: "#7ad0c9",
  "Mixed Use": "#ffd86e",
  Incorporated: "#778899",
  Other: "#87d4a5",
};

// --- Init
function init() {
  // enable PMTiles protocol
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  initMap();
  wireUiBasics();
}

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-tiles",
          type: "raster",
          source: "osm-tiles",
          paint: {
            "raster-opacity": 0.3,
            "raster-saturation": -0.8,
            "raster-contrast": 0.2,
          },
        },
      ],
    },
    center: [-81.38, 28.5],
    zoom: 10,
    attributionControl: false,
  });

  state.map.addControl(new maplibregl.AttributionControl(), "bottom-right");
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");

  state.map.on("load", async () => {
    await loadData(); // now it's safe to add sources/layers
    addLegend();
    wireControls();   // hook up after data exists
    // initial filter push
    updateLayerFilters();
  });

  // selection handlers added once layers exist (in loadData)
}

// --- Data loading
async function loadData() {
  try {
    const pmtilesAvailable = await checkPMTilesAvailability();
    if (pmtilesAvailable) {
      await loadPMTilesData();
      state.zoningMode = "vector";
    } else {
      await loadOptimizedGeoJSON();
      state.zoningMode = "geojson";
    }
    fitMapToDataIfGeoJSON();
  } catch (e) {
    console.error(e);
    showNotification("Failed to load data. Please refresh.", "error");
  }
}

async function checkPMTilesAvailability() {
  try {
    const response = await fetch("data/zoning.pmtiles", { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadPMTilesData() {
  // zoning
  state.map.addSource("zoning", {
    type: "vector",
    url: "pmtiles://./data/zoning.pmtiles",
  });

  state.map.addLayer({
    id: "zoning-fill",
    type: "fill",
    source: "zoning",
    "source-layer": "zoning",
    paint: {
      "fill-color": [
        "match",
        ["get", "z_group"],
        "Residential", colors.Residential,
        "Commercial", colors.Commercial,
        "Industrial", colors.Industrial,
        "Planned Development", colors["Planned Development"],
        "Agricultural", colors.Agricultural,
        "Mixed Use", colors["Mixed Use"],
        "Incorporated", colors.Incorporated,
        colors.Other
      ],
      "fill-opacity": 0.8,
    },
  });

  state.map.addLayer({
    id: "zoning-border",
    type: "line",
    source: "zoning",
    "source-layer": "zoning",
    paint: { "line-color": "#000000", "line-width": 1, "line-opacity": 0.5 },
  });

  // FLU
  state.map.addSource("flu", {
    type: "vector",
    url: "pmtiles://./data/flu.pmtiles",
  });

  state.map.addLayer({
    id: "flu-fill",
    type: "fill",
    source: "flu",
    "source-layer": "flu",
    paint: { "fill-color": "#00e0c7", "fill-opacity": 0.15 },
    layout: { visibility: "none" },
  });

  // interactions
  state.map.on("click", "zoning-fill", (e) => selectFeature(e.features[0]));
  state.map.on("mouseenter", "zoning-fill", () => (state.map.getCanvas().style.cursor = "pointer"));
  state.map.on("mouseleave", "zoning-fill", () => (state.map.getCanvas().style.cursor = ""));
}

async function loadOptimizedGeoJSON() {
  const [zoningResponse, fluResponse] = await Promise.all([
    fetch("data/zoning_optimized.geojson"),
    fetch("data/flu_optimized.geojson"),
  ]);
  if (!zoningResponse.ok || !fluResponse.ok) {
    throw new Error("Failed to load optimized data files");
  }

  state.zoningData = await zoningResponse.json();
  state.fluData = await fluResponse.json();

  state.map.addSource("zoning", { type: "geojson", data: state.zoningData });

  state.map.addLayer({
    id: "zoning-fill",
    type: "fill",
    source: "zoning",
    paint: {
      "fill-color": [
        "match",
        ["get", "z_group"],
        "Residential", colors.Residential,
        "Commercial", colors.Commercial,
        "Industrial", colors.Industrial,
        "Planned Development", colors["Planned Development"],
        "Agricultural", colors.Agricultural,
        "Mixed Use", colors["Mixed Use"],
        "Incorporated", colors.Incorporated,
        colors.Other
      ],
      "fill-opacity": 0.8,
    },
  });

  state.map.addLayer({
    id: "zoning-border",
    type: "line",
    source: "zoning",
    paint: { "line-color": "#000000", "line-width": 1, "line-opacity": 0.5 },
  });

  state.map.addSource("flu", { type: "geojson", data: state.fluData });

  state.map.addLayer({
    id: "flu-fill",
    type: "fill",
    source: "flu",
    paint: { "fill-color": "#00e0c7", "fill-opacity": 0.15 },
    layout: { visibility: "none" },
  });

  state.map.on("click", "zoning-fill", (e) => selectFeature(e.features[0]));
  state.map.on("mouseenter", "zoning-fill", () => (state.map.getCanvas().style.cursor = "pointer"));
  state.map.on("mouseleave", "zoning-fill", () => (state.map.getCanvas().style.cursor = ""));
}

function fitMapToDataIfGeoJSON() {
  if (state.zoningMode !== "geojson" || !state.zoningData) return;

  const bounds = new maplibregl.LngLatBounds();
  state.zoningData.features.forEach((feature) => {
    const g = feature.geometry;
    if (!g) return;
    if (g.type === "Polygon") {
      g.coordinates[0].forEach((c) => bounds.extend(c));
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach((poly) => poly[0].forEach((c) => bounds.extend(c)));
    }
  });
  if (!bounds.isEmpty()) state.map.fitBounds(bounds, { padding: 50 });
}

// --- Controls
function wireUiBasics() {
  // About modal close (works even before map load)
  document.getElementById("aboutCloseBtn").addEventListener("click", closeAboutModal);
  document.getElementById("aboutBtn")?.addEventListener("click", () => {
    document.getElementById("aboutModal").style.display = "flex";
  });

  // Close modal on backdrop click
  document.getElementById("aboutModal").addEventListener("click", (e) => {
    if (e.target.id === "aboutModal") closeAboutModal();
  });

  // ESC closes about & analytics
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAboutModal();
      if (state.analyticsPanel) state.analyticsPanel.style.display = "none";
      state.analyticsOpen = false;
      removeAnalyticsBindings();
    }
  });
}

function wireControls() {
  const groupFilter = document.getElementById("groupFilter");
  const yearMin = document.getElementById("yearMin");
  const yearMax = document.getElementById("yearMax");
  const yearMinValue = document.getElementById("yearMinValue");
  const yearMaxValue = document.getElementById("yearMaxValue");
  const areaMin = document.getElementById("areaMin");
  const areaMax = document.getElementById("areaMax");
  const areaMinValue = document.getElementById("areaMinValue");
  const areaMaxValue = document.getElementById("areaMaxValue");
  const searchInput = document.getElementById("searchInput");
  const toggleZoning = document.getElementById("toggleZoning");
  const toggleFLU = document.getElementById("toggleFLU");
  const exportBtn = document.getElementById("exportBtn");
  const analyticsBtn = document.getElementById("analyticsBtn");

  groupFilter.addEventListener("change", () => {
    state.filters.group = groupFilter.value;
    applyAllFiltersDebounced();
  });

  yearMin.addEventListener("input", () => {
    state.filters.yearMin = Number(yearMin.value);
    yearMinValue.textContent = yearMin.value;
    applyAllFiltersDebounced();
  });

  yearMax.addEventListener("input", () => {
    state.filters.yearMax = Number(yearMax.value);
    yearMaxValue.textContent = yearMax.value;
    applyAllFiltersDebounced();
  });

  areaMin.addEventListener("input", () => {
    state.filters.areaMin = Number(areaMin.value);
    areaMinValue.textContent = areaMin.value;
    applyAllFiltersDebounced();
  });

  areaMax.addEventListener("input", () => {
    state.filters.areaMax = Number(areaMax.value);
    areaMaxValue.textContent = areaMax.value;
    applyAllFiltersDebounced();
  });

  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value.trim();
      applyAllFiltersDebounced();
    }, 250);
  });

  toggleZoning.addEventListener("change", () => {
    state.filters.showZoning = toggleZoning.checked;
    const v = state.filters.showZoning ? "visible" : "none";
    state.map.setLayoutProperty("zoning-fill", "visibility", v);
    state.map.setLayoutProperty("zoning-border", "visibility", v);
    // analytics still updates (in case zoning hidden)
    updateAnalyticsDebounced();
  });

  toggleFLU.addEventListener("change", () => {
    state.filters.showFLU = toggleFLU.checked;
    const v = state.filters.showFLU ? "visible" : "none";
    state.map.setLayoutProperty("flu-fill", "visibility", v);
  });

  exportBtn.addEventListener("click", exportFilteredData);
  analyticsBtn.addEventListener("click", toggleAnalyticsPanel);
}

// --- Filters (true layer filters)
function applyAllFilters() {
  updateLayerFilters();
  updateAnalyticsDebounced();
}

const applyAllFiltersDebounced = debounce(applyAllFilters, 100);
const updateAnalyticsDebounced = debounce(updateAnalyticsFromMapView, 120);

function updateLayerFilters() {
  // Group filter
  const groupExpr =
    state.filters.group === "ALL"
      ? true
      : ["==", ["get", "z_group"], state.filters.group];

  // Area (acres)
  const areaExpr = [
    "all",
    [">=", ["to-number", ["coalesce", ["get", "area_acres"], 0]], state.filters.areaMin],
    ["<=", ["to-number", ["coalesce", ["get", "area_acres"], 0]], state.filters.areaMax],
  ];

  // Search across fields (substring)
  const term = (state.filters.search || "").toLowerCase();
  const searchFields = ["ZONING", "z_group", "PD_NAME", "ZONINGOLD"];
  const searchExpr =
    term.length === 0
      ? true
      : [
          "any",
          ...searchFields.map((f) => [
            "all",
            ["has", f],
            ["!=", ["index-of", term, ["downcase", ["to-string", ["get", f]]]], -1],
          ]),
        ];

  // Year filter:
  // - GeoJSON mode: we can't push a perfect year filter expression without knowing date format; handle in analytics/export.
  // - If the properties are numeric epoch millis, the below expression will work.
  const [minMs, maxMs] = yearRangeToMs(state.filters.yearMin, state.filters.yearMax);
  const numericYearExpr = [
    "any",
    ["all",
      [">=", ["to-number", ["get", "BCC_DATE"]], minMs],
      ["<=", ["to-number", ["get", "BCC_DATE"]], maxMs]
    ],
    ["all",
      [">=", ["to-number", ["get", "P_Z_DATE"]], minMs],
      ["<=", ["to-number", ["get", "P_Z_DATE"]], maxMs]
    ],
    ["all",
      [">=", ["to-number", ["get", "MAINT_DATE"]], minMs],
      ["<=", ["to-number", ["get", "MAINT_DATE"]], maxMs]
    ],
    // If dates are absent, we allow the feature (parity with previous logic)
    ["all", ["!", ["has", "BCC_DATE"]], ["!", ["has", "P_Z_DATE"]], ["!", ["has", "MAINT_DATE"]]],
  ];

  const finalExpr = ["all", groupExpr, areaExpr, searchExpr, numericYearExpr];

  // Apply to both fill + border
  safeSetFilter("zoning-fill", finalExpr);
  safeSetFilter("zoning-border", finalExpr);
}

function yearRangeToMs(yMin, yMax) {
  const min = Date.UTC(yMin, 0, 1, 0, 0, 0, 0);
  const max = Date.UTC(yMax, 11, 31, 23, 59, 59, 999);
  return [min, max];
}

function safeSetFilter(layerId, expr) {
  if (state.map.getLayer(layerId)) {
    state.map.setFilter(layerId, expr);
  }
}

// --- Selection
function selectFeature(feature) {
  if (!feature) return;
  const props = feature.properties || {};

  const existingPanel = document.querySelector('[data-panel="zoning-info"]');
  if (existingPanel) existingPanel.remove();

  const infoPanel = document.createElement("div");
  infoPanel.setAttribute("data-panel", "zoning-info");
  infoPanel.style.cssText = `
    position: absolute; top: 20px; right: 20px;
    background: rgba(22, 26, 46, 0.95); color: #e9edf5; padding: 20px;
    border-radius: 12px; border: 1px solid #2a3152; font-size: 14px; z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 420px; max-height: 80vh; overflow-y: auto;
    backdrop-filter: blur(4px);
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display:flex; justify-content:space-between; align-items:center; padding:16px 20px;
    background: linear-gradient(135deg, #6aa6ff, #7ad0c9); color: white;
    border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;
  `;

  const title = document.createElement("h3");
  title.textContent = "📍 Zoning Information";
  title.style.cssText = `margin:0; font-size:16px; font-weight:600;`;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    background:none; border:none; color:white; font-size:20px; cursor:pointer; padding:0;
    width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:4px;
  `;
  closeBtn.onclick = () => infoPanel.remove();

  header.appendChild(title);
  header.appendChild(closeBtn);
  infoPanel.appendChild(header);

  infoPanel.insertAdjacentHTML(
    "beforeend",
    `
    <div style="margin-bottom: 12px;">
      <span style="color:#6aa6ff;font-weight:bold;">Zoning Code:</span>
      <span style="color:#e9edf5;font-weight:bold;"> ${props.ZONING || "—"}</span>
    </div>
    <div style="margin-bottom: 12px;">
      <span style="color:#7ad0c9;font-weight:bold;">Category:</span>
      <span style="color:#e9edf5;font-weight:bold;"> ${props.z_group || "—"}</span>
    </div>
    ${props.PD_NAME ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#ffb057;font-weight:bold;">PD Name:</span>
      <span style="color:#e9edf5;"> ${props.PD_NAME}</span>
    </div>` : ""}

    ${props.ZONINGOLD ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#c07bff;font-weight:bold;">Previous Zoning:</span>
      <span style="color:#e9edf5;"> ${props.ZONINGOLD}</span>
    </div>` : ""}

    ${props.area_acres ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#ffd86e;font-weight:bold;">Area:</span>
      <span style="color:#e9edf5;"> ${Number(props.area_acres).toLocaleString(undefined, {maximumFractionDigits:2})} acres</span>
    </div>` : ""}

    ${props.BCC_DATE ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#87d4a5;font-weight:bold;">BCC Date:</span>
      <span style="color:#e9edf5;"> ${formatDate(props.BCC_DATE)}</span>
    </div>` : ""}

    ${props.P_Z_DATE ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#778899;font-weight:bold;">Proposed Date:</span>
      <span style="color:#e9edf5;"> ${formatDate(props.P_Z_DATE)}</span>
    </div>` : ""}

    ${props.MAINT_DATE ? `
    <div style="margin-bottom: 12px;">
      <span style="color:#b3b6c2;font-weight:bold;">Maintenance Date:</span>
      <span style="color:#e9edf5;"> ${formatDate(props.MAINT_DATE)}</span>
    </div>` : ""}

    ${
      props.centroid_lat && props.centroid_lon
        ? `<div style="margin-bottom:12px;">
             <span style="color:#6aa6ff;font-weight:bold;">Centroid:</span>
             <span style="color:#e9edf5;"> ${Number(props.centroid_lat).toFixed(4)}, ${Number(props.centroid_lon).toFixed(4)}</span>
           </div>`
        : ""
    }
  `
  );

  document.getElementById("map").appendChild(infoPanel);
}

function formatDate(value) {
  // Handles epoch ms or ISO
  const d = new Date(value);
  return isNaN(d) ? "—" : d.toISOString().slice(0, 10);
}

// --- Legend
function addLegend() {
  const legend = document.createElement("div");
  legend.style.cssText = `
    position:absolute; bottom:20px; right:20px; background:rgba(22,26,46,0.9);
    color:#e9edf5; padding:12px; border-radius:8px; border:1px solid #2a3152;
    font-size:12px; z-index:1000; box-shadow:0 4px 16px rgba(0,0,0,0.3);
  `;
  legend.innerHTML = `
    <div style="margin-bottom:8px;font-weight:bold;color:#6aa6ff;">Zoning Categories</div>
    ${Object.entries(colors).map(([label, color]) => `
      <div style="display:flex;align-items:center;margin-bottom:4px;">
        <div style="width:12px;height:12px;background:${color};border-radius:2px;margin-right:8px;"></div>
        <span>${label}</span>
      </div>`).join("")}
  `;
  document.getElementById("map").appendChild(legend);
}

// --- Export
function exportFilteredData() {
  // Decide source of truth:
  // - GeoJSON: filter entire dataset (fields fully available)
  // - Vector: export current visible, filtered features
  let features = [];
  let mode = state.zoningMode;

  if (mode === "geojson" && state.zoningData) {
    features = filterGeoJSONFeatures(state.zoningData.features);
  } else {
    // visible rendered features in the viewport
    features = getVisibleFilteredFeatures();
    showNotification(`Vector tiles detected: exporting ${features.length} visible filtered feature(s).`, "info");
  }

  if (!features.length) {
    showNotification("No data matches current filters", "error");
    return;
  }

  // Build and show export modal
  const exportModal = document.createElement("div");
  exportModal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex;
    align-items:center; justify-content:center; z-index:2000;
  `;
  const exportContent = document.createElement("div");
  exportContent.style.cssText = `
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    padding: 24px; max-width: 560px; width: 90%; color: var(--text); font-family: Arial, sans-serif;
  `;

  const sample = features[0];
  const props = sample.properties || {};
  const fields = Object.keys(props);
  const defaultFields = ["ZONING", "z_group", "area_acres", "PD_NAME", "BCC_DATE", "centroid_lat", "centroid_lon"];

  exportContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="margin:0;color:var(--accent);">📊 Export Data</h3>
      <button id="exportClose" style="background:none;border:none;color:var(--text);font-size:20px;cursor:pointer;">×</button>
    </div>
    <p style="margin:0 0 12px 0; color: var(--muted);">
      Export ${features.length.toLocaleString()} filtered ${mode === "geojson" ? "feature(s)" : "visible feature(s)"}.
    </p>

    <div style="margin-bottom: 12px;">
      <label style="display:block;margin-bottom:8px;">Export Format:</label>
      <select id="exportFormat" style="width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;">
        <option value="csv">CSV (Excel)</option>
        <option value="geojson">GeoJSON (GIS)</option>
        <option value="json">JSON (Raw)</option>
      </select>
    </div>

    <div style="margin-bottom: 12px;">
      <label style="display:block;margin-bottom:8px;">Include Fields:</label>
      <div id="fieldOptions" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;padding:8px;">
        ${fields.map((f) => `
          <label style="display:flex;align-items:center;margin-bottom:6px;font-size:12px;">
            <input type="checkbox" value="${f}" ${defaultFields.includes(f) ? "checked" : ""} style="margin-right:8px;">${f}
          </label>
        `).join("")}
      </div>
    </div>

    <div style="display:flex;gap:12px;justify-content:flex-end;">
      <button id="exportCancel" style="padding:8px 16px;background:var(--border);color:var(--text);border:none;border-radius:4px;cursor:pointer;">Cancel</button>
      <button id="exportGo" style="padding:8px 16px;background:var(--accent);color:white;border:none;border-radius:4px;cursor:pointer;">Export Data</button>
    </div>
  `;

  exportModal.appendChild(exportContent);
  document.body.appendChild(exportModal);

  const close = () => exportModal.remove();
  document.getElementById("exportClose").onclick = close;
  document.getElementById("exportCancel").onclick = close;
  exportModal.addEventListener("click", (e) => { if (e.target === exportModal) close(); });

  document.getElementById("exportGo").onclick = () => {
    const format = document.getElementById("exportFormat").value;
    const selectedFields = Array.from(document.querySelectorAll("#fieldOptions input[type='checkbox']:checked")).map((cb) => cb.value);
    if (!selectedFields.length) {
      showNotification("Please select at least one field to export", "error");
      return;
    }
    try {
      if (format === "csv") exportToCSV(features, selectedFields);
      else if (format === "geojson") exportToGeoJSON(features, selectedFields);
      else exportToJSON(features, selectedFields);

      close();
      showNotification(`Exported ${features.length.toLocaleString()} record(s) as ${format.toUpperCase()}`, "info");
    } catch (err) {
      showNotification(`Export failed: ${err.message}`, "error");
    }
  };
}

// Filter GeoJSON features with full logic (incl. year parsing)
function filterGeoJSONFeatures(all) {
  const out = [];
  for (const feature of all) {
    const p = feature.properties || {};
    // group
    if (state.filters.group !== "ALL" && p.z_group !== state.filters.group) continue;
    // year: only enforce if we can parse a year at all
    const y = parseAnyYear(p);
    if (y && (y < state.filters.yearMin || y > state.filters.yearMax)) continue;
    // area
    const area = Number(p.area_acres || 0);
    if (area < state.filters.areaMin || area > state.filters.areaMax) continue;
    // search
    if (state.filters.search) {
      const t = state.filters.search.toLowerCase();
      const fields = [p.ZONING, p.z_group, p.PD_NAME, p.ZONINGOLD].map((v) => (v || "").toString().toLowerCase());
      if (!fields.some((s) => s.includes(t))) continue;
    }
    out.push(feature);
  }
  return out;
}

function parseAnyYear(p) {
  const candidates = [p.BCC_DATE, p.P_Z_DATE, p.MAINT_DATE].filter(Boolean);
  for (const c of candidates) {
    const d = new Date(c);
    const y = d.getFullYear();
    if (!isNaN(y) && y > 1900) return y;
  }
  return null;
}

// Visible features helper (vector or geojson)
function getVisibleFilteredFeatures() {
  const canvas = state.map.getCanvas();
  const bbox = [[0, 0], [canvas.width, canvas.height]];
  let feats = state.map.queryRenderedFeatures(bbox, { layers: ["zoning-fill"] }) || [];
  feats = dedupeFeatures(feats);
  return feats;
}

function dedupeFeatures(features) {
  const seen = new Set();
  const out = [];
  for (const f of features) {
    const p = f.properties || {};
    const key =
      f.id ??
      p.OBJECTID ??
      p.ogc_fid ??
      p.FID ??
      p.id ??
      // fallback: first coord hash
      JSON.stringify((f.geometry && f.geometry.coordinates && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]) || Math.random());
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

// --- Export helpers
function exportToCSV(features, fields) {
  const header = fields.join(",");
  const rows = features.map((f) => {
    const p = f.properties || {};
    return fields
      .map((field) => {
        const v = p[field];
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") ? `"${s}"` : s;
      })
      .join(",");
  });
  downloadFile([header, ...rows].join("\n"), "orange_county_zoning_export.csv", "text/csv");
}

function exportToGeoJSON(features, fields) {
  const gj = {
    type: "FeatureCollection",
    features: features.map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: Object.fromEntries(fields.map((fld) => [fld, (f.properties || {})[fld]])),
    })),
  };
  downloadFile(JSON.stringify(gj, null, 2), "orange_county_zoning_export.geojson", "application/geo+json");
}

function exportToJSON(features, fields) {
  const arr = features.map((f) => ({
    ...f,
    properties: Object.fromEntries(fields.map((fld) => [fld, (f.properties || {})[fld]])),
  }));
  downloadFile(JSON.stringify(arr, null, 2), "orange_county_zoning_export.json", "application/json");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// --- Analytics (visible features)
function toggleAnalyticsPanel() {
  if (!state.analyticsPanel) createAnalyticsPanel();
  state.analyticsOpen = !state.analyticsOpen;
  state.analyticsPanel.style.display = state.analyticsOpen ? "flex" : "none";
  if (state.analyticsOpen) {
    bindAnalyticsToMap();
    updateAnalyticsFromMapView();
  } else {
    removeAnalyticsBindings();
  }
}

function createAnalyticsPanel() {
  const panel = document.createElement("div");
  panel.className = "analytics-panel";
  panel.innerHTML = `
    <div class="analytics-header">
      <h3 style="margin:0;font-size:18px;font-weight:600;">📈 Analytics Dashboard</h3>
      <div style="display:flex;gap:8px;align-items:center;">
        <small id="analyticsScope" style="opacity:.85;">Scope: Visible features</small>
        <button id="analyticsClose" class="close-btn" aria-label="Close analytics">×</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><span class="label">Visible Features</span><span class="value" id="kpiCount">—</span></div>
      <div class="kpi"><span class="label">Total Acres</span><span class="value" id="kpiAcres">—</span></div>
      <div class="kpi"><span class="label">Top Group</span><span class="value" id="kpiTopGroup">—</span></div>
      <div class="kpi"><span class="label">Filtered Years</span><span class="value" id="kpiYears">—</span></div>
    </div>

    <div class="analytics-grid">
      <div class="chart-container">
        <h4>Area by Zoning Group</h4>
        <canvas id="chartAreaByGroup"></canvas>
      </div>
      <div class="chart-container">
        <h4>Rezonings Over Time</h4>
        <canvas id="chartCountsByYear"></canvas>
      </div>
      <div class="chart-container">
        <h4>Top Zoning Codes</h4>
        <canvas id="chartAreaByCode"></canvas>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById("analyticsClose").onclick = () => {
    panel.style.display = "none";
    state.analyticsOpen = false;
    removeAnalyticsBindings();
  };

  state.analyticsPanel = panel;
}

function bindAnalyticsToMap() {
  if (state.analyticsHandlersBound) return;
  state.map.on("moveend", updateAnalyticsDebounced);
  state.map.on("zoomend", updateAnalyticsDebounced);
  state.analyticsHandlersBound = true;
}

function removeAnalyticsBindings() {
  if (!state.analyticsHandlersBound) return;
  state.map.off("moveend", updateAnalyticsDebounced);
  state.map.off("zoomend", updateAnalyticsDebounced);
  state.analyticsHandlersBound = false;
}

function updateAnalyticsFromMapView() {
  if (!state.analyticsOpen) return;

  // If vector, we already pushed layer filters; if geojson, layer filters also applied (plus year handled in analytics)
  let features = getVisibleFilteredFeatures();

  // In GeoJSON mode, enforce year window on analytics (map filter may not strictly enforce it)
  if (state.zoningMode === "geojson") {
    features = features.filter((f) => {
      const y = parseAnyYear(f.properties || {});
      return !y || (y >= state.filters.yearMin && y <= state.filters.yearMax);
    });
  }

  // --- compute summaries
  const areaByGroup = {};
  const countsByYear = {};
  const areaByCode = {};
  let totalAcres = 0;

  for (const f of features) {
    const p = f.properties || {};
    const grp = p.z_group || "Other";
    const acres = Number(p.area_acres || 0);
    areaByGroup[grp] = (areaByGroup[grp] || 0) + acres;
    totalAcres += acres;

    const y = parseAnyYear(p);
    if (y) countsByYear[y] = (countsByYear[y] || 0) + 1;

    const code = p.ZONING || "Unknown";
    areaByCode[code] = (areaByCode[code] || 0) + acres;
  }

  // KPIs
  document.getElementById("kpiCount").textContent = features.length.toLocaleString();
  document.getElementById("kpiAcres").textContent = totalAcres.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const topGroup = Object.entries(areaByGroup).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  document.getElementById("kpiTopGroup").textContent = topGroup;
  document.getElementById("kpiYears").textContent = `${state.filters.yearMin}–${state.filters.yearMax}`;

  // Charts
  createAnalyticsCharts(areaByGroup, countsByYear, areaByCode);
}

function createAnalyticsCharts(areaByGroup, countsByYear, areaByCode) {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#e9edf5", font: { size: 10 }, usePointStyle: true, padding: 6 } },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#e9edf5",
        bodyColor: "#e9edf5",
        borderColor: "#6aa6ff",
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: "#9aa3b2", font: { size: 9 } }, grid: { color: "rgba(154,163,178,0.1)" } },
      y: { ticks: { color: "#9aa3b2", font: { size: 9 } }, grid: { color: "rgba(154,163,178,0.1)" } },
    },
  };

  // Area by group
  const ctx1 = document.getElementById("chartAreaByGroup");
  if (state.charts.areaByGroup) state.charts.areaByGroup.destroy();
  const groupData = Object.entries(areaByGroup).map(([key, v]) => ({ key, area_acres: v })).sort((a, b) => b.area_acres - a.area_acres);
  state.charts.areaByGroup = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: groupData.map((r) => r.key),
      datasets: [{
        label: "Acres",
        data: groupData.map((r) => r.area_acres),
        backgroundColor: groupData.map((r) => colors[r.key] || colors.Other),
        borderColor: "#2a3152",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: { ...commonOptions, interaction: { intersect: false, mode: "index" } },
  });

  // Counts by year
  const ctx2 = document.getElementById("chartCountsByYear");
  if (state.charts.countsByYear) state.charts.countsByYear.destroy();
  const yearData = Object.entries(countsByYear).map(([y, c]) => ({ y: Number(y), c })).sort((a, b) => a.y - b.y);
  state.charts.countsByYear = new Chart(ctx2, {
    type: "line",
    data: {
      labels: yearData.map((r) => r.y),
      datasets: [{
        label: "Rezonings",
        data: yearData.map((r) => r.c),
        tension: 0.35,
        borderColor: "#6aa6ff",
        backgroundColor: "rgba(106,166,255,0.1)",
        fill: true,
        pointBackgroundColor: "#6aa6ff",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: { ...commonOptions, interaction: { intersect: false, mode: "index" } },
  });

  // Area by code
  const ctx3 = document.getElementById("chartAreaByCode");
  if (state.charts.areaByCode) state.charts.areaByCode.destroy();
  const codeData = Object.entries(areaByCode).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 15);
  state.charts.areaByCode = new Chart(ctx3, {
    type: "doughnut",
    data: {
      labels: codeData.map((r) => r.k),
      datasets: [{
        data: codeData.map((r) => r.v),
        backgroundColor: codeData.map((_, i) => `hsl(${(i * 137.508) % 360}, 70%, 60%)`),
        borderWidth: 2,
        borderColor: "#2a3152",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#e9edf5", font: { size: 9 }, padding: 6 } } },
    },
  });
}

// --- Notifications & helpers
function showNotification(message, type = "info") {
  const n = document.createElement("div");
  n.style.cssText = `
    position:fixed; top:20px; right:20px; background:${type === "error" ? "#dc3545" : "#28a745"};
    color:white; padding:12px 20px; border-radius:6px; font-size:14px; z-index:3000; box-shadow:0 4px 12px rgba(0,0,0,0.3);
  `;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

function closeAboutModal() {
  const modal = document.getElementById("aboutModal");
  if (modal) modal.style.display = "none";
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// --- Start
document.addEventListener("DOMContentLoaded", init);
