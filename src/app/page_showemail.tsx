"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/ensureProfile";

type Area = { id: string; name: string; state: string };

type Book = {
  id: string;
  title: string;
  author: string;
  publication_year: number | null;
  language: string;
  description: string | null;
  available_now: boolean;
  copies_total: number;
  area_id: string;
  created_at: string;
};

export default function Home() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const areaById = useMemo(
    () => new Map(areas.map((a) => [a.id, `${a.name}, ${a.state}`])),
    [areas]
  );

  async function showGiverEmail(bookId: string) {
    const res = await fetch("/api/giver-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(`Error: ${json.error ?? "Unknown error"}`);
      return;
    }

    alert(`Giver email: ${json.email}`);
  }

  useEffect(() => {
    (async () => {
      setError(null);

      const { data: auth } = await supabase.auth.getUser();
      setUserEmail(auth.user?.email ?? null);

      const [
        { data: areasData, error: areasErr },
        { data: booksData, error: booksErr },
      ] = await Promise.all([
        supabase
          .from("areas")
          .select("id,name,state")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("books")
          .select(
            "id,title,author,publication_year,language,description,available_now,copies_total,area_id,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (areasErr || booksErr) {
        setError(
          JSON.stringify(
            { areas: areasErr?.message, books: booksErr?.message },
            null,
            2
          )
        );
        return;
      }

      setAreas((areasData ?? []) as Area[]);
      setBooks((booksData ?? []) as Book[]);
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

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Romanian Community Library</h1>

      <div style={{ marginTop: 12 }}>
        {userEmail ? (
          <>
            <div>Signed in as: {userEmail}</div>
            <button onClick={logout} style={{ marginTop: 8 }}>
              Logout
            </button>
            <div style={{ marginTop: 12 }}>
              <a href="/give">Give a book</a>
            </div>
          </>
        ) : (
          <a href="/login">Login</a>
        )}
      </div>

      {error ? (
        <>
          <p style={{ marginTop: 16, color: "crimson" }}>Error:</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        </>
      ) : null}

      <h2 style={{ marginTop: 24 }}>Books</h2>
      {books.length === 0 ? <p>No books yet. Add one via “Give a book”.</p> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {books.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 650 }}>
              {b.title}{" "}
              <span style={{ fontWeight: 400, color: "#666" }}>
                {b.publication_year ? `(${b.publication_year})` : ""}
              </span>
            </div>

            <div style={{ color: "#555", marginTop: 4 }}>
              {b.author} • {b.language} • {areaById.get(b.area_id) ?? "Unknown area"}
            </div>

            {b.description ? (
              <div style={{ marginTop: 8, color: "#333" }}>{b.description}</div>
            ) : null}

            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              {b.available_now ? "Available now" : "Not available now"} • Copies:{" "}
              {b.copies_total}
            </div>

            <div style={{ marginTop: 10 }}>
              {userEmail ? (
                <button onClick={() => showGiverEmail(b.id)}>
                  Show giver email
                </button>
              ) : (
                <a href="/login">Login to see giver email</a>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Areas</h2>
      <ul>
        {areas.map((a) => (
          <li key={a.id}>
            {a.name}, {a.state}
          </li>
        ))}
      </ul>
    </main>
  );
}