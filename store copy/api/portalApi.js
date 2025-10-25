import { baseApi } from './baseApi';

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortals: builder.query({
      query: () => 'portals',
      providesTags: ['Portal'],
    }),
    getPortalById: builder.query({
      query: (id) => `portals/${id}`,
      providesTags: (result, error, id) => [{ type: 'Portal', id }],
    }),
  }),
});

export const { useGetPortalsQuery, useGetPortalByIdQuery } = portalApi;