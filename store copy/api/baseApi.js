import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';

// Create a custom base query with retry logic
const baseQueryWithRetry = retry(
  fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
    timeout: 10000, // 10 seconds timeout
  }),
  { maxRetries: 2 }
);

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Portal', 'Layer', 'User', 'Auth'],
  endpoints: () => ({}),
});

// Error handler helper
export const handleApiError = (error) => {
  if (error.status === 401) {
    // Handle unauthorized
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return {
    error: error.data?.message || 'An error occurred',
    status: error.status,
  };
};