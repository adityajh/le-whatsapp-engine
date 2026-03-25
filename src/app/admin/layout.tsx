import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Control Hub
        </Link>
        <span className="text-xs text-gray-400 font-mono">Let&apos;s Enterprise Admin</span>
      </header>
      <main>{children}</main>
    </div>
  );
}
