import { Enums } from "@/lib/database.types";

export type MemberRole = Enums<"member_role">;

export type Home = {
  id: string;
  name: string;
  role: MemberRole;
};
