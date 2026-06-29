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
        url: "object/layer-object-filtered/",
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

    // Get Proj4 string from epsg.io
    getProj4String: builder.query({
      query: (epsgCode) => ({
        url: `https://epsg.io/${epsgCode}.proj4`,
        method: "GET",
        responseHandler: (response) => response.text(),
      }),
      transformResponse: (response) => response?.trim() || null,
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),

    // Get WKT/PRJ string from epsg.io
    getWktString: builder.query({
      query: (epsgCode) => ({
        url: `https://epsg.io/${epsgCode}.wkt`,
        method: "GET",
        responseHandler: (response) => response.text(),
      }),
      transformResponse: (response) => response?.trim() || null,
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLayersMutation,
  useGetLayerObjectsMutation,
  useGetProj4StringQuery,
  useGetWktStringQuery,                 
  useLazyGetProj4StringQuery,
  useLazyGetWktStringQuery,
} = layerApi;
