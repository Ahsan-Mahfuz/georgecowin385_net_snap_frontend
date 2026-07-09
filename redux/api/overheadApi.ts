import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiOverhead } from "./types";

export const overheadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOverheads: builder.query<ApiOverhead[], void>({
      query: () => "/overhead",
      transformResponse: (res: ApiEnvelope<ApiOverhead[]>) => res.data,
      providesTags: ["Overhead"],
    }),
    createOverhead: builder.mutation<ApiOverhead, { label: string; values?: number[] }>({
      query: (body) => ({ url: "/overhead", method: "POST", body }),
      invalidatesTags: ["Overhead"],
    }),
    updateOverhead: builder.mutation<ApiOverhead, { id: string; body: Partial<ApiOverhead> }>({
      query: ({ id, body }) => ({ url: `/overhead/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Overhead"],
    }),
    deleteOverhead: builder.mutation<null, string>({
      query: (id) => ({ url: `/overhead/${id}`, method: "DELETE" }),
      invalidatesTags: ["Overhead"],
    }),
  }),
});

export const {
  useGetOverheadsQuery,
  useCreateOverheadMutation,
  useUpdateOverheadMutation,
  useDeleteOverheadMutation,
} = overheadApi;
