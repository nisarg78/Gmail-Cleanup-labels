"use client"

import { useState, useEffect } from "react"

const STORAGE_KEY = "inboxpilot_llm_config"

interface LLMConfig {
  provider: "anthropic" | "openai" | "ollama" | "compatible" | "none"
  apiKey: string
  model: string
  baseUrl?: string
}

const DEFAULT_MODELS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o-mini", "gpt-4o", "o1-mini"],
  ollama: [],
  compatible: [],
  none: [],
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic Claude",
  openai: "OpenAI / GPT",
  ollama: "Ollama (local, free)",
  compatible: "OpenAI-compatible",
  none: "No LLM (manual mode)",
}

export function LLMConfig() {
  const [config, setConfig] = useState<LLMConfig>({
    provider: "none",
    apiKey: "",
    model: "",
    baseUrl: "",
  })
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setConfig(JSON.parse(stored)) } catch {}
    }
  }, [])

  const handleProviderChange = (provider: LLMConfig["provider"]) => {
    const defaultModel = DEFAULT_MODELS[provider]?.[0] ?? ""
    setConfig(c => ({ ...c, provider, model: defaultModel, apiKey: "", baseUrl: "" }))
    setTestResult(null)
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/classify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      setTestResult(data.ok ? "ok" : "fail")
    } catch {
      setTestResult("fail")
    } finally {
      setTesting(false)
    }
  }

  const showApiKey = config.provider !== "ollama" && config.provider !== "none"
  const showBaseUrl = config.provider === "ollama" || config.provider === "compatible"
  const showModelInput = config.provider === "ollama" || config.provider === "compatible"
  const modelOptions = DEFAULT_MODELS[config.provider] ?? []

  return (
    <div className="space-y-6">
      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">LLM Provider</label>
        <select
          value={config.provider}
          onChange={e => handleProviderChange(e.target.value as LLMConfig["provider"])}
          className="w-full px-3 py-2 rounded-lg text-gray-200 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: "#1e293b", border: "1px solid #334155" }}
        >
          {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      {showApiKey && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
          <input
            type="password"
            value={config.apiKey}
            onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
            placeholder="sk-ant-... or sk-..."
            className="w-full px-3 py-2 rounded-lg text-gray-200 text-sm placeholder-gray-600 outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: "#1e293b", border: "1px solid #334155" }}
          />
          <p className="text-xs text-gray-500 mt-1">Stored in your browser only — never sent to our servers.</p>
        </div>
      )}

      {/* Base URL */}
      {showBaseUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {config.provider === "ollama" ? "Ollama URL" : "Base URL"}
          </label>
          <input
            type="text"
            value={config.baseUrl ?? ""}
            onChange={e => setConfig(c => ({ ...c, baseUrl: e.target.value }))}
            placeholder={config.provider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"}
            className="w-full px-3 py-2 rounded-lg text-gray-200 text-sm placeholder-gray-600 outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: "#1e293b", border: "1px solid #334155" }}
          />
        </div>
      )}

      {/* Model */}
      {config.provider !== "none" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
          {showModelInput ? (
            <input
              type="text"
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              placeholder="llama3"
              className="w-full px-3 py-2 rounded-lg text-gray-200 text-sm placeholder-gray-600 outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ background: "#1e293b", border: "1px solid #334155" }}
            />
          ) : (
            <select
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-gray-200 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ background: "#1e293b", border: "1px solid #334155" }}
            >
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 items-center flex-wrap">
        {config.provider !== "none" && (
          <button
            onClick={handleTest}
            disabled={testing || (!config.apiKey && showApiKey)}
            className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-40 transition-colors"
            style={{ background: "#334155", color: "#e2e8f0" }}
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-2 text-sm rounded-lg font-semibold transition-colors"
          style={{ background: "#4f46e5", color: "#ffffff" }}
        >
          {saved ? "Saved ✓" : "Save"}
        </button>

        {testResult === "ok" && <span className="text-green-400 text-sm">✓ Connection successful</span>}
        {testResult === "fail" && <span className="text-red-400 text-sm">✗ Connection failed</span>}
      </div>
    </div>
  )
}
