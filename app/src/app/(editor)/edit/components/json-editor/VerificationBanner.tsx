type VerificationResult = {
  isValid: boolean
  errors: string[]
}

type VerificationBannerProps = {
  verificationResult: VerificationResult | null
  onClose: () => void
}

export default function VerificationBanner({
  verificationResult,
  onClose,
}: VerificationBannerProps) {
  if (!verificationResult) return null

  return (
    <div
      className={`px-6 py-3 border-b transition-all duration-300 ${verificationResult.isValid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {verificationResult.isValid ? (
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h3
            className={`font-medium text-sm ${verificationResult.isValid ? "text-emerald-900" : "text-red-900"}`}
          >
            {verificationResult.isValid
              ? "Workflow validated successfully"
              : "Validation issues found"}
          </h3>
          {!verificationResult.isValid &&
            verificationResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {verificationResult.errors.map((error, index) => (
                  <li
                    key={index}
                    className="text-sm text-red-700 flex items-start gap-2"
                  >
                    <span className="text-red-400 mt-0.5">→</span>
                    <span className="leading-relaxed">{error}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
