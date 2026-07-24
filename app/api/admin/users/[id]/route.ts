import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAdminUsername } from "@/lib/auth/admin";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (!isAdminUsername(profile?.username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", id)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "대상 사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (isAdminUsername(targetProfile.username)) {
    return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: "사용자 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
