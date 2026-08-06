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
    // Deciding a request rewrites the deal behind it — approve moves it to
    // Confirmed, reject drops it back to Pipeline (see approval.service.ts). The
    // Deal tag has to go with it or the P&L, Leaderboard, Commission sheet and
    // the sidebar counters all keep showing the figures from before the
    // decision until someone reloads the page.
    approveApproval: builder.mutation<ApiApproval, string>({
      query: (id) => ({ url: `/approval/${id}/approve`, method: "PATCH" }),
      invalidatesTags: ["Approval", "Deal"],
    }),
    rejectApproval: builder.mutation<ApiApproval, { id: string; rejectionReason?: string }>({
      query: ({ id, rejectionReason }) => ({
        url: `/approval/${id}/reject`,
        method: "PATCH",
        body: { rejectionReason },
      }),
      invalidatesTags: ["Approval", "Deal"],
    }),
  }),
});

export const {
  useGetApprovalsQuery,
  useCreateApprovalMutation,
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} = approvalApi;
