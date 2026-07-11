import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiApproval } from "./types";

export const approvalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApprovals: builder.query<ApiApproval[], Record<string, string> | void>({
      query: (params) => ({ url: "/approval", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiApproval[]>) => res.data,
      providesTags: ["Approval"],
    }),
    createApproval: builder.mutation<ApiApproval, Partial<ApiApproval> & { kind: string; title: string }>({
      query: (body) => ({ url: "/approval", method: "POST", body }),
      invalidatesTags: ["Approval"],
    }),
    approveApproval: builder.mutation<ApiApproval, string>({
      query: (id) => ({ url: `/approval/${id}/approve`, method: "PATCH" }),
      invalidatesTags: ["Approval"],
    }),
    rejectApproval: builder.mutation<ApiApproval, { id: string; rejectionReason?: string }>({
      query: ({ id, rejectionReason }) => ({
        url: `/approval/${id}/reject`,
        method: "PATCH",
        body: { rejectionReason },
      }),
      invalidatesTags: ["Approval"],
    }),
  }),
});

export const {
  useGetApprovalsQuery,
  useCreateApprovalMutation,
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} = approvalApi;
