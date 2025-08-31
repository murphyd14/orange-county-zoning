// app_maplibre.js
// MapLibre GL JS application with PMTiles support for GitHub Pages deployment

const state = {
  map: null,
  zoningData: null,
  fluData: null,
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
  chartData: null,
  analyticsPanel: null,
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

// Initialize the application
async function init() {
  console.log("🚀 Initializing MapLibre GL application...");

  // Enable PMTiles protocol
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  // Initialize map
  initMap();

  // Load data
  await loadData();

  // Wire controls
  wireControls();

  // Add legend
  addLegend();

  console.log("✅ Application initialized");
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

  // Add attribution control
  state.map.addControl(new maplibregl.AttributionControl(), "bottom-right");

  // Add navigation control
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");
}

async function loadData() {
  console.log("📦 Loading data...");

  try {
    // Try to load PMTiles first (for production)
    const pmtilesAvailable = await checkPMTilesAvailability();

    if (pmtilesAvailable) {
      console.log("✅ Using PMTiles for optimal performance");
      await loadPMTilesData();
    } else {
      console.log("📄 Using optimized GeoJSON (fallback)");
      await loadOptimizedGeoJSON();
    }

    // Fit map to data bounds
    fitMapToData();
  } catch (error) {
    console.error("❌ Error loading data:", error);
    showNotification("Failed to load data. Please refresh the page.", "error");
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
  // Add zoning source
  state.map.addSource("zoning", {
    type: "vector",
    url: "pmtiles://./data/zoning.pmtiles",
  });

  // Add zoning fill layer
  state.map.addLayer({
    id: "zoning-fill",
    type: "fill",
    source: "zoning",
    "source-layer": "zoning",
    paint: {
      "fill-color": [
        "match",
        ["get", "z_group"],
        "Residential",
        colors.Residential,
        "Commercial",
        colors.Commercial,
        "Industrial",
        colors.Industrial,
        "Planned Development",
        colors["Planned Development"],
        "Agricultural",
        colors.Agricultural,
        "Mixed Use",
        colors["Mixed Use"],
        "Incorporated",
        colors.Incorporated,
        colors.Other,
      ],
      "fill-opacity": 0.8,
    },
  });

  // Add zoning border layer
  state.map.addLayer({
    id: "zoning-border",
    type: "line",
    source: "zoning",
    "source-layer": "zoning",
    paint: {
      "line-color": "#000000",
      "line-width": 1,
      "line-opacity": 0.5,
    },
  });

  // Add FLU source
  state.map.addSource("flu", {
    type: "vector",
    url: "pmtiles://./data/flu.pmtiles",
  });

  // Add FLU layer (initially hidden)
  state.map.addLayer({
    id: "flu-fill",
    type: "fill",
    source: "flu",
    "source-layer": "flu",
    paint: {
      "fill-color": "#00e0c7",
      "fill-opacity": 0.15,
    },
    layout: {
      visibility: "none",
    },
  });

  // Add click handlers
  state.map.on("click", "zoning-fill", (e) => {
    selectFeature(e.features[0]);
  });

  state.map.on("mouseenter", "zoning-fill", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });

  state.map.on("mouseleave", "zoning-fill", () => {
    state.map.getCanvas().style.cursor = "";
  });
}

async function loadOptimizedGeoJSON() {
  try {
    // Load optimized GeoJSON files
    const [zoningResponse, fluResponse] = await Promise.all([
      fetch("data/zoning_optimized.geojson"),
      fetch("data/flu_optimized.geojson"),
    ]);

    if (!zoningResponse.ok || !fluResponse.ok) {
      throw new Error("Failed to load optimized data files");
    }

    state.zoningData = await zoningResponse.json();
    state.fluData = await fluResponse.json();

    // Add zoning source
    state.map.addSource("zoning", {
      type: "geojson",
      data: state.zoningData,
    });

    // Add zoning fill layer
    state.map.addLayer({
      id: "zoning-fill",
      type: "fill",
      source: "zoning",
      paint: {
        "fill-color": [
          "match",
          ["get", "z_group"],
          "Residential",
          colors.Residential,
          "Commercial",
          colors.Commercial,
          "Industrial",
          colors.Industrial,
          "Planned Development",
          colors["Planned Development"],
          "Agricultural",
          colors.Agricultural,
          "Mixed Use",
          colors["Mixed Use"],
          "Incorporated",
          colors.Incorporated,
          colors.Other,
        ],
        "fill-opacity": 0.8,
      },
    });

    // Add zoning border layer
    state.map.addLayer({
      id: "zoning-border",
      type: "line",
      source: "zoning",
      paint: {
        "line-color": "#000000",
        "line-width": 1,
        "line-opacity": 0.5,
      },
    });

    // Add FLU source
    state.map.addSource("flu", {
      type: "geojson",
      data: state.fluData,
    });

    // Add FLU layer (initially hidden)
    state.map.addLayer({
      id: "flu-fill",
      type: "fill",
      source: "flu",
      paint: {
        "fill-color": "#00e0c7",
        "fill-opacity": 0.15,
      },
      layout: {
        visibility: "none",
      },
    });

    // Add click handlers
    state.map.on("click", "zoning-fill", (e) => {
      selectFeature(e.features[0]);
    });

    state.map.on("mouseenter", "zoning-fill", () => {
      state.map.getCanvas().style.cursor = "pointer";
    });

    state.map.on("mouseleave", "zoning-fill", () => {
      state.map.getCanvas().style.cursor = "";
    });
  } catch (error) {
    console.error("Error loading optimized GeoJSON:", error);
    throw error;
  }
}

function fitMapToData() {
  if (state.zoningData && state.zoningData.features.length > 0) {
    // Calculate bounds from GeoJSON
    const bounds = new maplibregl.LngLatBounds();
    state.zoningData.features.forEach((feature) => {
      if (feature.geometry && feature.geometry.coordinates) {
        // Handle different geometry types
        if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates[0].forEach((coord) => {
            bounds.extend(coord);
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygon) => {
            polygon[0].forEach((coord) => {
              bounds.extend(coord);
            });
          });
        }
      }
    });

    if (!bounds.isEmpty()) {
      state.map.fitBounds(bounds, { padding: 50 });
    }
  }
}

function wireControls() {
  // Group filter
  const groupFilter = document.getElementById("groupFilter");
  groupFilter.addEventListener("change", () => {
    state.filters.group = groupFilter.value;
    applyFilters();
  });

  // Year range filters
  const yearMin = document.getElementById("yearMin");
  const yearMax = document.getElementById("yearMax");
  const yearMinValue = document.getElementById("yearMinValue");
  const yearMaxValue = document.getElementById("yearMaxValue");

  yearMin.addEventListener("input", () => {
    state.filters.yearMin = Number(yearMin.value);
    yearMinValue.textContent = yearMin.value;
    applyFilters();
  });

  yearMax.addEventListener("input", () => {
    state.filters.yearMax = Number(yearMax.value);
    yearMaxValue.textContent = yearMax.value;
    applyFilters();
  });

  // Area range filters
  const areaMin = document.getElementById("areaMin");
  const areaMax = document.getElementById("areaMax");
  const areaMinValue = document.getElementById("areaMinValue");
  const areaMaxValue = document.getElementById("areaMaxValue");

  areaMin.addEventListener("input", () => {
    state.filters.areaMin = Number(areaMin.value);
    areaMinValue.textContent = areaMin.value;
    applyFilters();
  });

  areaMax.addEventListener("input", () => {
    state.filters.areaMax = Number(areaMax.value);
    areaMaxValue.textContent = areaMax.value;
    applyFilters();
  });

  // Search input
  const searchInput = document.getElementById("searchInput");
  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      applyFilters();
    }, 300);
  });

  // Layer toggles
  const toggleZoning = document.getElementById("toggleZoning");
  const toggleFLU = document.getElementById("toggleFLU");

  toggleZoning.addEventListener("change", () => {
    state.filters.showZoning = toggleZoning.checked;
    const visibility = state.filters.showZoning ? "visible" : "none";
    state.map.setLayoutProperty("zoning-fill", "visibility", visibility);
    state.map.setLayoutProperty("zoning-border", "visibility", visibility);
  });

  toggleFLU.addEventListener("change", () => {
    state.filters.showFLU = toggleFLU.checked;
    const visibility = state.filters.showFLU ? "visible" : "none";
    state.map.setLayoutProperty("flu-fill", "visibility", visibility);
  });

  // Action buttons
  const exportBtn = document.getElementById("exportBtn");
  const analyticsBtn = document.getElementById("analyticsBtn");
  const aboutBtn = document.getElementById("aboutBtn");

  exportBtn.addEventListener("click", exportFilteredData);
  analyticsBtn.addEventListener("click", toggleAnalyticsPanel);
  aboutBtn.addEventListener("click", () => {
    document.getElementById("aboutModal").style.display = "flex";
  });
}

function applyFilters() {
  if (!state.zoningData) return;

  const filteredFeatures = state.zoningData.features.filter((feature) => {
    const props = feature.properties;

    // Group filter
    if (
      state.filters.group !== "ALL" &&
      props.z_group !== state.filters.group
    ) {
      return false;
    }

    // Year filter
    const year = props.BCC_DATE
      ? new Date(props.BCC_DATE).getFullYear()
      : props.P_Z_DATE
      ? new Date(props.P_Z_DATE).getFullYear()
      : props.MAINT_DATE
      ? new Date(props.MAINT_DATE).getFullYear()
      : null;

    if (
      year &&
      (year < state.filters.yearMin || year > state.filters.yearMax)
    ) {
      return false;
    }

    // Area filter
    const area = props.area_acres || 0;
    if (area < state.filters.areaMin || area > state.filters.areaMax) {
      return false;
    }

    // Search filter
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      const searchableFields = [
        props.ZONING,
        props.z_group,
        props.PD_NAME,
        props.ZONINGOLD,
      ].map((field) => (field || "").toLowerCase());

      if (!searchableFields.some((field) => field.includes(searchTerm))) {
        return false;
      }
    }

    return true;
  });

  // Update the source data
  const source = state.map.getSource("zoning");
  if (source) {
    source.setData({
      type: "FeatureCollection",
      features: filteredFeatures,
    });
  }

  // Update analytics if panel is open
  if (state.analyticsPanel && state.analyticsPanel.style.display !== "none") {
    updateAnalyticsFromFeatures(filteredFeatures);
  }
}

function selectFeature(feature) {
  const props = feature.properties;

  // Close any existing zoning info panel
  const existingPanel = document.querySelector('[data-panel="zoning-info"]');
  if (existingPanel) {
    existingPanel.remove();
  }

  const infoPanel = document.createElement("div");
  infoPanel.setAttribute("data-panel", "zoning-info"); // Add identifier
  infoPanel.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(22, 26, 46, 0.95);
    color: #e9edf5;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #2a3152;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    backdrop-filter: blur(4px);
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: linear-gradient(135deg, #6aa6ff, #7ad0c9);
    color: white;
    border-radius: 8px 8px 0 0;
    margin: -20px -20px 20px -20px;
  `;

  const title = document.createElement("h3");
  title.textContent = "📍 Zoning Information";
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  `;
  closeBtn.onclick = () => {
    infoPanel.remove();
  };

  header.appendChild(title);
  header.appendChild(closeBtn);
  infoPanel.appendChild(header);

  const content = document.createElement("div");
  content.innerHTML = `
    <div style="margin-bottom: 12px;">
      <span style="color: #6aa6ff; font-weight: bold;">Zoning Code:</span>
      <span style="color: #e9edf5; font-weight: bold;"> ${
        props.ZONING || "—"
      }</span>
    </div>
    <div style="margin-bottom: 12px;">
      <span style="color: #7ad0c9; font-weight: bold;">Category:</span>
      <span style="color: #e9edf5; font-weight: bold;"> ${
        props.z_group || "—"
      }</span>
    </div>
    ${
      props.PD_NAME
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #ffb057; font-weight: bold;">PD Name:</span>
      <span style="color: #e9edf5;"> ${props.PD_NAME}</span>
    </div>`
        : ""
    }
    ${
      props.ZONINGOLD
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #c07bff; font-weight: bold;">Previous Zoning:</span>
      <span style="color: #e9edf5;"> ${props.ZONINGOLD}</span>
    </div>`
        : ""
    }
    ${
      props.area_acres
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #ffd86e; font-weight: bold;">Area:</span>
      <span style="color: #e9edf5;"> ${Number(props.area_acres).toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )} acres</span>
    </div>`
        : ""
    }
    ${
      props.BCC_DATE
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #87d4a5; font-weight: bold;">BCC Date:</span>
      <span style="color: #e9edf5;"> ${formatDate(props.BCC_DATE)}</span>
    </div>`
        : ""
    }
    ${
      props.P_Z_DATE
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #778899; font-weight: bold;">Proposed Date:</span>
      <span style="color: #e9edf5;"> ${formatDate(props.P_Z_DATE)}</span>
    </div>`
        : ""
    }
    ${
      props.MAINT_DATE
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #b3b6c2; font-weight: bold;">Maintenance Date:</span>
      <span style="color: #e9edf5;"> ${formatDate(props.MAINT_DATE)}</span>
    </div>`
        : ""
    }
    ${
      props.centroid_lat && props.centroid_lon
        ? `<div style="margin-bottom: 12px;">
      <span style="color: #6aa6ff; font-weight: bold;">Centroid:</span>
      <span style="color: #e9edf5;"> ${props.centroid_lat.toFixed(
        4
      )}, ${props.centroid_lon.toFixed(4)}</span>
    </div>`
        : ""
    }
  `;

  infoPanel.appendChild(content);
  document.getElementById("map").appendChild(infoPanel);
}

function formatDate(ms) {
  if (typeof ms !== "number") return "—";
  const d = new Date(ms);
  if (isNaN(d)) return "—";
  return d.toISOString().slice(0, 10);
}

function addLegend() {
  const legend = document.createElement("div");
  legend.style.cssText = `
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(22, 26, 46, 0.9);
    color: #e9edf5;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #2a3152;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 1000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  `;

  legend.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold; color: #6aa6ff;">Zoning Categories</div>
    ${Object.entries(colors)
      .map(
        ([category, color]) => `
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px; margin-right: 8px;"></div>
        <span>${category}</span>
      </div>
    `
      )
      .join("")}
  `;

  document.getElementById("map").appendChild(legend);
}

// Export functionality (reuse from app_optimized.js)
function exportFilteredData() {
  if (!state.zoningData) {
    showNotification("No data available to export", "error");
    return;
  }

  const filteredData = getCurrentFilteredData();

  if (filteredData.length === 0) {
    showNotification("No data matches current filters", "error");
    return;
  }

  // Create export options modal
  const exportModal = document.createElement("div");
  exportModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;

  const exportContent = document.createElement("div");
  exportContent.style.cssText = `
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    color: var(--text);
    font-family: Arial, sans-serif;
  `;

  exportContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; color: var(--accent);">📊 Export Data</h3>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer;">×</button>
    </div>
    
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 12px 0; color: var(--muted);">Export ${filteredData.length.toLocaleString()} filtered properties</p>
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; color: var(--text);">Export Format:</label>
      <select id="exportFormat" style="width: 100%; padding: 8px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px;">
        <option value="csv">CSV (Excel compatible)</option>
        <option value="geojson">GeoJSON (GIS software)</option>
        <option value="json">JSON (Raw data)</option>
      </select>
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; color: var(--text);">Include Fields:</label>
      <div id="fieldOptions" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 8px;">
        <!-- Field checkboxes will be populated here -->
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; background: var(--border); color: var(--text); border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button onclick="executeExport()" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Export Data</button>
    </div>
  `;

  exportModal.appendChild(exportContent);
  document.body.appendChild(exportModal);

  // Populate field options
  populateFieldOptions(filteredData[0]);

  // Close modal when clicking outside
  exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) {
      exportModal.remove();
    }
  });
}

function getCurrentFilteredData() {
  if (!state.zoningData) return [];

  return state.zoningData.features.filter((feature) => {
    const props = feature.properties;

    // Group filter
    if (
      state.filters.group !== "ALL" &&
      props.z_group !== state.filters.group
    ) {
      return false;
    }

    // Year filter
    const year = props.BCC_DATE
      ? new Date(props.BCC_DATE).getFullYear()
      : props.P_Z_DATE
      ? new Date(props.P_Z_DATE).getFullYear()
      : props.MAINT_DATE
      ? new Date(props.MAINT_DATE).getFullYear()
      : null;

    if (
      year &&
      (year < state.filters.yearMin || year > state.filters.yearMax)
    ) {
      return false;
    }

    // Area filter
    const area = props.area_acres || 0;
    if (area < state.filters.areaMin || area > state.filters.areaMax) {
      return false;
    }

    // Search filter
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      const searchableFields = [
        props.ZONING,
        props.z_group,
        props.PD_NAME,
        props.ZONINGOLD,
      ].map((field) => (field || "").toLowerCase());

      if (!searchableFields.some((field) => field.includes(searchTerm))) {
        return false;
      }
    }

    return true;
  });
}

function populateFieldOptions(sampleFeature) {
  const fieldOptions = document.getElementById("fieldOptions");
  if (!fieldOptions) return;

  const fields = Object.keys(sampleFeature.properties);
  const defaultFields = [
    "ZONING",
    "z_group",
    "area_acres",
    "PD_NAME",
    "BCC_DATE",
    "centroid_lat",
    "centroid_lon",
  ];

  fieldOptions.innerHTML = fields
    .map(
      (field) => `
    <label style="display: flex; align-items: center; margin-bottom: 6px; font-size: 12px;">
      <input type="checkbox" value="${field}" ${
        defaultFields.includes(field) ? "checked" : ""
      } style="margin-right: 8px;">
      ${field}
    </label>
  `
    )
    .join("");
}

function executeExport() {
  const format = document.getElementById("exportFormat").value;
  const fieldCheckboxes = document.querySelectorAll(
    "#fieldOptions input[type='checkbox']:checked"
  );
  const selectedFields = Array.from(fieldCheckboxes).map((cb) => cb.value);

  if (selectedFields.length === 0) {
    showNotification("Please select at least one field to export", "error");
    return;
  }

  const filteredData = getCurrentFilteredData();

  try {
    switch (format) {
      case "csv":
        exportToCSV(filteredData, selectedFields);
        break;
      case "geojson":
        exportToGeoJSON(filteredData, selectedFields);
        break;
      case "json":
        exportToJSON(filteredData, selectedFields);
        break;
    }

    // Close modal
    const modal = document.querySelector("div[style*='z-index: 2000']");
    if (modal) modal.remove();

    showNotification(
      `Successfully exported ${filteredData.length.toLocaleString()} properties as ${format.toUpperCase()}`,
      "info"
    );
  } catch (error) {
    showNotification(`Export failed: ${error.message}`, "error");
  }
}

function exportToCSV(data, fields) {
  const header = fields.join(",");

  const rows = data.map((feature) => {
    const props = feature.properties;
    return fields
      .map((field) => {
        const value = props[field];
        if (value == null) return "";
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(",") ? `"${escaped}"` : escaped;
      })
      .join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  downloadFile(csvContent, "orange_county_zoning_export.csv", "text/csv");
}

function exportToGeoJSON(data, fields) {
  const filteredFeatures = data.map((feature) => ({
    type: "Feature",
    geometry: feature.geometry,
    properties: Object.fromEntries(
      fields.map((field) => [field, feature.properties[field]])
    ),
  }));

  const geojson = {
    type: "FeatureCollection",
    features: filteredFeatures,
  };

  downloadFile(
    JSON.stringify(geojson, null, 2),
    "orange_county_zoning_export.geojson",
    "application/geo+json"
  );
}

function exportToJSON(data, fields) {
  const filteredData = data.map((feature) => ({
    ...feature,
    properties: Object.fromEntries(
      fields.map((field) => [field, feature.properties[field]])
    ),
  }));

  downloadFile(
    JSON.stringify(filteredData, null, 2),
    "orange_county_zoning_export.json",
    "application/json"
  );
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Analytics functionality (simplified version)
function toggleAnalyticsPanel() {
  if (state.analyticsPanel && state.analyticsPanel.style.display !== "none") {
    state.analyticsPanel.style.display = "none";
  } else {
    createAnalyticsPanel();
  }
}

function createAnalyticsPanel() {
  if (state.analyticsPanel) {
    state.analyticsPanel.remove();
  }

  state.analyticsPanel = document.createElement("div");
  state.analyticsPanel.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 10px;
    background: rgba(22, 26, 46, 0.95);
    color: #e9edf5;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #2a3152;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    width: 75%;
    max-width: 1000px;
    height: 30vh;
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #6aa6ff, #7ad0c9);
    color: white;
    border-radius: 8px 8px 0 0;
    margin: -20px -20px 12px -20px;
  `;

  const title = document.createElement("h3");
  title.textContent = "📈 Analytics Dashboard";
  title.style.cssText = `
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  `;
  closeBtn.onclick = () => {
    state.analyticsPanel.style.display = "none";
  };

  header.appendChild(title);
  header.appendChild(closeBtn);
  state.analyticsPanel.appendChild(header);

  const content = document.createElement("div");
  content.style.cssText = `
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    overflow: hidden;
  `;

  const chartContainers = [
    { id: "chartAreaByGroup", title: "Area by Zoning Group" },
    { id: "chartCountsByYear", title: "Rezonings Over Time" },
    { id: "chartAreaByCode", title: "Top Zoning Codes" },
  ];

  chartContainers.forEach((chartInfo) => {
    const container = document.createElement("div");
    container.style.cssText = `
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid #2a3152;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      min-height: 0;
    `;

    const chartTitle = document.createElement("h4");
    chartTitle.textContent = chartInfo.title;
    chartTitle.style.cssText = `
      margin: 0 0 6px 0;
      font-size: 12px;
      font-weight: 600;
      color: #6aa6ff;
      text-align: center;
    `;

    const canvas = document.createElement("canvas");
    canvas.id = chartInfo.id;
    canvas.style.cssText = `
      flex: 1;
      max-height: 120px;
    `;

    container.appendChild(chartTitle);
    container.appendChild(canvas);
    content.appendChild(container);
  });

  state.analyticsPanel.appendChild(content);
  document.body.appendChild(state.analyticsPanel);

  // Create charts with current filtered data
  const filteredData = getCurrentFilteredData();
  updateAnalyticsFromFeatures(filteredData);
}

function updateAnalyticsFromFeatures(features) {
  if (!state.analyticsPanel || features.length === 0) return;

  // Calculate analytics data
  const areaByGroup = {};
  const countsByYear = {};
  const areaByCode = {};

  features.forEach((feature) => {
    const props = feature.properties;

    // Area by group
    const group = props.z_group || "Other";
    areaByGroup[group] = (areaByGroup[group] || 0) + (props.area_acres || 0);

    // Counts by year
    const year = props.BCC_DATE
      ? new Date(props.BCC_DATE).getFullYear()
      : props.P_Z_DATE
      ? new Date(props.P_Z_DATE).getFullYear()
      : props.MAINT_DATE
      ? new Date(props.MAINT_DATE).getFullYear()
      : null;

    if (year && year > 1900) {
      countsByYear[year] = (countsByYear[year] || 0) + 1;
    }

    // Area by code
    const code = props.ZONING || "Unknown";
    areaByCode[code] = (areaByCode[code] || 0) + (props.area_acres || 0);
  });

  // Create charts
  createAnalyticsCharts(areaByGroup, countsByYear, areaByCode);
}

function createAnalyticsCharts(areaByGroup, countsByYear, areaByCode) {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e9edf5",
          font: { size: 8 },
          usePointStyle: true,
          padding: 4,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#e9edf5",
        bodyColor: "#e9edf5",
        borderColor: "#6aa6ff",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#9aa3b2", font: { size: 8 } },
        grid: { color: "rgba(154, 163, 178, 0.1)" },
      },
      y: {
        ticks: { color: "#9aa3b2", font: { size: 8 } },
        grid: { color: "rgba(154, 163, 178, 0.1)" },
      },
    },
  };

  // Area by group chart
  const ctx1 = document.getElementById("chartAreaByGroup");
  if (ctx1) {
    if (state.charts.areaByGroup) {
      state.charts.areaByGroup.destroy();
    }

    const groupData = Object.entries(areaByGroup)
      .map(([key, value]) => ({ key, area_acres: value }))
      .sort((a, b) => b.area_acres - a.area_acres);

    state.charts.areaByGroup = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: groupData.map((r) => r.key),
        datasets: [
          {
            label: "Acres",
            data: groupData.map((r) => r.area_acres),
            backgroundColor: groupData.map(
              (r) => colors[r.key] || colors.Other
            ),
            borderColor: "#2a3152",
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: { display: false },
        },
        interaction: { intersect: false, mode: "index" },
      },
    });
  }

  // Counts by year chart
  const ctx2 = document.getElementById("chartCountsByYear");
  if (ctx2) {
    if (state.charts.countsByYear) {
      state.charts.countsByYear.destroy();
    }

    const yearData = Object.entries(countsByYear)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year);

    state.charts.countsByYear = new Chart(ctx2, {
      type: "line",
      data: {
        labels: yearData.map((r) => r.year),
        datasets: [
          {
            label: "Rezonings",
            data: yearData.map((r) => r.count),
            tension: 0.4,
            borderColor: "#6aa6ff",
            backgroundColor: "rgba(106, 166, 255, 0.1)",
            fill: true,
            pointBackgroundColor: "#6aa6ff",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: { display: false },
        },
        interaction: { intersect: false, mode: "index" },
      },
    });
  }

  // Area by code chart
  const ctx3 = document.getElementById("chartAreaByCode");
  if (ctx3) {
    if (state.charts.areaByCode) {
      state.charts.areaByCode.destroy();
    }

    const codeData = Object.entries(areaByCode)
      .map(([key, value]) => ({ key, area_acres: value }))
      .sort((a, b) => b.area_acres - a.area_acres)
      .slice(0, 15);

    state.charts.areaByCode = new Chart(ctx3, {
      type: "doughnut",
      data: {
        labels: codeData.map((r) => r.key),
        datasets: [
          {
            data: codeData.map((r) => r.area_acres),
            backgroundColor: codeData.map((r, i) => {
              const hue = (i * 137.508) % 360;
              return `hsl(${hue}, 70%, 60%)`;
            }),
            borderWidth: 2,
            borderColor: "#2a3152",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#e9edf5",
              font: { size: 7 },
              padding: 3,
            },
          },
          title: { display: false },
        },
      },
    });
  }
}

// Utility functions
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "error" ? "#dc3545" : "#28a745"};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 3000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function closeAboutModal() {
  document.getElementById("aboutModal").style.display = "none";
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
