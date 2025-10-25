import { baseApi } from './baseApi';

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortals: builder.query({
      query: () => 'portal/list/',
      providesTags: ['Portal'],
    }),
    getPortalById: builder.query({
      query: (id) => `portal/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Portal', id }],
    }),
  }),
});

export const { 
  useGetPortalsQuery,
  useGetPortalByIdQuery 
} = portalApi;