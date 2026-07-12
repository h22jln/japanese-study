import { redirect } from "next/navigation";

export default async function AdminPasswordPage() {
  redirect("/admin/users");
}
