import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <SignIn
        appearance={{
          elements: {
            footer: "hidden", // This hides the "Secured by Clerk" footer
          },
        }}
      />
    </div>
  )
}
