import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SignInButton from "./components/SignInButton"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">InboxPilot</h1>
      <p className="text-lg text-gray-500">AI-powered Gmail cleanup</p>
      <SignInButton />
    </main>
  )
}
