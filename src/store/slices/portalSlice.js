import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedPortal: null,
  activeTab: 'all',
  filters: {
    searchQuery: '',
    sortBy: 'name',
    filterBy: 'all'
  }
};

const portalSlice = createSlice({
  name: 'portal',
  initialState,
  reducers: {
    setSelectedPortal: (state, action) => {
      state.selectedPortal = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    }
  }
});

export const {
  setSelectedPortal,
  setActiveTab,
  updateFilters,
  resetFilters
} = portalSlice.actions;

export default portalSlice.reducer;