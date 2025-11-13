import { baseApi } from "./baseApi";

export const layerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLayers: builder.mutation({
      query: (portalId) => ({
        url: "layers/list/",
        method: "POST",
        body: { portal_id: portalId },
      }),
      transformResponse: (response) => response,
      // Provides a tag for the entire list
      invalidatesTags: ["Layer"],
    }),

    getLayerObjects: builder.mutation({
      query: ({ layerId, portalId }) => ({
        url: "object/layer-object/",
        method: "POST",
        body: {
          layer_id: layerId,
          portal_id: portalId,
        },
      }),
      transformResponse: (response) => response,
      // Provides a tag for specific layer
      invalidatesTags: (result, error, layerId) => [
        { type: "Layer", id: layerId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetLayersMutation, useGetLayerObjectsMutation } = layerApi;
