import Link from 'next/link';
import EngineToggle from '@/components/admin/EngineToggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-gray-800 hover:text-blue-600 transition-all group">
          <span className="bg-blue-600 shadow-lg shadow-blue-200 text-white px-2 py-1 rounded-lg group-hover:bg-blue-700">LE</span>
          Control Hub
        </Link>
        <div className="flex items-center gap-6">
          <EngineToggle />
          <div className="h-4 w-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 font-mono tracking-tighter uppercase">Cloud Engine v0.1-alpha</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8">
        {children}
      </main>
    </div>
  );
}
