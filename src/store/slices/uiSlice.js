import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: true,
  activeModal: null,
  theme: "light",
  loading: {},

  isLegendVisible: false,
  isAttributeTableOpen: false,
  // measure panel visibility
  isMeasureOpen: false,
  isPrintModalOpen: false,
  loadingMessage: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
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

    toggleLegend: (state) => {
      state.isLegendVisible = !state.isLegendVisible;
    },
    toggleAttributeTable: (state) => {
      state.isAttributeTableOpen = !state.isAttributeTableOpen;
    },
    // toggle measure drawer/panel
    toggleMeasure: (state) => {
      state.isMeasureOpen = !state.isMeasureOpen;
    },
    // toggle print modal
    togglePrintModal: (state) => {
      state.isPrintModalOpen = !state.isPrintModalOpen;
    },
    setLoadingMessage: (state, action) => {
      state.loadingMessage = action.payload;
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
  setLoadingMessage,
} = uiSlice.actions;
export default uiSlice.reducer;
