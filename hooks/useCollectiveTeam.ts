"use client";

import { useGetTeamQuery } from "@/redux/api/userApi";
import { toProfile } from "@/lib/adapters";
import type { Profile } from "@/lib/mock";

// Active Collective sales users in the frontend's Profile shape.
export function useCollectiveTeam(): { users: Profile[]; isLoading: boolean } {
  const { data = [], isLoading } = useGetTeamQuery({ portal: "collective" });
  return { users: data.map(toProfile), isLoading };
}
