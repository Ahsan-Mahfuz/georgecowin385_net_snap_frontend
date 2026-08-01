import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiDeal, ApiXeroContact, ApiXeroSync } from "./types";

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
    // Contacts already in Xero, so the CRM can pick one instead of creating a
    // duplicate every time a brand name is typed.
    getXeroContacts: builder.query<ApiXeroContact[], "creators" | "collective" | void>({
      query: (org) => ({ url: "/deal/xero-contacts", params: { org: org || "creators" } }),
      transformResponse: (res: ApiEnvelope<ApiXeroContact[]>) => res.data,
    }),
    // Ask Xero what has been sent or paid and move the CRM to match.
    syncXero: builder.mutation<ApiXeroSync, void>({
      query: () => ({ url: "/deal/sync-xero", method: "POST" }),
      transformResponse: (res: ApiEnvelope<ApiXeroSync>) => res.data,
      invalidatesTags: ["Deal"],
    }),
    // Push a talent invoice to Xero as a draft bill (money we owe the talent).
    createTalentBill: builder.mutation<
      { invoiceNumber: string; status: string },
      { dealIds: string[]; talentName: string; amount: number }
    >({
      query: (body) => ({ url: "/deal/talent-bill", method: "POST", body }),
      transformResponse: (res: ApiEnvelope<{ invoiceNumber: string; status: string }>) => res.data,
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
  useGetXeroContactsQuery,
  useSyncXeroMutation,
  useCreateTalentBillMutation,
} = dealApi;
