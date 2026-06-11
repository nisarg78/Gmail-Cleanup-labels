import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SignInButton from "./components/SignInButton"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="min-h-screen" style={{ background: "#0e1117", color: "#e2e8f0" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-bold text-lg text-white">InboxPilot</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/your-username/inboxpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {/* GitHub icon SVG */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
          <span className="text-xs px-2 py-0.5 rounded-full text-gray-400" style={{ background: "#1e293b", border: "1px solid #334155" }}>
            MIT License
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-6 text-green-400" style={{ background: "#052e16", border: "1px solid #16a34a" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Open Source · Free · Self-hosted
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Clean up your Gmail inbox<br />
          <span style={{ color: "#4f46e5" }}>in minutes, not hours</span>
        </h1>

        <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
          Scan thousands of emails, get AI-powered label suggestions, and organize your inbox automatically — without ever leaving your browser.
        </p>

        <SignInButton />

        <p className="text-xs text-gray-600 mt-4">No data stored on our servers · Works with any Gmail account</p>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "📧",
              title: "Scan",
              desc: "Paginate your entire inbox in minutes. Groups emails by sender with date ranges and subject previews.",
              detail: "Up to 500 messages/request · Respects Gmail rate limits",
            },
            {
              icon: "🤖",
              title: "Classify",
              desc: "AI classifies each sender into categories with suggested actions — using only metadata, never your email content.",
              detail: "Claude · GPT-4o · Ollama · Any OpenAI-compatible API",
            },
            {
              icon: "🏷️",
              title: "Organize",
              desc: "Creates 26 colored Gmail labels and applies them to all matching emails in one batch operation.",
              detail: "batchModify up to 1,000 emails per call",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl p-6 space-y-3"
              style={{ background: "#1e293b", border: "1px solid #334155" }}
            >
              <div className="text-3xl">{card.icon}</div>
              <h3 className="font-bold text-white text-lg">{card.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              <p className="text-xs text-gray-600">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshot placeholder */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ background: "#111827", border: "1px solid #1e293b", height: "320px" }}
        >
          <p className="text-gray-600 text-sm italic">Dashboard screenshot coming soon</p>
        </div>
      </section>

      {/* Privacy section */}
      <section className="px-6 pb-24 max-w-3xl mx-auto text-center">
        <div
          className="rounded-2xl p-8 space-y-4"
          style={{ background: "#0a1628", border: "1px solid #1e3a5f" }}
        >
          <div className="text-2xl">🔒</div>
          <h2 className="text-xl font-bold text-white">Your emails never leave your machine</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto">
            InboxPilot runs entirely in your browser and your own Next.js server. Email content is never read — the AI only sees sender names, email addresses, message counts, and the first few words of subject lines. API keys are stored in your browser's localStorage only.
          </p>
          <div className="flex justify-center gap-6 flex-wrap text-xs text-gray-500 pt-2">
            <span>✓ No email content read</span>
            <span>✓ No data stored on external servers</span>
            <span>✓ API keys in localStorage only</span>
            <span>✓ Open source — audit the code</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-xs text-gray-600" style={{ borderColor: "#1e293b" }}>
        <p>InboxPilot · MIT License · Built with Next.js, NextAuth, and the Gmail API</p>
      </footer>
    </main>
  )
}
