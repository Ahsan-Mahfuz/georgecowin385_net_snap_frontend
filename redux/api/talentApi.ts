import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiTalent } from "./types";

export const talentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTalents: builder.query<ApiTalent[], Record<string, string> | void>({
      query: (params) => ({ url: "/talent", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiTalent[]>) => res.data,
      providesTags: ["Talent"],
    }),
    createTalent: builder.mutation<ApiTalent, { name: string; email?: string; manager: string }>({
      query: (body) => ({ url: "/talent", method: "POST", body }),
      invalidatesTags: ["Talent"],
    }),
    updateTalent: builder.mutation<ApiTalent, { id: string; body: { name?: string; email?: string; manager?: string } }>({
      query: ({ id, body }) => ({ url: `/talent/${id}`, method: "PATCH", body }),
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
  useDeleteTalentMutation,
} = talentApi;
