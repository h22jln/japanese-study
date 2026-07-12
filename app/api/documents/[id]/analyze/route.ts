import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeDocument } from "@/lib/ai/analyze-document";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document } = await supabase.from("documents").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OpenAI is not configured" }, { status: 503 });

  try {
    const result = await analyzeDocument({ documentId: id, userId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("[document-analysis]", { documentId: id, userId: user.id, message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
