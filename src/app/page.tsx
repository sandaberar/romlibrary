"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/ensureProfile";

type SitePage = {
  slug: string;
  title: string;
  hero_image_url: string | null;
  body_markdown: string;
  updated_at: string;
};

function renderMarkdownVeryBasic(md: string) {
  const lines = (md ?? "").split("\n");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {lines.map((line, idx) => {
        const t = line.trim();
        if (!t) return <div key={idx} style={{ height: 6 }} />;

        return (
          <p
            key={idx}
            style={{
              margin: 0,
              lineHeight: 1.6,
              fontWeight: 700,
              color: "inherit",
              textShadow: "0 1px 2px rgba(0,0,0,.55)",
            }}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [page, setPage] = useState<SitePage | null>(null);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      setPageLoading(true);

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("auth.getUser error", authErr);
        setError(authErr.message);
      }
      setUserEmail(auth?.user?.email ?? null);

      const res = await supabase
        .from("site_pages")
        .select("slug,title,hero_image_url,body_markdown,updated_at")
        .eq("slug", "home")
        .single();

      console.log("site_pages home result:", res);

      if (res.error) {
        setError(res.error.message);
        setPage(null);
        setPageLoading(false);
        return;
      }

      setPage(res.data as SitePage);
      setPageLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
        if (session?.user) {
          try {
            await ensureProfile();
          } catch (e) {
            console.error(e);
          }
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  const title = page?.title ?? "Romanian Community Library";
  const heroImage =
    page?.hero_image_url ??
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=70";

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa" }}>
      <header
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>{title}</div>

        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/books">Books</a>
          <a href="/give">Give</a>
          <a href="/admin/home">Admin</a>

          {userEmail ? (
            <>
              <span style={{ color: "#555", fontSize: 13 }}>{userEmail}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <a href="/login">Login</a>
          )}
        </nav>
      </header>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 24px" }}>
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid #eee",
            background: "#111",
            color: "#fff",
          }}
        >
          <div
            style={{
              padding: "52px 24px",
              backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.75), rgba(0,0,0,.25)), url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 44, letterSpacing: -0.5 }}>
              {title}
            </h1>

            <div style={{ marginTop: 14, maxWidth: 650 }}>
              {error ? (
                <p style={{ margin: 0, color: "#ffd2d2" }}>
                  Home content error: {error}
                </p>
              ) : pageLoading ? (
                <p style={{ margin: 0, color: "rgba(255,255,255,.85)" }}>
                  Loading…
                </p>
              ) : !page ? (
                <p style={{ margin: 0, color: "#ffd2d2" }}>
                  No home page row found in <code>site_pages</code> (slug=
                  &quot;home&quot;).
                </p>
              ) : (
                <div style={{ color: "rgba(255,255,255,.95)" }}>
                  {renderMarkdownVeryBasic(page.body_markdown)}
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href="/books"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#111",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Browse books
              </a>

              <a
                href="/give"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.60)",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Give a book
              </a>
            </div>
          </div>
        </div>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 800 }}>Borrow locally</div>
            <p style={{ margin: "8px 0 0", color: "#555" }}>
              Find Romanian books in your area and contact the giver.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 800 }}>Community-driven</div>
            <p style={{ margin: "8px 0 0", color: "#555" }}>
              Add books you’re willing to lend. Keep the library growing.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 800 }}>Simple requests</div>
            <p style={{ margin: "8px 0 0", color: "#555" }}>
              Click “Request” to open an email pre-filled to the giver.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}