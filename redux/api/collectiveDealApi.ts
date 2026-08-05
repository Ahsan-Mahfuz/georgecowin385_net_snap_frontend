import { baseApi } from "./baseApi";
import {
  ApiEnvelope,
  ApiCollectiveDeal,
  ApiCollectiveCommission,
  ApiReminderSummary,
} from "./types";

export const collectiveDealApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCollectiveDeals: builder.query<ApiCollectiveDeal[], Record<string, string> | void>({
      query: (params) => ({ url: "/collective-deal", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiCollectiveDeal[]>) => res.data,
      providesTags: ["CollectiveDeal"],
    }),
    createCollectiveDeal: builder.mutation<ApiCollectiveDeal, Partial<ApiCollectiveDeal>>({
      query: (body) => ({ url: "/collective-deal", method: "POST", body }),
      invalidatesTags: ["CollectiveDeal"],
    }),
    updateCollectiveDeal: builder.mutation<
      ApiCollectiveDeal,
      { id: string; body: Partial<ApiCollectiveDeal> }
    >({
      query: ({ id, body }) => ({ url: `/collective-deal/${id}`, method: "PATCH", body }),
      invalidatesTags: ["CollectiveDeal"],
    }),
    deleteCollectiveDeal: builder.mutation<null, string>({
      query: (id) => ({ url: `/collective-deal/${id}`, method: "DELETE" }),
      invalidatesTags: ["CollectiveDeal"],
    }),
    createCollectiveInvoice: builder.mutation<ApiCollectiveDeal, string>({
      query: (id) => ({ url: `/collective-deal/${id}/xero-invoice`, method: "POST" }),
      // Unwrap so callers can read xeroStatus straight off the result.
      transformResponse: (res: ApiEnvelope<ApiCollectiveDeal>) => res.data,
      invalidatesTags: ["CollectiveDeal"],
    }),
    // Move one scheduled month of a deal through its own invoice lifecycle.
    updateCollectiveInstallment: builder.mutation<
      ApiCollectiveDeal,
      { id: string; monthIndex: number; stage: string }
    >({
      query: ({ id, monthIndex, stage }) => ({
        url: `/collective-deal/${id}/installment/${monthIndex}`,
        method: "PATCH",
        body: { stage },
      }),
      transformResponse: (res: ApiEnvelope<ApiCollectiveDeal>) => res.data,
      invalidatesTags: ["CollectiveDeal"],
    }),
    createCollectiveInstallmentInvoice: builder.mutation<
      ApiCollectiveDeal,
      { id: string; monthIndex: number }
    >({
      query: ({ id, monthIndex }) => ({
        url: `/collective-deal/${id}/installment/${monthIndex}/xero-invoice`,
        method: "POST",
      }),
      transformResponse: (res: ApiEnvelope<ApiCollectiveDeal>) => res.data,
      invalidatesTags: ["CollectiveDeal"],
    }),
    markCollectiveInvoiced: builder.mutation<ApiCollectiveDeal, string>({
      query: (id) => ({ url: `/collective-deal/${id}/mark-invoiced`, method: "POST" }),
      invalidatesTags: ["CollectiveDeal"],
    }),
    markCollectivePaid: builder.mutation<ApiCollectiveDeal, string>({
      query: (id) => ({ url: `/collective-deal/${id}/mark-paid`, method: "POST" }),
      invalidatesTags: ["CollectiveDeal"],
    }),
    // Commission per salesperson, at the rates admin holds in Settings.
    getCollectiveCommission: builder.query<ApiCollectiveCommission, void>({
      query: () => "/collective-deal/commission",
      transformResponse: (res: ApiEnvelope<ApiCollectiveCommission>) => res.data,
      providesTags: ["CollectiveDeal", "Settings"],
    }),
    // Mail every owner the payments that are due to move to "To Be Invoiced".
    // Sends nightly on its own; this is the "send it now" button.
    sendCollectiveReminders: builder.mutation<ApiReminderSummary, { force?: boolean } | void>({
      query: (body) => ({
        url: "/collective-deal/send-reminders",
        method: "POST",
        body: body || {},
      }),
      transformResponse: (res: ApiEnvelope<ApiReminderSummary>) => res.data,
      invalidatesTags: ["CollectiveDeal"],
    }),
  }),
});

export const {
  useGetCollectiveDealsQuery,
  useCreateCollectiveDealMutation,
  useUpdateCollectiveDealMutation,
  useDeleteCollectiveDealMutation,
  useCreateCollectiveInvoiceMutation,
  useUpdateCollectiveInstallmentMutation,
  useCreateCollectiveInstallmentInvoiceMutation,
  useMarkCollectiveInvoicedMutation,
  useMarkCollectivePaidMutation,
  useGetCollectiveCommissionQuery,
  useSendCollectiveRemindersMutation,
} = collectiveDealApi;
