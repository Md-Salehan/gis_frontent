import { meta } from "@eslint/js";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  geoJsonLayers: {}, // layerId: { geoJsonData, metaData, orderNo }
  multiSelectedFeatures: [],
  // multiSelectedRows: {}, // tracks row keys per layer for UI sync at AttributeTable.jsx 
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
  layerOrder: [], // array of layerIds to maintain order
  bufferLayers: {},
  bufferOrder: [],
  measure: {
    type: "line", // "line" | "area"
    unit: "km", // default unit
  },
};

const restoreInitialState = { ...initialState };

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setGeoJsonLayer: (state, action) => {
      const { layerId, geoJsonData, metaData, isActive, orderNo } =
        action.payload;
      if (isActive) {
        state.geoJsonLayers[layerId] = { geoJsonData, metaData, orderNo };
        // Update layer order if not already present
        if (!state.layerOrder.includes(layerId)) {
          state.layerOrder.push(layerId);
        }
      } else {
        delete state.geoJsonLayers[layerId];
        state.layerOrder = state.layerOrder.filter((id) => id !== layerId);
      }
    },
    setBufferLayer: (state, action) => {
      const { layerId, geoJsonData, metaData, isActive } = action.payload;
      if (isActive) {
        state.bufferLayers[layerId] = { geoJsonData, metaData };
        if (!state.bufferOrder.includes(layerId)) {
          state.bufferOrder.push(layerId);
        }
      } else {
        delete state.bufferLayers[layerId];
        state.bufferOrder = state.bufferOrder.filter((id) => id !== layerId);
      }
    },
    setMultiSelectedFeatures: (state, action) => {
      state.multiSelectedFeatures = action.payload || [];
    },
    clearSelectedFeature: (state) => {
      state.selectedFeature = restoreInitialState?.selectedFeature;
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
    // NEW reducers
    // setMultiSelectedRows: (state, action) => {
    //   state.multiSelectedRows = action.payload || {};
    // },
    // toggleRowSelection: (state, action) => {
    //   const { layerId, rowKey, checked } = action.payload;
    //   if (!state.multiSelectedRows[layerId]) {
    //     state.multiSelectedRows[layerId] = new Set();
    //   }
    //   const layerSet = state.multiSelectedRows[layerId];
    //   if (checked) {
    //     layerSet.add(rowKey);
    //   } else {
    //     layerSet.delete(rowKey);
    //   }
    // },
    // clearMultiSelectedRows: (state) => {
    //   state.multiSelectedRows = {};
    // },
  },
});

export const {
  setGeoJsonLayer,
  setBufferLayer,
  setMultiSelectedFeatures,
  clearSelectedFeature,
  updateViewport,
  setActiveBasemap,
  toggleSidebar,
  setSelectedFeature,
  setMeasureType,
  setMeasureUnit,
  setMeasure,
  setPortalId,
  setMultiSelectedRows,
  toggleRowSelection,
  clearMultiSelectedRows,
} = mapSlice.actions;

export default mapSlice.reducer;
