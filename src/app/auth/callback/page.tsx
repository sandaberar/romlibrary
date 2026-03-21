"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/ensureProfile";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      // Supabase v2 will read tokens from the URL and persist the session.
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMsg(`Auth error: ${error.message}`);
        return;
      }

      if (data.session?.user) {
        try {
          await ensureProfile();
        } catch (e: any) {
          // Profile creation failure shouldn't block sign-in UX
          console.error(e);
        }
        router.replace("/");
      } else {
        setMsg("No session found. Try requesting a new magic link.");
      }
    })();
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Auth callback</h1>
      <p>{msg}</p>
    </main>
  );
}