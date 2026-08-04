import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiPaymentRun } from "./types";

/**
 * The dates talent are paid on. Finance maintains them under Payment Runs; the
 * talent bill's reference and due date, and every "next payment run" label in
 * the portal, come from this list.
 */
export const paymentRunApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentRuns: builder.query<ApiPaymentRun[], void>({
      query: () => "/payment-run",
      transformResponse: (res: ApiEnvelope<ApiPaymentRun[]>) => res.data,
      providesTags: ["PaymentRun"],
    }),
    createPaymentRun: builder.mutation<ApiPaymentRun, { date: string; label?: string; note?: string }>({
      query: (body) => ({ url: "/payment-run", method: "POST", body }),
      invalidatesTags: ["PaymentRun", "Deal"],
    }),
    updatePaymentRun: builder.mutation<
      ApiPaymentRun,
      { id: string; body: { date?: string; label?: string; note?: string } }
    >({
      query: ({ id, body }) => ({ url: `/payment-run/${id}`, method: "PATCH", body }),
      invalidatesTags: ["PaymentRun", "Deal"],
    }),
    deletePaymentRun: builder.mutation<null, string>({
      query: (id) => ({ url: `/payment-run/${id}`, method: "DELETE" }),
      invalidatesTags: ["PaymentRun", "Deal"],
    }),
  }),
});

export const {
  useGetPaymentRunsQuery,
  useCreatePaymentRunMutation,
  useUpdatePaymentRunMutation,
  useDeletePaymentRunMutation,
} = paymentRunApi;
