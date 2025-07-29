'use client'
/* eslint-disable react/jsx-no-bind */
import { useState } from 'react'
import RagDonut from '@/components/RagDonut'

type Flag = {
  id: string
  clause: string
  severity: string
  reason: string
}

export default function DescribePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dataTypes, setDataTypes] = useState('')
  const [modelType, setModelType] = useState('')
  const [flags, setFlags] = useState<Flag[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        data_types: dataTypes.split(',').map((s) => s.trim()),
        model_type: modelType,
        deployment_env: 'Local dev',
      }),
    })
    const json = await res.json()
    console.log('API‑response', json)
    setFlags(json.flags ?? [])
  }

  const counts = flags.reduce(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
    {} as Record<string, number>
  )

  return (
    <main className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-semibold mb-6">Describe your AI project</h1>

      {/* ── form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full border px-3 py-2"
          rows={4}
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          className="w-full border px-3 py-2"
          placeholder="Data types (comma separated)"
          value={dataTypes}
          onChange={(e) => setDataTypes(e.target.value)}
        />
        <input
          className="w-full border px-3 py-2"
          placeholder="Model type (e.g., Classification)"
          value={modelType}
          onChange={(e) => setModelType(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          Analyse
        </button>
      </form>

      {/* ── results ──────────────────────────────────────────── */}
      {flags.length > 0 && (
        <div className="mt-8 flex items-start gap-8">
          <RagDonut counts={counts} />
          <div>
            <h2 className="text-2xl font-semibold mb-2">Flags</h2>
            <ul className="space-y-2">
              {flags.map((f) => (
                <li
                  key={f.id}
                  className={`border p-3 rounded ${
                    f.severity === 'red'
                      ? 'border-red-600 bg-red-50'
                      : f.severity === 'amber'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-green-600 bg-green-50'
                  }`}
                >
                  <p className="font-medium">
                    {f.severity.toUpperCase()} – {f.reason}
                  </p>
                  <p className="text-xs text-gray-600 italic">{f.clause}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
