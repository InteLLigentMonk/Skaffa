import { supabase } from "@/lib/supabase";

export const getCurrentHomeId = async () => {
  const { data, error } = await supabase.from("homes").select("id").single();

  if (error) throw error;
  return data.id;
};
