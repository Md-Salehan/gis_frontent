import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  portalId: null,
  portalList: [],
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
    setPortalId: (state, action) => {
      state.portalId = action.payload;
    },
    setPortalList: (state, action) => {
      state.portalList = action.payload;
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
  setPortalId,
  setPortalList,
  setActiveTab,
  updateFilters,
  resetFilters
} = portalSlice.actions;

export default portalSlice.reducer;