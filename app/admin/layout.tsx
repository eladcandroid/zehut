import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/layout/admin-nav';
import { AdminHeader } from '@/components/layout/admin-header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  // Check if authenticated
  if (session?.value !== 'authenticated') {
    redirect('/admin-login');
  }
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AdminHeader />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-e border-[var(--color-border)] bg-[var(--color-surface)] min-h-[calc(100vh-3.5rem)]">
          <AdminNav />
        </aside>

        {/* Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
