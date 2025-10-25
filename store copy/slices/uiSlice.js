import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  activeModal: null,
  theme: 'light',
  loading: {},
};

export const uiSlice = createSlice({
  name: 'ui',
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
  },
});

export const { toggleSidebar, setModal, setTheme, setLoading } = uiSlice.actions;
export default uiSlice.reducer;