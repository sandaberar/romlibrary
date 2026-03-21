import { supabase } from "@/lib/supabase/client";

export async function ensureProfile() {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const user = auth.user;
  if (!user) return;

  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return;

  const { error: insErr } = await supabase.from("profiles").insert({
    user_id: user.id,
  });

  if (insErr) throw insErr;
}