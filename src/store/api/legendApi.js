// ...existing code...
import { baseApi } from './baseApi';

export const legendApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLegend: builder.mutation({
      query: (payload) => ({
        url: 'legend/',
        method: 'POST',
        body: payload,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetLegendMutation } = legendApi;
// ...existing code...