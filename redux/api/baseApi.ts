import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/redux/store";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Single RTK Query API. Every feature endpoint is injected into this one slice
// (see redux/api/*Api.ts). The token is read from the persisted session state
// and attached as a Bearer header on every request.
export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).session.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "User",
    "Team",
    "Deal",
    "CollectiveDeal",
    "Talent",
    "Overhead",
    "EmailLead",
    "Expense",
    "Settings",
    "Approval",
    "ProductionRequest",
    "Me",
  ],
  endpoints: () => ({}),
});
