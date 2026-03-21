import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { bookId } = (await req.json()) as { bookId?: string };
    if (!bookId) {
      return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
    }

    // Find the book owner
    const { data: book, error: bookErr } = await supabaseAdmin
      .from("books")
      .select("owner_user_id")
      .eq("id", bookId)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Get email from Supabase Auth (admin)
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(
      book.owner_user_id
    );

    if (error || !data?.user?.email) {
      return NextResponse.json(
        { error: "Could not find giver email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ email: data.user.email });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}