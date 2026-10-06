import { Enums } from "@/lib/database.types";

export type MemberRole = Enums<"member_role">;

export type Home = {
  id: string;
  name: string;
  role: MemberRole;
};

// Platt form av home_members + den inbäddade profilen, så skärmarna slipper
// veta att namnet kommer från en annan tabell än rollen.
export type HomeMember = {
  userId: string;
  role: MemberRole;
  joinedAt: string;
  displayName: string;
  avatarPath: string | null;
};

export type HomeInvite = {
  id: string;
  token: string;
  expiresAt: string;
};

// Det peek_invite() lämnar ut till någon som ännu inte är medlem.
export type InvitePreview = {
  homeId: string;
  homeName: string;
  memberCount: number;
};
