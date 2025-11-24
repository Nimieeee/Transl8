import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-gray-900">
          Transl8
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          AI-powered video dubbing and translation platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/dashboard"
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
