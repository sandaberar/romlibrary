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

const PAGE_SIZE = 50;

const GENRES = [
  "Fiction",
  "Poetry",
  "Children",
  "History",
  "Biography",
  "Science",
  "Philosophy",
  "Cooking",
];

type SortOption = "title" | "author" | "genre" | "area" | "date";

type RequestPanelState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  giverEmail: string | null;
  bookId: string | null;
  title: string;
  author: string;
};

type DetailsPanelState = {
  open: boolean;
  book: Book | null;
};

export default function BooksPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<SortOption>("date");
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

  const [detailsPanel, setDetailsPanel] = useState<DetailsPanelState>({
    open: false,
    book: null,
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
        );

      // Apply filters
      if (onlyAvailable) query = query.eq("available_now", true);
      if (areaId !== "all") query = query.eq("area_id", areaId);
      if (genre !== "all") query = query.eq("category", genre);

      const term = q.trim();
      if (term) {
        const escaped = term.replace(/[%_]/g, "\\$&");
        query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%`);
      }

      // Apply sorting
      if (sortBy === "title") {
        query = query.order("title", { ascending: true });
      } else if (sortBy === "author") {
        query = query.order("author", { ascending: true });
      } else if (sortBy === "genre") {
        query = query.order("category", { ascending: true });
      } else if (sortBy === "area") {
        query = query.order("area_id", { ascending: true });
      } else {
        // date (default)
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        setError(error.message);
      } else {
        setBooks((data ?? []) as Book[]);
        setTotal(count ?? 0);
      }

      setLoading(false);
    })();
  }, [q, areaId, genre, onlyAvailable, page, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function onChangeSearch(v: string) {
    setQ(v);
    setPage(1);
  }

  function onChangeArea(v: string) {
    setAreaId(v);
    setPage(1);
  }

  function onChangeGenre(v: string) {
    setGenre(v);
    setPage(1);
  }

  function onChangeSort(v: string) {
    setSortBy(v as SortOption);
    setPage(1);
  }

  const mailtoHref =
    requestPanel.giverEmail && requestPanel.open
      ? makeMailto(requestPanel.giverEmail, requestPanel.title, requestPanel.author)
      : "#";

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
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
            Search, filter, and sort books in our library.
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
          gridTemplateColumns: "1fr 180px 180px 180px 180px",
          alignItems: "end",
        }}
      >
        <label style={{ color: "#111" }}>
          Search (Title or Author)
          <input
            value={q}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="e.g. Cărtărescu, Poetry…"
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
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ color: "#111" }}>
          Genre
          <select
            value={genre}
            onChange={(e) => onChangeGenre(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
            }}
          >
            <option value="all">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label style={{ color: "#111" }}>
          Sort by
          <select
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
            }}
          >
            <option value="date">Newest first</option>
            <option value="title">Title (A-Z)</option>
            <option value="author">Author (A-Z)</option>
            <option value="genre">Genre (A-Z)</option>
            <option value="area">Area (A-Z)</option>
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
          Available only
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

      {/* Table view */}
      <section style={{ marginTop: 16, overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #111" }}>
              <th style={{ textAlign: "left", padding: "12px 8px", color: "#111", fontWeight: 800 }}>
                Title
              </th>
              <th style={{ textAlign: "left", padding: "12px 8px", color: "#111", fontWeight: 800 }}>
                Author
              </th>
              <th style={{ textAlign: "left", padding: "12px 8px", color: "#111", fontWeight: 800 }}>
                Genre
              </th>
              <th style={{ textAlign: "left", padding: "12px 8px", color: "#111", fontWeight: 800 }}>
                Status
              </th>
              <th style={{ textAlign: "center", padding: "12px 8px", color: "#111", fontWeight: 800 }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr
                key={b.id}
                style={{
                  borderBottom: "1px solid #eee",
                  backgroundColor: b.available_now ? "#fff" : "#fafafa",
                }}
              >
                <td style={{ padding: "12px 8px", color: "#111" }}>
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  {b.publication_year && (
                    <div style={{ fontSize: 12, color: "#999" }}>({b.publication_year})</div>
                  )}
                </td>
                <td style={{ padding: "12px 8px", color: "#555" }}>{b.author}</td>
                <td style={{ padding: "12px 8px", color: "#555" }}>{b.category}</td>
                <td style={{ padding: "12px 8px", color: b.available_now ? "green" : "#999" }}>
                  {b.available_now ? "Available" : "Not available"}
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <button
                    onClick={() => setDetailsPanel({ open: true, book: b })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "#f5f5f5",
                      color: "#111",
                      cursor: "pointer",
                      marginRight: 6,
                      fontSize: 12,
                    }}
                  >
                    Details
                  </button>
                  {userEmail ? (
                    <button
                      onClick={() => openRequestPanel(b.id, b.title, b.author)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Request
                    </button>
                  ) : (
                    <a
                      href="/login"
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        background: "#f5f5f5",
                        color: "#111",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Login
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {books.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
            No books found.
          </div>
        )}
      </section>

      {/* Pagination */}
      <footer
        style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: page <= 1 ? "#f5f5f5" : "#fff",
            color: "#111",
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>

        <div style={{ color: "#555", fontSize: 13 }}>
          Page {page} / {Math.max(1, totalPages)}
        </div>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: page >= totalPages ? "#f5f5f5" : "#fff",
            color: "#111",
            cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </footer>

      {/* Details Modal */}
      {detailsPanel.open && detailsPanel.book ? (
        <div
          onClick={() => setDetailsPanel({ open: false, book: null })}
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
              width: "min(600px, 100%)",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #eee",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>
                  {detailsPanel.book.title}
                </h2>
                <p style={{ margin: "6px 0 0", color: "#555", fontSize: 14 }}>
                  by {detailsPanel.book.author}
                </p>
              </div>
              <button
                onClick={() => setDetailsPanel({ open: false, book: null })}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: "#111",
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>GENRE</div>
                <div style={{ color: "#111", marginTop: 4 }}>{detailsPanel.book.category}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>AREA</div>
                <div style={{ color: "#111", marginTop: 4 }}>
                  {areaById.get(detailsPanel.book.area_id) ?? "Unknown"}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>LANGUAGE</div>
                <div style={{ color: "#111", marginTop: 4 }}>{detailsPanel.book.language}</div>
              </div>

              {detailsPanel.book.publication_year && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>YEAR</div>
                  <div style={{ color: "#111", marginTop: 4 }}>{detailsPanel.book.publication_year}</div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>STATUS</div>
                <div
                  style={{
                    color: detailsPanel.book.available_now ? "green" : "#999",
                    marginTop: 4,
                    fontWeight: 700,
                  }}
                >
                  {detailsPanel.book.available_now ? "Available" : "Not available"}
                </div>
              </div>

              {detailsPanel.book.description && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#999", fontWeight: 700 }}>DESCRIPTION</div>
                  <p style={{ color: "#333", marginTop: 8, lineHeight: 1.6 }}>
                    {detailsPanel.book.description}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, borderTop: "1px solid #eee", paddingTop: 16 }}>
              {userEmail ? (
                <button
                  onClick={() => {
                    setDetailsPanel({ open: false, book: null });
                    openRequestPanel(detailsPanel.book!.id, detailsPanel.book!.title, detailsPanel.book!.author);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
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
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#f5f5f5",
                    color: "#111",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Login to request
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Request Panel (Email modal) */}
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
            zIndex: 51,
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
