import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  geoJsonLayers: {},
  selectedFeatures: [], 
  viewport: {
    center: [35.6892, 51.389],
    zoom: 11,
  },
  activeBasemap: "streets",
  sidebarCollapsed: false,
  selectedFeature: null,

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
      const { layerId, geoJsonData, metaData, isActive } = action.payload;
      if (isActive) {
        state.geoJsonLayers[layerId] = { geoJsonData, metaData };
      } else {
        delete state.geoJsonLayers[layerId];
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
      state.selectedFeature = action.payload;
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
} = mapSlice.actions;

export default mapSlice.reducer;
