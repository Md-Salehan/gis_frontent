import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: 'auth/login/',  // Make sure this matches your DRF URL pattern
        method: 'POST',
        body: credentials,
        headers: {
          'Accept': 'application/json',
        },
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;