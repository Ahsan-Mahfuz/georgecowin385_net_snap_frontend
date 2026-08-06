import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiSettings } from "./types";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<ApiSettings, void>({
      query: () => "/settings",
      transformResponse: (res: ApiEnvelope<ApiSettings>) => res.data,
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation<ApiSettings, Partial<ApiSettings>>({
      query: (body) => ({ url: "/settings", method: "PATCH", body }),
      // Changing an approval route re-points the requests already waiting, so
      // the Approvals tab has to be refetched alongside the settings.
      invalidatesTags: ["Settings", "Approval"],
    }),
    getXeroStatus: builder.query<{ connected: boolean }, void>({
      query: () => "/xero/status",
      transformResponse: (res: ApiEnvelope<{ connected: boolean }>) => res.data,
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation, useGetXeroStatusQuery } = settingsApi;
