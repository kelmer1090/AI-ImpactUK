'use client'
/* eslint-disable react/jsx-no-bind */
import { useState } from 'react'
import RagDonut from '@/components/RagDonut'
import toast from 'react-hot-toast'

type Flag = {
  id: string
  clause: string
  severity: string
  reason: string
  mitigation?: string
}

export default function DescribePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dataTypes, setDataTypes] = useState('')
  const [modelType, setModelType] = useState('')
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFlags([]) // Reset on new submit
    const toastId = toast.loading('Analysing project...')
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          data_types: dataTypes.split(',').map((s) => s.trim()),
          model_type: modelType,
        }),
      })
      if (!res.ok) throw new Error('Failed to analyse. Please try again.')
      const json = await res.json()
      setFlags(json.flags ?? [])
      if (json.flags && json.flags.length > 0) {
        toast.success('Analysis complete!', { id: toastId })
      } else {
        toast('No risks found! 🎉', { icon: '✅', id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const counts = flags.reduce(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
    {} as Record<string, number>
  )

  return (
    <main className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-semibold mb-6">Describe your AI project</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
        />
        <textarea
          className="w-full border px-3 py-2"
          rows={4}
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          disabled={loading}
        />
        <input
          className="w-full border px-3 py-2"
          placeholder="Data types (comma separated)"
          value={dataTypes}
          onChange={(e) => setDataTypes(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full border px-3 py-2"
          placeholder="Model type (e.g., Classification)"
          value={modelType}
          onChange={(e) => setModelType(e.target.value)}
          disabled={loading}
        />
        <button
          className={`bg-blue-600 text-white px-4 py-2 rounded ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Analysing...' : 'Analyse'}
        </button>
      </form>

      {flags.length > 0 && (
        <div className="mt-8 flex items-start gap-8">
          <RagDonut counts={counts} />
          <div>
            <h2 className="text-2xl font-semibold mb-2">Flags</h2>
            <ul className="space-y-2">
              {flags.map((f) => (
                <li
                  key={f.id}
                  className={`border p-3 rounded transition-colors ${
                    f.severity === 'red'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : f.severity === 'amber'
                      ? 'border-amber-500 bg-amber-50 dark:bg-yellow-900/20'
                      : 'border-green-600 bg-green-50 dark:bg-green-900/20'
                  }`}
                >
                  <div className="font-medium mb-1">
                    <span className="uppercase">{f.severity}</span> — {f.reason}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    Clause: {f.clause}
                  </div>
                  {f.mitigation && (
                    <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                      Mitigation: {f.mitigation}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
