import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiDeal } from "./types";

export const dealApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDeals: builder.query<ApiDeal[], Record<string, string> | void>({
      query: (params) => ({ url: "/deal", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiDeal[]>) => res.data,
      providesTags: ["Deal"],
    }),
    createDeal: builder.mutation<ApiDeal, Partial<ApiDeal>>({
      query: (body) => ({ url: "/deal", method: "POST", body }),
      invalidatesTags: ["Deal"],
    }),
    updateDeal: builder.mutation<ApiDeal, { id: string; body: Partial<ApiDeal> }>({
      query: ({ id, body }) => ({ url: `/deal/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Deal"],
    }),
    deleteDeal: builder.mutation<null, string>({
      query: (id) => ({ url: `/deal/${id}`, method: "DELETE" }),
      invalidatesTags: ["Deal"],
    }),
    createDealInvoice: builder.mutation<ApiDeal, string>({
      query: (id) => ({ url: `/deal/${id}/xero-invoice`, method: "POST" }),
      invalidatesTags: ["Deal"],
    }),
    markDealInvoiced: builder.mutation<ApiDeal, string>({
      query: (id) => ({ url: `/deal/${id}/mark-invoiced`, method: "POST" }),
      invalidatesTags: ["Deal"],
    }),
    markDealPaid: builder.mutation<ApiDeal, string>({
      query: (id) => ({ url: `/deal/${id}/mark-paid`, method: "POST" }),
      invalidatesTags: ["Deal"],
    }),
    sendDealRemittance: builder.mutation<ApiDeal, string>({
      query: (id) => ({ url: `/deal/${id}/send-remittance`, method: "POST" }),
      invalidatesTags: ["Deal"],
    }),
    markDealTalentPaid: builder.mutation<ApiDeal, string>({
      query: (id) => ({ url: `/deal/${id}/mark-talent-paid`, method: "POST" }),
      invalidatesTags: ["Deal"],
    }),
  }),
});

export const {
  useGetDealsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useCreateDealInvoiceMutation,
  useMarkDealInvoicedMutation,
  useMarkDealPaidMutation,
  useSendDealRemittanceMutation,
  useMarkDealTalentPaidMutation,
} = dealApi;
