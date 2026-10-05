import { meta } from "@eslint/js";
import { createSlice } from "@reduxjs/toolkit";
import { testData } from "./testData";

const initialState = {
  geoJsonLayers: {}, // layerId: { geoJsonData, metaData, orderNo }
  tempGeoJsonLayers: {
    test_schools: testData.schools,
    test_districts: testData.districts,
    test_houses: testData.houses,
    test_hospitals: testData.hospitals,
    test_roads: testData.roads,
    test_rivers: testData.rivers,
    test_land_parcels: testData.land_parcels,
    test_police_stations: testData.police_stations,
    test_city_wards: testData.city_wards,
    test_pipelines: testData.pipelines,
    test_conservation_areas: testData.conservation_areas,
    // target_cities: testData?.target_cities,
    // join_city_stats: testData?.join_city_stats,
    // target_no_match: testData?.target_no_match,
    // join_no_match: testData?.join_no_match,
  }, // layerId: { geoJsonData, metaData, orderNo, isActive }
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
  spatialQuerySelection: {
    source: { layerId: null, featureIndices: [] },
    target: { layerId: null, featureIndices: [] },
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

    setSpatialQuerySelection: (state, action) => {
      // payload:
      //   { side: "source"|"target", layerId?, featureIndices? }
      //   OR { reset: true }
      if (action.payload?.reset) {
        state.spatialQuerySelection = {
          source: { layerId: null, featureIndices: [] },
          target: { layerId: null, featureIndices: [] },
        };
        return;
      }
      const { side, layerId, featureIndices } = action.payload || {};
      if (side !== "source" && side !== "target") return;

      const prev = state.spatialQuerySelection[side];

      if (layerId !== undefined && layerId !== prev.layerId) {
        state.spatialQuerySelection[side] = {
          layerId: layerId ?? null,
          featureIndices: Array.isArray(featureIndices)
            ? [...featureIndices]
            : [],
        };
        return;
      }

      if (Array.isArray(featureIndices)) {
        state.spatialQuerySelection[side] = {
          layerId: prev.layerId,
          featureIndices: [...featureIndices],
        };
      }
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
  setSpatialQuerySelection,
} = mapSlice.actions;

export default mapSlice.reducer;
