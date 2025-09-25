import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-6">Node Invocation Not Found</h2>
        <p className="text-gray-500 dark:text-gray-500 mb-8">
          The node invocation you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/trace"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Traces
        </Link>
      </div>
    </div>
  )
}
