import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiCollectiveDeal } from "./types";

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
  }),
});

export const {
  useGetCollectiveDealsQuery,
  useCreateCollectiveDealMutation,
  useUpdateCollectiveDealMutation,
  useDeleteCollectiveDealMutation,
  useCreateCollectiveInvoiceMutation,
  useMarkCollectiveInvoicedMutation,
  useMarkCollectivePaidMutation,
} = collectiveDealApi;
