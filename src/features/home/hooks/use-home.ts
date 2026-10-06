import { useAuth } from "@/features/auth/contexts/auth-context";
import { PostgrestError } from "@supabase/supabase-js";
import {
  QueryClient,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createHome,
  deleteHome,
  getHome,
  getHomeMembers,
  leaveHome,
  redeemInvite,
  renameHome,
  setMemberRole,
} from "../api";
import { MemberRole } from "../home-types";

// Nycklarna matchar på prefix, så homeKeys.all invaliderar både det egna
// hemmet och medlemslistan. current bär användar-id så cachen inte delas
// mellan konton på samma enhet.
export const homeKeys = {
  all: ["home"] as const,
  current: (userId: string) => ["home", "current", userId] as const,
  members: (homeId: string) => ["home", homeId, "members"] as const,
  invites: (homeId: string) => ["home", homeId, "invites"] as const,
  preview: (token: string) => ["home", "invite-preview", token] as const,
};

export const useHome = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: homeKeys.current(user?.id ?? ""),
    queryFn: user ? () => getHome(user.id) : skipToken,
  });
};

export const useHomeMembers = (homeId: string | undefined) =>
  useQuery({
    queryKey: homeKeys.members(homeId ?? ""),
    queryFn: homeId ? () => getHomeMembers(homeId) : skipToken,
  });

// Ingen router.replace efter dessa två: Stack.Protected i root-layouten
// flyttar användaren när useHome refetchat. Promisen returneras så isPending
// håller knappen disabled till dess.
export const useCreateHome = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, string>({
    mutationFn: createHome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
  });
};

export const useRedeemInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, string>({
    mutationFn: redeemInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
  });
};

export const useRenameHome = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, { homeId: string; name: string }>({
    mutationFn: renameHome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
  });
};

export const useSetMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    { homeId: string; userId: string; role: MemberRole }
  >({
    mutationFn: setMemberRole,
    // all som prefix, inte members: degraderar du dig själv ändras även
    // din egen roll i homeKeys.current.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
  });
};

/**
 * Att lämna eller radera ett hem är det enda stället där vi går FRÅN ett hem,
 * och det kräver två olika sorters tömning.
 *
 * Andra features (recipeKeys, ingredientKeys) bär det gamla hemmets privata
 * data under nycklar utan hem-id — de ska bort helt.
 *
 * Hem-frågan ska däremot bara invalideras, inte tas bort. Tas den bort blir
 * den pending igen, och ready-uttrycket i root-layouten gatar på just det:
 * hela navigationsträdet rivs mitt i övergången, och guarden får aldrig flytta
 * oss rent. Med invalidate behåller frågan sin gamla data under refetchen, så
 * trädet står stilla till svaret kommer och guarden kan byta gren i ett steg.
 *
 * Inte clear(): den tömmer även mutation-cachen, och det är just en mutation
 * vars onSuccess vi står i.
 */
const discardHomeData = (queryClient: QueryClient) => {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== homeKeys.all[0],
  });
  return queryClient.invalidateQueries({ queryKey: homeKeys.all });
};

export const useLeaveHome = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, void>({
    mutationFn: leaveHome,
    onSuccess: () => discardHomeData(queryClient),
  });
};

export const useDeleteHome = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, string>({
    mutationFn: deleteHome,
    onSuccess: () => discardHomeData(queryClient),
  });
};
