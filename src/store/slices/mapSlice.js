import { meta } from "@eslint/js";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  geoJsonLayers: {},
  selectedFeatures: [],
  viewport: {
    center: [28.7041, 77.1025],
    zoom: 8,
  },
  activeBasemap: "streets",
  sidebarCollapsed: false,
  selectedFeature: {
    metaData: null,
    feature: null,
  },
  portalId: null,
  layerOrder: [],
  measure: {
    type: "line", // "line" | "area"
    unit: "km", // default unit
  },
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setGeoJsonLayer: (state, action) => {
      const { layerId, geoJsonData, metaData, isActive, orderNo } = action.payload;
      if (isActive) {
        state.geoJsonLayers[layerId] = { geoJsonData, metaData, orderNo };
        // Update layer order if not already present
        if (!state.layerOrder.includes(layerId)) {
          state.layerOrder.push(layerId);
        }
      } else {
        delete state.geoJsonLayers[layerId];
        state.layerOrder = state.layerOrder.filter(id => id !== layerId);
      }
    },
    setSelectedFeatures: (state, action) => {
      state.selectedFeatures = action.payload;
    },
    clearSelectedFeatures: (state) => {
      state.selectedFeatures = [];
    },
    updateViewport: (state, action) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },
    setActiveBasemap: (state, action) => {
      state.activeBasemap = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSelectedFeature: (state, action) => {
      state.selectedFeature = { ...state.selectedFeature, ...action.payload };
    },
    // measurement reducers
    setMeasureType: (state, action) => {
      state.measure.type = action.payload;
    },
    setMeasureUnit: (state, action) => {
      state.measure.unit = action.payload;
    },
    setMeasure: (state, action) => {
      state.measure = { ...state.measure, ...action.payload };
    },
    // Add new reducer for portal ID
    setPortalId: (state, action) => {
      state.portalId = action.payload;
    },
  },
});

export const {
  setGeoJsonLayer,
  setSelectedFeatures,
  clearSelectedFeatures,
  updateViewport,
  setActiveBasemap,
  toggleSidebar,
  setSelectedFeature,
  setMeasureType,
  setMeasureUnit,
  setMeasure,
  setPortalId,
} = mapSlice.actions;

export default mapSlice.reducer;
