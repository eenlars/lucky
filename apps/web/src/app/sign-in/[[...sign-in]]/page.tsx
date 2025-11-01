import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs"
import { ClerkDebug } from "./clerk-debug"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <ClerkLoading>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading authentication...</p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              footer: "hidden",
            },
          }}
        />
      </ClerkLoaded>
      <ClerkDebug />
    </div>
  )
}
