import { createSlice } from '@reduxjs/toolkit';
import { set } from 'lodash';

const initialState = {
  portalId: null,
  portalNm: null,
  portalList: [],
  activeTab: 'all',
  filters: {
    searchQuery: '',
    sortBy: 'name',
    filterBy: 'all'
  },
  activePortalDetails: null
};

const portalSlice = createSlice({
  name: 'portal',
  initialState,
  reducers: {
    setPortalId: (state, action) => {
      state.portalId = action.payload;
    },
    setPortalIdByName: (state, action) => {
      const portal = state.portalList.find(p => p.portal_url === action.payload);
      state.portalId = portal ? portal.portal_id : null;
      // state.portalNm = action.payload;
    },
    setPortalNm : (state, action) => {
      state.portalNm = action.payload;
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
    },
    setActivePortalDetails: (state, action) => {
      state.activePortalDetails = action.payload;
    },
    resetActivePortalDetails: (state) => {
      state.activePortalDetails = null;
      state.portalId = null;
    }
  }
});

export const {
  setPortalId,
  setPortalIdByName,
  setPortalNm,
  setPortalList,
  setActiveTab,
  updateFilters,
  resetFilters,
  setActivePortalDetails,
  resetActivePortalDetails
} = portalSlice.actions;

export default portalSlice.reducer;