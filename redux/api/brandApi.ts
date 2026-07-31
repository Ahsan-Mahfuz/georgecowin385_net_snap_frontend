import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiBrand } from "./types";

export const brandApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrands: builder.query<ApiBrand[], Record<string, string> | void>({
      query: (params) => ({ url: "/brand", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiBrand[]>) => res.data,
      providesTags: ["Brand"],
    }),
    createBrand: builder.mutation<ApiBrand, Partial<ApiBrand> & { name: string }>({
      query: (body) => ({ url: "/brand", method: "POST", body }),
      invalidatesTags: ["Brand"],
    }),
    updateBrand: builder.mutation<ApiBrand, { id: string; body: Partial<ApiBrand> }>({
      query: ({ id, body }) => ({ url: `/brand/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Brand"],
    }),
    deleteBrand: builder.mutation<null, string>({
      query: (id) => ({ url: `/brand/${id}`, method: "DELETE" }),
      invalidatesTags: ["Brand"],
    }),
  }),
});

export const {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandApi;
