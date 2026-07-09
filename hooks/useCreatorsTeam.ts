"use client";

import { useGetTeamQuery } from "@/redux/api/userApi";
import { toManagers, toProfile } from "@/lib/adapters";
import type { Profile } from "@/lib/mock";

// Live Creators team (active users) in the frontend's Profile shape. Replaces the
// old static `users` / `managers` exports from lib/mock.
export function useCreatorsTeam(): { users: Profile[]; managers: Profile[]; isLoading: boolean } {
  const { data = [], isLoading } = useGetTeamQuery({ portal: "creators" });
  return { users: data.map(toProfile), managers: toManagers(data), isLoading };
}
