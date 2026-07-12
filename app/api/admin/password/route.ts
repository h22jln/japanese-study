import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Payload = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profile?.username !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as Payload | null;
  const username = payload?.username?.trim().toLowerCase();
  const password = payload?.password ?? "";

  if (!username || !/^[a-z0-9_]{4,20}$/.test(username)) {
    return NextResponse.json({ error: "아이디 형식을 확인해주세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "대상 사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const { error } = await admin.auth.admin.updateUserById(targetProfile.id, { password });
  if (error) {
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
