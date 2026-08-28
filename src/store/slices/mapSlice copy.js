import { meta } from "@eslint/js";
import { createSlice } from "@reduxjs/toolkit";
import { testData } from "./testData";

const initialState = {
  geoJsonLayers: {
    "test_schools": { geoJsonData: testData.schools, metaData: { name: "Schools", description: "Test schools data" }, orderNo: 0 },
    "test_districts": { geoJsonData: testData.districts, metaData: { name: "Districts", description: "Test districts data" }, orderNo: 1 },
    "test_houses": { geoJsonData: testData.houses, metaData: { name: "Houses", description: "Test houses data" }, orderNo: 2 },
    "test_hospitals": { geoJsonData: testData.hospitals, metaData: { name: "Hospitals", description: "Test hospitals data" }, orderNo: 3 },
    "test_roads": { geoJsonData: testData.roads, metaData: { name: "Roads", description: "Test roads data" }, orderNo: 4 },
    "test_rivers": { geoJsonData: testData.rivers, metaData: { name: "Rivers", description: "Test rivers data" }, orderNo: 5 },
    "test_land_parcels": { geoJsonData: testData.land_parcels, metaData: { name: "Land Parcels", description: "Test land parcels data" }, orderNo: 6 },
    "test_police_stations": { geoJsonData: testData.police_stations, metaData: { name: "Police Stations", description: "Test police stations data" }, orderNo: 7 },
    "test_city_wards": { geoJsonData: testData.city_wards, metaData: { name: "City Wards", description: "Test city wards data" }, orderNo: 8 },
    "test_pipelines": { geoJsonData: testData.pipelines, metaData: { name: "Pipelines", description: "Test pipelines data" }, orderNo: 9 },
    "test_conservation_areas": { geoJsonData: testData.conservation_areas, metaData: { name: "Conservation Areas", description: "Test conservation areas data" }, orderNo: 10 },
  }, // layerId: { geoJsonData, metaData, orderNo }
  tempGeoJsonLayers: {}, // layerId: { geoJsonData, metaData, orderNo, isActive }
  multiSelectedFeatures: [], // Now stores: { layerId, featureIndex, feature, metaData }
  viewport: {
    center: [28.7041, 77.1025],
    zoom: 8,
  },
  activeBasemap: "openstreetmap",
  sidebarCollapsed: false,
  selectedFeature: {
    metaData: null,
    feature: null,
  },
  // portalId: null,
  layerOrder: [], // array of layerIds to maintain order
  tempLayerOrder: [], // array of temp layerIds to maintain order
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
    setTempGeoJsonLayer: (state, action) => {
      const { layerId, geoJsonData, metaData, isActive } = action.payload;
      state.tempLayerOrder.push(layerId);
      state.tempGeoJsonLayers[layerId] = {
        geoJsonData,
        metaData,
        orderNo: state.tempLayerOrder.length - 1,
        isActive,
      };
    },
    toggleTempGeoJsonLayer: (state, action) => {
      const { layerId, isActive } = action.payload;
      if (isActive) {
        state.tempGeoJsonLayers[layerId] = {
          ...state.tempGeoJsonLayers[layerId],
          isActive: isActive,
        };
      } else {
        state.tempGeoJsonLayers[layerId] = {
          ...state.tempGeoJsonLayers[layerId],
          isActive: !state.tempGeoJsonLayers[layerId].isActive,
        };
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
    toggleMultiSelectedFeatures: (state, action) => {
      const { layerId, featureIndex, feature, metaData } = action.payload;

      // Check if this feature is already selected
      const existingIndex = state.multiSelectedFeatures.findIndex(
        (f) => f.layerId === layerId && f.featureIndex === featureIndex,
      );

      if (existingIndex !== -1) {
        // Remove if already selected (toggle)
        state.multiSelectedFeatures.splice(existingIndex, 1);
      } else {
        // Add with featureIndex
        state.multiSelectedFeatures.push({
          layerId,
          featureIndex,
          feature,
          metaData,
        });
      }
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
    // setPortalId: (state, action) => {
    //   state.portalId = action.payload;
    // },
    resetBuffer: (state) => {
      state.bufferLayers = {};
      state.bufferOrder = [];
    },
    resetMapState: (state) => {
      return initialState;
    },
  },
});

export const {
  setGeoJsonLayer,
  setTempGeoJsonLayer,
  toggleTempGeoJsonLayer,
  setBufferLayer,
  setMultiSelectedFeatures,
  toggleMultiSelectedFeatures,
  clearSelectedFeature,
  updateViewport,
  setActiveBasemap,
  toggleSidebar,
  setSelectedFeature,
  setMeasureType,
  setMeasureUnit,
  setMeasure,
  resetMapState,
  resetMapState2,
  // setPortalId,
  // setMultiSelectedRows,
  // toggleRowSelection,
  // clearMultiSelectedRows,
  resetBuffer,
} = mapSlice.actions;

export default mapSlice.reducer;
