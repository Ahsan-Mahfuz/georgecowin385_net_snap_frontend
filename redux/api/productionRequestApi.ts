import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiProductionRequest } from "./types";

export const productionRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductionRequests: builder.query<ApiProductionRequest[], void>({
      query: () => "/production-request",
      transformResponse: (res: ApiEnvelope<ApiProductionRequest[]>) => res.data,
      providesTags: ["ProductionRequest"],
    }),
    createProductionRequest: builder.mutation<
      ApiProductionRequest,
      Partial<ApiProductionRequest>
    >({
      query: (body) => ({ url: "/production-request", method: "POST", body }),
      invalidatesTags: ["ProductionRequest"],
    }),
    updateProductionRequest: builder.mutation<
      ApiProductionRequest,
      { id: string; body: { status?: string; note?: string; rejectionReason?: string } }
    >({
      query: ({ id, body }) => ({ url: `/production-request/${id}`, method: "PATCH", body }),
      invalidatesTags: ["ProductionRequest"],
    }),
    // Clears a rejection notice off the screen; the request keeps its status.
    dismissProductionRejection: builder.mutation<ApiProductionRequest, string>({
      query: (id) => ({ url: `/production-request/${id}/dismiss-rejection`, method: "POST" }),
      invalidatesTags: ["ProductionRequest"],
    }),
    // Clears the whole backlog in one call. The screen used to fire one request
    // per notice, which left the page half-cleared if any of them failed.
    dismissAllProductionRejections: builder.mutation<{ dismissed: number }, void>({
      query: () => ({ url: "/production-request/dismiss-rejections", method: "POST" }),
      transformResponse: (res: ApiEnvelope<{ dismissed: number }>) => res.data,
      invalidatesTags: ["ProductionRequest"],
    }),
    requestProductionChargeback: builder.mutation<ApiProductionRequest, string>({
      query: (id) => ({ url: `/production-request/${id}/request-chargeback`, method: "POST" }),
      invalidatesTags: ["ProductionRequest"],
    }),
    deleteProductionRequest: builder.mutation<null, string>({
      query: (id) => ({ url: `/production-request/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProductionRequest"],
    }),
  }),
});

export const {
  useGetProductionRequestsQuery,
  useCreateProductionRequestMutation,
  useUpdateProductionRequestMutation,
  useDismissProductionRejectionMutation,
  useDismissAllProductionRejectionsMutation,
  useRequestProductionChargebackMutation,
  useDeleteProductionRequestMutation,
} = productionRequestApi;
