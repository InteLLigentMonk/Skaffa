import { useAuth } from "@/features/auth/contexts/auth-context";
import { skipToken, useQuery } from "@tanstack/react-query";
import { getHome } from "../api";

export const homeKeys = {
  all: ["home"] as const,
  current: (userId: string) => ["home", "current", userId] as const,
};

export const useHome = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: homeKeys.current(user?.id ?? ""),
    queryFn: user ? () => getHome(user.id) : skipToken,
  });
};
