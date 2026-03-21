"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SitePage = {
  slug: string;
  title: string;
  hero_image_url: string | null;
  body_markdown: string;
  updated_at: string;
};

export default function AdminHomeEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [title, setTitle] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      const user = authData.user;
      setUserEmail(user?.email ?? null);

      if (!user) {
        setLoading(false);
        return;
      }

      // Check admin flag in profiles
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (profileErr) {
        setError(profileErr.message);
        setLoading(false);
        return;
      }

      const admin = Boolean((profile as any)?.is_admin);
      setIsAdmin(admin);

      const { data: pageData, error: pageErr } = await supabase
        .from("site_pages")
        .select("slug,title,hero_image_url,body_markdown,updated_at")
        .eq("slug", "home")
        .single();

      if (pageErr) {
        setError(pageErr.message);
        setLoading(false);
        return;
      }

      const p = pageData as SitePage;
      setTitle(p.title ?? "");
      setHeroImageUrl(p.hero_image_url ?? "");
      setBodyMarkdown(p.body_markdown ?? "");

      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", authData.user.id)
      .single();

    if (!profile?.is_admin) {
      setError("Not authorized. (profiles.is_admin is false)");
      setSaving(false);
      return;
    }

    const { error: updErr } = await supabase
      .from("site_pages")
      .update({
        title: title.trim() || "Romanian Community Library",
        hero_image_url: heroImageUrl.trim() ? heroImageUrl.trim() : null,
        body_markdown: bodyMarkdown ?? "",
        updated_by: authData.user.id,
      })
      .eq("slug", "home");

    if (updErr) setError(updErr.message);
    else setStatus("Saved!");

    setSaving(false);
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1>Admin: Home page</h1>
        <p>
          You must <a href="/login">login</a> to edit.
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1>Admin: Home page</h1>
        <p>Signed in as: {userEmail}</p>
        <p style={{ color: "crimson" }}>
          You are not an admin yet. Set <code>profiles.is_admin</code> to true
          for your user in Supabase Table Editor.
        </p>
        <p>
          <a href="/">Home</a> • <a href="/books">Books</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Admin: Home page</h1>
      <p style={{ color: "#555" }}>
        Signed in as: {userEmail}. <a href="/">View home</a>
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label>
          Hero image URL (optional)
          <input
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://…"
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label>
          Body (Markdown-ish text for now)
          <textarea
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            rows={10}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          />
        </label>

        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>

        {status ? <p style={{ color: "green" }}>{status}</p> : null}
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      </div>

      <p style={{ marginTop: 18 }}>
        <a href="/books">Books</a> • <a href="/give">Give</a>
      </p>
    </main>
  );
}