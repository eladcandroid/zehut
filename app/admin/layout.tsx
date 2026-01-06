import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  House,
  FileText,
  ArrowsClockwise,
  ChartBar,
} from '@phosphor-icons/react/dist/ssr';

const navItems = [
  { href: '/admin', icon: House, label: 'סקירה' },
  { href: '/admin/content', icon: FileText, label: 'תוכן' },
  { href: '/admin/jobs', icon: ArrowsClockwise, label: 'משימות' },
];

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
      {/* Header */}
      <header className="sticky top-0 z-40 h-14 px-4 flex items-center gap-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
            <ChartBar weight="fill" className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold">ניהול</span>
        </Link>

        <div className="flex-1" />

        <Link
          href="/"
          className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-border-subtle)] transition-colors"
        >
          חזרה לאתר
        </Link>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-e border-[var(--color-border)] bg-[var(--color-surface)] min-h-[calc(100vh-3.5rem)]">
          <nav className="p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-md)] hover:bg-[var(--color-border-subtle)] transition-colors"
              >
                <item.icon weight="regular" className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
