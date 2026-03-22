"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Area = { id: string; name: string; state: string };

type Book = {
  id: string;
  title: string;
  author: string;
  publication_year: number | null;
  language: string;
  category: string;
  description: string | null;
  available_now: boolean;
  copies_total: number;
  area_id: string;
  created_at: string;
};

const PAGE_SIZE = 24;

const CATEGORIES = [
  "Fiction",
  "Poetry",
  "Children",
  "History",
  "Biography",
  "Science",
  "Philosophy",
  "Cooking",
];

type RequestPanelState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  giverEmail: string | null;
  bookId: string | null;
  title: string;
  author: string;
};

export default function BooksPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestPanel, setRequestPanel] = useState<RequestPanelState>({
    open: false,
    loading: false,
    error: null,
    giverEmail: null,
    bookId: null,
    title: "",
    author: "",
  });

  const areaById = useMemo(
    () => new Map(areas.map((a) => [a.id, `${a.name}, ${a.state}`])),
    [areas]
  );

  function makeMailto(giverEmailAddr: string, title: string, author: string) {
    const subject = encodeURIComponent(`Book request: ${title}`);
    const body = encodeURIComponent(
      `Hi!\n\nI would like to borrow:\n- ${title} by ${author}\n\nThanks!`
    );
    return `mailto:${giverEmailAddr}?subject=${subject}&body=${body}`;
  }

  async function openRequestPanel(bookId: string, title: string, author: string) {
    setRequestPanel({
      open: true,
      loading: true,
      error: null,
      giverEmail: null,
      bookId,
      title,
      author,
    });

    const res = await fetch("/api/giver-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId }),
    });

    const json = await res.json();
    if (!res.ok) {
      setRequestPanel((p) => ({
        ...p,
        loading: false,
        error: json.error ?? "Unknown error",
      }));
      return;
    }

    setRequestPanel((p) => ({
      ...p,
      loading: false,
      giverEmail: json.email as string,
    }));
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      alert("Copied email to clipboard.");
    } catch {
      // fallback for older browsers / blocked clipboard perms
      prompt("Copy this email:", email);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);

      const { data: areasData, error: areasErr } = await supabase
        .from("areas")
        .select("id,name,state")
        .eq("is_active", true)
        .order("name");

      if (areasErr) setError(areasErr.message);
      else setAreas((areasData ?? []) as Area[]);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("books")
        .select(
          "id,title,author,publication_year,language,category,description,available_now,copies_total,area_id,created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (onlyAvailable) query = query.eq("available_now", true);
      if (areaId !== "all") query = query.eq("area_id", areaId);
      if (category !== "all") query = query.eq("category", category);

      const term = q.trim();
      if (term) {
        const escaped = term.replace(/[%_]/g, "\\$&");
        query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        setError(error.message);
      } else {
        setBooks((data ?? []) as Book[]);
        setTotal(count ?? 0);
      }

      setLoading(false);
    })();
  }, [q, areaId, category, onlyAvailable, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function onChangeSearch(v: string) {
    setQ(v);
    setPage(1);
  }

  function onChangeArea(v: string) {
    setAreaId(v);
    setPage(1);
  }

  function onChangeCategory(v: string) {
    setCategory(v);
    setPage(1);
  }

  const mailtoHref =
    requestPanel.giverEmail && requestPanel.open
      ? makeMailto(requestPanel.giverEmail, requestPanel.title, requestPanel.author)
      : "#";

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: -0.4, color: "#111" }}>
            Books
          </h1>
          <p style={{ marginTop: 6, color: "#555" }}>
            Search by title/author, filter by area and category, and request via email.
          </p>
        </div>
        <nav style={{ color: "#666" }}>
          <a href="/">Home</a> • <a href="/give">Give a book</a> •{" "}
          <a href="/admin/home">Admin</a>
        </nav>
      </header>

      <section
        style={{
          marginTop: 16,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 200px 200px 200px",
          alignItems: "end",
        }}
      >
        <label style={{ color: "#111" }}>
          Search
          <input
            value={q}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="e.g. Solenoid, Cărtărescu…"
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
            }}
          />
        </label>

        <label style={{ color: "#111" }}>
          Area
          <select
            value={areaId}
            onChange={(e) => onChangeArea(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
            }}
          >
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}, {a.state}
              </option>
            ))}
          </select>
        </label>

        <label style={{ color: "#111" }}>
          Category
          <select
            value={category}
            onChange={(e) => onChangeCategory(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
            }}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#111" }}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => {
              setOnlyAvailable(e.target.checked);
              setPage(1);
            }}
          />
          Only available
        </label>
      </section>

      <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
        {loading ? "Loading…" : `${total} result(s)`} {!userEmail ? "• Login to request" : ""}
      </div>

      {error ? (
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "crimson" }}>
          {error}
        </pre>
      ) : null}

      <section
        style={{
          marginTop: 16,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {books.map((b) => (
          <article
            key={b.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{b.title}</div>
            <div style={{ marginTop: 4, color: "#555" }}>
              {b.author}
              {b.publication_year ? ` • ${b.publication_year}` : ""} • {b.language}
            </div>

            <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
              {b.category} • {areaById.get(b.area_id) ?? "Unknown area"} •{" "}
              {b.available_now ? "Available" : "Not available"} • Copies: {b.copies_total}
            </div>

            {b.description ? (
              <p style={{ marginTop: 10, color: "#333" }}>{b.description}</p>
            ) : null}

            <div style={{ marginTop: 12 }}>
              {userEmail ? (
                <button
                  onClick={() => openRequestPanel(b.id, b.title, b.author)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Request this book
                </button>
              ) : (
                <a
                  href="/login"
                  style={{
                    display: "block",
                    textAlign: "center",
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Login to request
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      <footer
        style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>

        <div style={{ color: "#555" }}>
          Page {page} / {Math.max(1, totalPages)}
        </div>

        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </footer>

      {/* Request panel (Option A fallback for mailto) */}
      {requestPanel.open ? (
        <div
          onClick={() => setRequestPanel((p) => ({ ...p, open: false }))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #eee",
              padding: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>Request info</div>
                <div style={{ marginTop: 4, color: "#555" }}>
                  {requestPanel.title} — {requestPanel.author}
                </div>
              </div>

              <button
                onClick={() => setRequestPanel((p) => ({ ...p, open: false }))}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: "#111",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              {requestPanel.loading ? (
                <p style={{ margin: 0, color: "#111" }}>Loading giver email…</p>
              ) : requestPanel.error ? (
                <p style={{ margin: 0, color: "crimson" }}>{requestPanel.error}</p>
              ) : requestPanel.giverEmail ? (
                <>
                  <div style={{ fontSize: 13, color: "#666" }}>Giver email</div>
                  <div style={{ fontWeight: 800, marginTop: 4, color: "#111" }}>
                    {requestPanel.giverEmail}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={() => copyEmail(requestPanel.giverEmail!)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                        color: "#111",
                      }}
                    >
                      Copy email
                    </button>

                    <a
                      href={mailtoHref}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      Open email app
                    </a>
                  </div>

                  <p style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
                    If "Open email app" doesn't work on this device, copy the email and send
                    the request from Gmail/Outlook/webmail.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, color: "crimson" }}>
                  No giver email returned. (Unexpected)
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
