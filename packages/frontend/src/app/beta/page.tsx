import { BetaOnboarding } from '@/components/beta/beta-onboarding';

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join Our Beta Program
          </h1>
          <p className="text-lg text-gray-600">
            Help us shape the future of AI video dubbing
          </p>
        </div>

        <BetaOnboarding />

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Early Access</h3>
            <p className="text-gray-600 text-sm">
              Be the first to try new features and improvements before they're released to the public.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Pro Access</h3>
            <p className="text-gray-600 text-sm">
              Enjoy unlimited video processing and all Pro features completely free during the beta period.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Direct Impact</h3>
            <p className="text-gray-600 text-sm">
              Your feedback directly influences product development and helps us build what you need.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What We're Looking For</h2>
          <div className="space-y-4 text-gray-600">
            <p>
              We're seeking content creators, educators, and businesses who regularly work with video content
              and need multilingual dubbing capabilities. Ideal beta testers include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>YouTubers expanding to international audiences</li>
              <li>Online course creators offering multilingual content</li>
              <li>Podcasters looking to reach global listeners</li>
              <li>Marketing teams creating localized video campaigns</li>
              <li>Educational institutions producing multilingual materials</li>
            </ul>
            <p className="mt-4">
              In exchange for free Pro access, we ask that you actively use the platform, provide regular
              feedback, and participate in occasional surveys or interviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
