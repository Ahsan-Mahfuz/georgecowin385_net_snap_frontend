import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiTalent } from "./types";

export const talentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTalents: builder.query<ApiTalent[], Record<string, string> | void>({
      query: (params) => ({ url: "/talent", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiTalent[]>) => res.data,
      providesTags: ["Talent"],
    }),
    // Bank details are part of creating a talent, not an afterthought — they are
    // what the Xero supplier contact is built from.
    createTalent: builder.mutation<
      ApiTalent,
      { name: string; email?: string; manager: string } & Partial<
        Pick<
          ApiTalent,
          | "invoiceName"
          | "invoiceEmail"
          | "invoiceAddress"
          | "bankName"
          | "accountName"
          | "sortCode"
          | "accountNumber"
          | "vatNumber"
        >
      >
    >({
      query: (body) => ({ url: "/talent", method: "POST", body }),
      invalidatesTags: ["Talent"],
    }),
    updateTalent: builder.mutation<
      ApiTalent,
      {
        id: string;
        body: Partial<ApiTalent>;
      }
    >({
      query: ({ id, body }) => ({ url: `/talent/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Talent"],
    }),
    // Email a talent their statement for one month.
    sendTalentReport: builder.mutation<
      { to: string; deals: number; payable: number; month: string },
      { id: string; monthIndex: number; year?: number }
    >({
      query: ({ id, ...body }) => ({ url: `/talent/${id}/send-report`, method: "POST", body }),
      transformResponse: (res: {
        data: { to: string; deals: number; payable: number; month: string };
      }) => res.data,
      invalidatesTags: ["Talent"],
    }),
    deleteTalent: builder.mutation<null, string>({
      query: (id) => ({ url: `/talent/${id}`, method: "DELETE" }),
      invalidatesTags: ["Talent"],
    }),
  }),
});

export const {
  useGetTalentsQuery,
  useCreateTalentMutation,
  useUpdateTalentMutation,
  useSendTalentReportMutation,
  useDeleteTalentMutation,
} = talentApi;
