import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiExpense } from "./types";

export const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<ApiExpense[], Record<string, string> | void>({
      query: (params) => ({ url: "/expense", params: params || {} }),
      transformResponse: (res: ApiEnvelope<ApiExpense[]>) => res.data,
      providesTags: ["Expense"],
    }),
    createExpense: builder.mutation<ApiExpense, Partial<ApiExpense> & { label: string }>({
      query: (body) => ({ url: "/expense", method: "POST", body }),
      invalidatesTags: ["Expense"],
    }),
    deleteExpense: builder.mutation<null, string>({
      query: (id) => ({ url: `/expense/${id}`, method: "DELETE" }),
      invalidatesTags: ["Expense"],
    }),
  }),
});

export const { useGetExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation } = expenseApi;
