import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LLMConfig } from "@/app/components/LLMConfig"
import Link from "next/link"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <main className="min-h-screen p-8" style={{ background: "#0e1117" }}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 text-sm mb-8">Configure your AI provider for email classification.</p>

        <div className="rounded-xl p-6" style={{ background: "#1e293b", border: "1px solid #334155" }}>
          <h2 className="text-lg font-semibold text-white mb-6">LLM Provider</h2>
          <LLMConfig />
        </div>
      </div>
    </main>
  )
}
