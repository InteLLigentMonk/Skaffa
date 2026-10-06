import { PostgrestError } from "@supabase/supabase-js";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createInvite, listInvites, peekInvite, revokeInvite } from "../api";
import { HomeInvite, InvitePreview } from "../home-types";
import { homeKeys } from "./use-home";

export const useInvites = (homeId: string | undefined) =>
  useQuery({
    queryKey: homeKeys.invites(homeId ?? ""),
    queryFn: homeId ? () => listInvites(homeId) : skipToken,
  });

export const useCreateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    HomeInvite,
    PostgrestError,
    { homeId: string; userId: string }
  >({
    mutationFn: createInvite,
    onSuccess: (_invite, { homeId }) =>
      queryClient.invalidateQueries({ queryKey: homeKeys.invites(homeId) }),
  });
};

export const useRevokeInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    { inviteId: string; homeId: string }
  >({
    mutationFn: ({ inviteId }) => revokeInvite(inviteId),
    onSuccess: (_void, { homeId }) =>
      queryClient.invalidateQueries({ queryKey: homeKeys.invites(homeId) }),
  });
};

// retry: false — en ogiltig eller utgången kod är ett svar, inte ett fel att
// försöka om. staleTime 0 så en återkallad inbjudan upptäcks direkt.
export const useInvitePreview = (token: string | null) =>
  useQuery<InvitePreview | null, PostgrestError>({
    queryKey: homeKeys.preview(token ?? ""),
    queryFn: token ? () => peekInvite(token) : skipToken,
    retry: false,
    staleTime: 0,
  });
