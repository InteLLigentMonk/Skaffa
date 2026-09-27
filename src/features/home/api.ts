import { supabase } from "@/lib/supabase";
import { Home } from "./home-types";

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
