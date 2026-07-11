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
      { id: string; body: { status?: string; note?: string } }
    >({
      query: ({ id, body }) => ({ url: `/production-request/${id}`, method: "PATCH", body }),
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
  useDeleteProductionRequestMutation,
} = productionRequestApi;
