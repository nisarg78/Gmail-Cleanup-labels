import { auth } from "@/auth"
import Image from "next/image"
import SignOutButton from "../components/SignOutButton"
import DashboardClient from "./DashboardClient"

export default async function Dashboard() {
  const session = await auth()

  return (
    <main className="min-h-screen p-8" style={{ background: "#0e1117" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="User avatar"
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-600" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-white">{session?.user?.name}</p>
            <p className="text-sm text-gray-400">{session?.user?.email}</p>
          </div>
          <SignOutButton />
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">InboxPilot</h1>

        {/* Scan section — client component handles SSE state */}
        <DashboardClient user={session?.user ?? {}} />
      </div>
    </main>
  )
}
