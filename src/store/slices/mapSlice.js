import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  geoJsonLayers: {},
  selectedFeatures: [], // Add selected features state
  viewport: {
    center: [35.6892, 51.3890],
    zoom: 11
  },
  activeBasemap: 'streets',
  sidebarCollapsed: false,
  selectedFeature: null
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setGeoJsonLayer: (state, action) => {
      const { layerId, geoJsonData, isActive } = action.payload;
      if (isActive) {
        state.geoJsonLayers[layerId] = geoJsonData;
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
    }
  }
});

export const {
  setGeoJsonLayer,
  setSelectedFeatures,
  clearSelectedFeatures,
  updateViewport,
  setActiveBasemap,
  toggleSidebar,
  setSelectedFeature
} = mapSlice.actions;

export default mapSlice.reducer;