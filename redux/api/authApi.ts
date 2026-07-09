import { baseApi } from "./baseApi";
import { ApiEnvelope, ApiUser, Portal } from "./types";
import { Role } from "@/lib/mock";

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role: Role;
  portal: Portal;
}

export interface LoginBody {
  email: string;
  password: string;
  portal?: Portal;
}

export interface LoginResult {
  token: string;
  user: ApiUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResult, LoginBody>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (res: ApiEnvelope<ApiUser>) => ({
        token: res.token as string,
        user: res.data,
      }),
      invalidatesTags: ["Me"],
    }),
    signup: builder.mutation<ApiUser, SignupBody>({
      query: (body) => ({ url: "/auth/signup", method: "POST", body }),
      transformResponse: (res: ApiEnvelope<ApiUser>) => res.data,
    }),
    getMe: builder.query<ApiUser, void>({
      query: () => "/auth/me",
      transformResponse: (res: ApiEnvelope<ApiUser>) => res.data,
      providesTags: ["Me"],
    }),
  }),
});

export const { useLoginMutation, useSignupMutation, useGetMeQuery } = authApi;
