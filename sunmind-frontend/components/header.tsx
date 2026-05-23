import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">SunMind</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard/control"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Управление
            </Link>
            <Link
              href="/dashboard/analytics"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Аналитика
            </Link>
            <Link
              href="/auth/login"
              className="rounded-md bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Войти
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
