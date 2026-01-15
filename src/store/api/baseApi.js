import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const token = sessionStorage.getItem("token");
    // Do NOT send token to auth endpoints
    const authFreeEndpoints = ["login"];

    if (
      token &&
      !authFreeEndpoints.includes(endpoint)
    ) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    headers.set("Content-Type", "application/json");
    return headers;
  },
  credentials: "omit",
});

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Portal", "Layer", "User", "Auth"],
  endpoints: () => ({}),
});
