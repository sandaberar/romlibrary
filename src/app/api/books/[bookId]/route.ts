import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    
    // Get the session from the request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Extract token from "Bearer {token}"
    const token = authHeader.replace("Bearer ", "");

    // Verify the token and get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Check if user owns this book
    const { data: book, error: bookErr } = await supabaseAdmin
      .from("books")
      .select("owner_user_id")
      .eq("id", bookId)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.owner_user_id !== userData.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own books" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      author,
      category,
      publication_year,
      language,
      description,
      copies_total,
      available_now,
      area_id,
    } = body;

    const { error: updateErr } = await supabaseAdmin
      .from("books")
      .update({
        title,
        author,
        category,
        publication_year,
        language,
        description,
        copies_total,
        available_now,
        area_id,
      })
      .eq("id", bookId);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { bookId: string } }
) {
  try {
    const bookId = params.bookId;

    // Get the session from the request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Extract token from "Bearer {token}"
    const token = authHeader.replace("Bearer ", "");

    // Verify the token and get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Check if user owns this book
    const { data: book, error: bookErr } = await supabaseAdmin
      .from("books")
      .select("owner_user_id")
      .eq("id", bookId)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.owner_user_id !== userData.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own books" },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("books")
      .delete()
      .eq("id", bookId);

    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
