import { auth } from "@/auth"
import Image from "next/image"
import SignOutButton from "../components/SignOutButton"

export default async function Dashboard() {
  const session = await auth()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
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
            <div className="w-12 h-12 rounded-full bg-gray-200" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
          </div>
          <SignOutButton />
        </div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-500">
          Gmail scanning and labeling coming in the next step.
        </p>
      </div>
    </main>
  )
}
