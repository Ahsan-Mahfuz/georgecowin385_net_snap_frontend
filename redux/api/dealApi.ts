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
  }),
});

export const {
  useGetDealsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
} = dealApi;
