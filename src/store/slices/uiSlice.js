import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: true,
  activeModal: null,
  theme: "light",
  loading: {},
  loadingMessage: null,
  activeMovableTab: "",

  //GIS DASHBOARD HEADER STATE
  isLegendVisible: false,
  isAttributeTableOpen: false,
  isMeasureOpen: false,
  isPrintModalOpen: false,
  isBufferOpen: false,
  isIdentifyOpen: false,
  isCentroidModalOpen: false,
  isCountPointsModalOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state, action) => {
      if (action.payload) state.sidebarOpen = action.payload.state;
      else state.sidebarOpen = !state.sidebarOpen;
    },
    setModal: (state, action) => {
      state.activeModal = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },

    toggleLegend: (state, action) => {
      if (action.payload) state.isLegendVisible = action.payload.state;
      else state.isLegendVisible = !state.isLegendVisible;
    },
    toggleAttributeTable: (state, action) => {
      if (action.payload) state.isAttributeTableOpen = action.payload.state;
      else state.isAttributeTableOpen = !state.isAttributeTableOpen;
    },
    // toggle measure drawer/panel
    toggleMeasure: (state, action) => {
      if (action.payload) state.isMeasureOpen = action.payload.state;
      else state.isMeasureOpen = !state.isMeasureOpen;
    },
    // toggle print modal
    togglePrintModal: (state, action) => {
      if (action.payload) state.isPrintModalOpen = action.payload.state;
      else state.isPrintModalOpen = !state.isPrintModalOpen;
    },
    toggleBuffer: (state, action) => {
      if (action.payload) state.isBufferOpen = action.payload.state;
      else state.isBufferOpen = !state.isBufferOpen;
    },
    setLoadingMessage: (state, action) => {
      state.loadingMessage = action.payload;
    },
    toggleIdentify: (state, action) => {
      if (action.payload) state.isIdentifyOpen = action.payload.state;
      else state.isIdentifyOpen = !state.isIdentifyOpen;
    },
    toggleCentroidModal: (state, action) => {
      if (action.payload) state.isCentroidModalOpen = action.payload.state;
      else state.isCentroidModalOpen = !state.isCentroidModalOpen;
    },
    toggleCountPointsModal: (state, action) => {
      if (action.payload) state.isCountPointsModalOpen = action.payload.state;
      else state.isCountPointsModalOpen = !state.isCountPointsModalOpen;
    },
    setActiveMovableTab: (state, action) => {
      if (action.payload) state.activeMovableTab = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setModal,
  setTheme,
  setLoading,
  toggleLegend,
  toggleAttributeTable,
  toggleMeasure,
  togglePrintModal,
  toggleBuffer,
  setLoadingMessage,
  toggleIdentify,
  toggleCentroidModal,
  toggleCountPointsModal,
  setActiveMovableTab
} = uiSlice.actions;
export default uiSlice.reducer;
