import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  appLogNo: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user = payload.user;
      state.token = payload.token;
      state.appLogNo = payload.appLogNo;
      state.isAuthenticated = true;
      state.error = null;
      // localStorage.setItem('token', payload.token);
    },
    resetAuth: (state) => {
      return initialState;
    },
    setError: (state, { payload }) => {
      state.error = payload;
      state.loading = false;
    }
  }
});

export const { setCredentials, resetAuth, setError } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;