import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center justify-between">
          <Link href="/supervisor" className="text-xl font-black">BayQueue</Link>
          <nav className="flex gap-3 text-sm font-semibold">
            <Link href="/supervisor">New</Link>
            <Link href="/queue">Queue</Link>
            <Link href="/reports">Reports</Link>
          </nav>
        </div>
      </header>

      <main className="p-4">{children}</main>
    </div>
  );
}
