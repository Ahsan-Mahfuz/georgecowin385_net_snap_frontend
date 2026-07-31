import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiEmailLead } from "./types";

export const emailLeadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmailLeads: builder.query<ApiEmailLead[], Record<string, string> | void>({
      query: (params) => ({ url: "/email-lead", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiEmailLead[]>) => res.data,
      providesTags: ["EmailLead"],
    }),
    createEmailLead: builder.mutation<ApiEmailLead, Partial<ApiEmailLead> & { manager: string; category: string }>({
      query: (body) => ({ url: "/email-lead", method: "POST", body }),
      invalidatesTags: ["EmailLead"],
    }),
    // Empty delegatedTo hands the request back to its owner.
    delegateEmailLead: builder.mutation<ApiEmailLead, { id: string; delegatedTo: string }>({
      query: ({ id, delegatedTo }) => ({
        url: `/email-lead/${id}/delegate`,
        method: "PATCH",
        body: { delegatedTo },
      }),
      invalidatesTags: ["EmailLead"],
    }),
    deleteEmailLead: builder.mutation<null, string>({
      query: (id) => ({ url: `/email-lead/${id}`, method: "DELETE" }),
      invalidatesTags: ["EmailLead"],
    }),
  }),
});

export const {
  useGetEmailLeadsQuery,
  useCreateEmailLeadMutation,
  useDelegateEmailLeadMutation,
  useDeleteEmailLeadMutation,
} = emailLeadApi;
