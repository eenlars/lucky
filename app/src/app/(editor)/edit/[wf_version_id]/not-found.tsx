import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl text-gray-600 mb-6">Workflow Version Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          The workflow version you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <div className="space-x-4">
          <Link
            href="/edit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Workflow
          </Link>
          <Link href="/" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
