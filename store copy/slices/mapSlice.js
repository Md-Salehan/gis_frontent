import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchGeoJsonData = createAsyncThunk(
  'map/fetchGeoJson',
  async (layerId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/layers/${layerId}/geojson`);
      if (!response.ok) throw new Error('Failed to fetch GeoJSON');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  activeLayers: {},
  geoJsonData: {},
  viewport: {
    latitude: 35.6892,
    longitude: 51.3890,
    zoom: 11,
  },
  filters: {
    dateRange: null,
    measureBy: 'visits',
    areaSubdivision: 'postal',
    excludePostal: [],
    ageRange: [18, 45],
    gender: 'all',
  },
  loading: {},
  errors: {},
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setActiveLayer: (state, action) => {
      const { layerId, isActive } = action.payload;
      if (isActive) {
        state.activeLayers[layerId] = true;
      } else {
        delete state.activeLayers[layerId];
        delete state.geoJsonData[layerId];
      }
    },
    updateViewport: (state, action) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeoJsonData.pending, (state, action) => {
        state.loading[action.meta.arg] = true;
      })
      .addCase(fetchGeoJsonData.fulfilled, (state, action) => {
        state.geoJsonData[action.meta.arg] = action.payload;
        state.loading[action.meta.arg] = false;
        delete state.errors[action.meta.arg];
      })
      .addCase(fetchGeoJsonData.rejected, (state, action) => {
        state.loading[action.meta.arg] = false;
        state.errors[action.meta.arg] = action.payload;
      });
  },
});

export const {
  setActiveLayer,
  updateViewport,
  updateFilters,
  resetFilters,
} = mapSlice.actions;

export default mapSlice.reducer;