import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: 'auth/login/',  // Make sure this matches your DRF URL pattern
        method: 'POST',
        body: body,
        headers: {
          'Accept': 'application/json',
        },
      }),
    }),
    logout: builder.mutation({
      query: (body) => ({
        url: 'auth/logout/',
        method: 'POST',
        body: body,
        headers: {
          'Accept': 'application/json',
        },
      }),
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation } = authApi;