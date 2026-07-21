import Link from "next/link";
import { ArrowLeft, Palette } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HighlightColorSettings } from "@/components/settings/highlight-color-settings";
import { defaultAnalysisHighlightColor, defaultLookupHighlightColor } from "@/lib/user-highlight-colors";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("analysis_highlight_color,lookup_highlight_color")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> 대시보드</Link>
        <header className="mt-7 sm:mt-8">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]"><Palette size={16} /> 사용자 설정</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">표시 색 설정</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">본문에 표시되는 단어 색을 학습하기 편한 색으로 골라둘 수 있습니다.</p>
        </header>
        <HighlightColorSettings
          userId={user.id}
          initialAnalysisColor={profile?.analysis_highlight_color ?? defaultAnalysisHighlightColor}
          initialLookupColor={profile?.lookup_highlight_color ?? defaultLookupHighlightColor}
        />
      </div>
    </main>
  );
}
