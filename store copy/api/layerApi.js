import { baseApi } from './baseApi';

export const layerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLayers: builder.query({
      query: (portalId) => ({
        url: `layers/${portalId}`,
        method: 'GET',
      }),
      providesTags: (result, error, portalId) => 
        result
          ? [
              { type: 'Layer', id: 'LIST' },
              ...result.map(({ id }) => ({ type: 'Layer', id })),
            ]
          : [{ type: 'Layer', id: 'LIST' }],
    }),
    
    updateLayer: builder.mutation({
      query: ({ layerId, ...patch }) => ({
        url: `layers/${layerId}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { layerId }) => [
        { type: 'Layer', id: layerId }
      ],
    }),

    getLayerObjects: builder.query({
      query: (layerId) => ({
        url: `layers/${layerId}/objects`,
        method: 'GET',
      }),
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLayersQuery,
  useUpdateLayerMutation,
  useGetLayerObjectsQuery,
} = layerApi;