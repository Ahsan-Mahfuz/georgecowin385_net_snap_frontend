import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiUser, Portal, AccountStatus } from "./types";
import { Role } from "@/lib/mock";

export interface GetUsersArgs {
  portal?: Portal;
  status?: AccountStatus;
  role?: Role;
  searchTerm?: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Active team members (any logged-in user) — for manager/owner dropdowns.
    getTeam: builder.query<ApiUser[], { portal?: Portal } | void>({
      query: (args) => ({ url: "/user/team", params: args || {} }),
      transformResponse: (res: ApiEnvelope<ApiUser[]>) => res.data,
      providesTags: ["Team"],
    }),
    getUsers: builder.query<ApiUser[], GetUsersArgs | void>({
      query: (args) => ({ url: "/user", params: args || {} }),
      transformResponse: (res: ApiEnvelope<ApiUser[]>) => res.data,
      providesTags: ["User"],
    }),
    approveUser: builder.mutation<ApiUser, { id: string; role: Role }>({
      query: ({ id, role }) => ({ url: `/user/${id}/approve`, method: "PATCH", body: { role } }),
      invalidatesTags: ["User"],
    }),
    rejectUser: builder.mutation<null, string>({
      query: (id) => ({ url: `/user/${id}/reject`, method: "PATCH" }),
      invalidatesTags: ["User"],
    }),
    setUserStatus: builder.mutation<ApiUser, { id: string; status: AccountStatus }>({
      query: ({ id, status }) => ({ url: `/user/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["User"],
    }),
    setUserRole: builder.mutation<ApiUser, { id: string; role: Role }>({
      query: ({ id, role }) => ({ url: `/user/${id}/role`, method: "PATCH", body: { role } }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetTeamQuery,
  useGetUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  useSetUserStatusMutation,
  useSetUserRoleMutation,
} = userApi;
