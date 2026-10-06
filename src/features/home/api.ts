import { supabase } from "@/lib/supabase";
import {
  Home,
  HomeInvite,
  HomeMember,
  InvitePreview,
  MemberRole,
} from "./home-types";

export const getHome = async (userId: string): Promise<Home | null> => {
  const { data, error } = await supabase
    .from("home_members")
    .select("role, homes(id, name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const result = {
    id: data.homes.id,
    name: data.homes.name,
    role: data.role,
  };

  return result;
};

// members_select ger hela hemmets rader, så här är RLS faktiskt filtret vi
// vill ha. .eq på home_id ändå, så frågan betyder samma sak som den läser.
export const getHomeMembers = async (
  homeId: string,
): Promise<HomeMember[]> => {
  const { data, error } = await supabase
    .from("home_members")
    .select("user_id, role, joined_at, profiles(display_name, avatar_path)")
    .eq("home_id", homeId)
    .order("joined_at");

  if (error) throw error;

  return data.map((row) => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    displayName: row.profiles.display_name,
    avatarPath: row.profiles.avatar_path,
  }));
};

export const createHome = async (name: string) => {
  const { data, error } = await supabase.rpc("create_home", { _name: name });
  if (error) throw error;
  return data;
};

export const redeemInvite = async (token: string) => {
  const { data, error } = await supabase.rpc("redeem_invite", {
    _token: token,
  });
  if (error) throw error;
  return data;
};

// Grenarna (sista medlemmen raderar hemmet, sista ägaren blockeras) ligger i
// RPC:n — klienten kan inte välja utan att tävla med de andra medlemmarna.
export const leaveHome = async () => {
  const { error } = await supabase.rpc("leave_home");
  if (error) throw error;
};

export const deleteHome = async (homeId: string) => {
  const { error } = await supabase.rpc("delete_home", { _home_id: homeId });
  if (error) throw error;
};

export const renameHome = async ({
  homeId,
  name,
}: {
  homeId: string;
  name: string;
}) => {
  const { error } = await supabase
    .from("homes")
    .update({ name })
    .eq("id", homeId);
  if (error) throw error;
};

// Ingen egen RPC: members_update ger redan ägaren rätten, och
// guard_last_owner håller invarianten om att hemmet behöver minst en ägare.
// .select() gör en no-op synlig — utan den ser ett nekat uppdrag ut som succé.
export const setMemberRole = async ({
  homeId,
  userId,
  role,
}: {
  homeId: string;
  userId: string;
  role: MemberRole;
}) => {
  const { error } = await supabase
    .from("home_members")
    .update({ role })
    .eq("home_id", homeId)
    .eq("user_id", userId)
    .select("user_id")
    .single();
  if (error) throw error;
};

// Den inbjudna är inte ägare och får därför inte läsa invite_tokens.
// peek_invite är security definer och lämnar bara ut namn + antal medlemmar.
export const peekInvite = async (
  token: string,
): Promise<InvitePreview | null> => {
  const { data, error } = await supabase
    .rpc("peek_invite", { _token: token })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    homeId: data.home_id,
    homeName: data.home_name,
    memberCount: data.member_count,
  };
};

export const listInvites = async (homeId: string): Promise<HomeInvite[]> => {
  const { data, error } = await supabase
    .from("invite_tokens")
    .select("id, token, expires_at")
    .eq("home_id", homeId)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    token: row.token,
      expiresAt: row.expires_at,
  }));
};

// token och expires_at har defaults i schemat; created_by krävs av
// tokens_insert-policyn (created_by = auth.uid()).
export const createInvite = async ({
  homeId,
  userId,
}: {
  homeId: string;
  userId: string;
}): Promise<HomeInvite> => {
  const { data, error } = await supabase
    .from("invite_tokens")
    .insert({ home_id: homeId, created_by: userId })
    .select("id, token, expires_at")
    .single();

  if (error) throw error;

  return { id: data.id, token: data.token, expiresAt: data.expires_at };
};

// Tokens raderas aldrig — det finns ingen delete-policy. De återkallas.
export const revokeInvite = async (inviteId: string) => {
  const { error } = await supabase
    .from("invite_tokens")
    .update({ revoked: true })
    .eq("id", inviteId);
  if (error) throw error;
};
