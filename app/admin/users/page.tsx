import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { isAdminUsername } from "@/lib/auth/admin";

type AdminUserItem = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
};

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (!isAdminUsername(profile?.username)) redirect("/dashboard");

  const admin = createAdminSupabaseClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,username,display_name,created_at")
    .order("created_at", { ascending: true });

  const items: AdminUserItem[] = (profiles ?? []).map((item) => ({
    id: item.id,
    username: item.username ?? "",
    displayName: item.display_name ?? "",
    createdAt: item.created_at,
  }));

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">ADMIN ONLY</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">유저 관리</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">현재 가입한 사용자 목록을 보고, 비밀번호 변경이나 탈퇴 처리를 할 수 있습니다.</p>
          </div>
          <p className="text-sm text-[var(--muted)]">{items.length}명 가입됨</p>
        </header>

        <section className="mt-8 rounded-3xl border border-[var(--line)] bg-white p-4 sm:p-6">
          <AdminUsersManager initialUsers={items} />
        </section>
      </div>
    </main>
  );
}
