"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Area = { id: string; name: string; state: string };

export default function GivePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publicationYear, setPublicationYear] = useState<string>("");
  const [language, setLanguage] = useState("Romanian");
  const [description, setDescription] = useState("");
  const [copiesTotal, setCopiesTotal] = useState<number>(1);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      const { data, error } = await supabase
        .from("areas")
        .select("id,name,state")
        .eq("is_active", true)
        .order("name");

      if (error) setError(error.message);
      else {
        setAreas(data ?? []);
        if ((data ?? []).length && !areaId) setAreaId((data ?? [])[0].id);
      }
    })();

    // Auth state
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      }
    );

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return setError(authErr.message);
    if (!authData.user) return setError("You must be logged in to add a book.");

    const year =
      publicationYear.trim() === "" ? null : Number(publicationYear.trim());

    const { error: insErr } = await supabase.from("books").insert({
      owner_user_id: authData.user.id,
      area_id: areaId,
      title,
      author,
      publication_year: year,
      language,
      description: description.trim() ? description.trim() : null,
      copies_total: copiesTotal,
      available_now: true,
      cover_image_url: null,
    });

    if (insErr) return setError(insErr.message);

    setStatus("Book added!");
    setTitle("");
    setAuthor("");
    setPublicationYear("");
    setDescription("");
    setCopiesTotal(1);
  }

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
        <div style={{ fontWeight: 800 }}>Romanian Community Library</div>

        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/">Home</a>
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

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 24px" }}>
        <h1 style={{ color: "#111" }}>Give a book</h1>
        <p style={{ color: "#555" }}>Add a book you're willing to lend.</p>

        <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label style={{ color: "#111" }}>
            Area
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.state}
                </option>
              ))}
            </select>
          </label>

          <label style={{ color: "#111" }}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <label style={{ color: "#111" }}>
            Author
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <label style={{ color: "#111" }}>
            Publication year (optional)
            <input
              value={publicationYear}
              onChange={(e) => setPublicationYear(e.target.value)}
              inputMode="numeric"
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <label style={{ color: "#111" }}>
            Language
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <label style={{ color: "#111" }}>
            Copies total
            <input
              type="number"
              min={1}
              value={copiesTotal}
              onChange={(e) => setCopiesTotal(Number(e.target.value))}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <label style={{ color: "#111" }}>
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Add book
          </button>

          {status ? <p style={{ color: "green" }}>{status}</p> : null}
          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
