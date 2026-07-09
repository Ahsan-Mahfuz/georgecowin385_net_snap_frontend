import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiTalent } from "./types";

export const talentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTalents: builder.query<ApiTalent[], Record<string, string> | void>({
      query: (params) => ({ url: "/talent", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiTalent[]>) => res.data,
      providesTags: ["Talent"],
    }),
    createTalent: builder.mutation<ApiTalent, { name: string; manager: string }>({
      query: (body) => ({ url: "/talent", method: "POST", body }),
      invalidatesTags: ["Talent"],
    }),
    deleteTalent: builder.mutation<null, string>({
      query: (id) => ({ url: `/talent/${id}`, method: "DELETE" }),
      invalidatesTags: ["Talent"],
    }),
  }),
});

export const { useGetTalentsQuery, useCreateTalentMutation, useDeleteTalentMutation } = talentApi;
