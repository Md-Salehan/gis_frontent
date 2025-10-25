import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import portalReducer from './slices/portalSlice';
import mapReducer from './slices/mapSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    portal: portalReducer,
    map: mapReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    }).concat(baseApi.middleware),
  devTools: import.meta.env.MODE !== 'production'
});
