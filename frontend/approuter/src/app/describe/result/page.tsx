'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Flag = {
  id: string
  clause: string
  severity: 'red' | 'amber' | 'green'
  reason: string
  mitigation?: string | null
}

type Analysis = {
  flags: Flag[]
  project?: {
    title?: string
    description?: string
    model_type?: string
    data_types?: string[]
    deployment_env?: string
  }
}

const severityOrder = { red: 3, amber: 2, green: 1 }

function severityColor(sev: Flag['severity']) {
  switch (sev) {
    case 'red':
      return { border: 'border-red-600', bg: 'bg-red-50', text: 'text-red-800' }
    case 'amber':
      return { border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-800' }
    case 'green':
      return { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' }
    default:
      return { border: 'border-gray-300', bg: 'bg-white', text: 'text-gray-800' }
  }
}

// Simple compliance heuristic: start at 100, subtract penalties
function computeCompliance(flags: Flag[]) {
  let score = 100
  for (const f of flags) {
    if (f.severity === 'red') score -= 25
    else if (f.severity === 'amber') score -= 10
    // green no penalty
  }
  if (score < 0) score = 0
  return Math.round(score)
}

function DonutChart({
  red,
  amber,
  green
}: {
  red: number
  amber: number
  green: number
}) {
  const total = red + amber + green || 1
  const radius = 50
  const circumference = 2 * Math.PI * radius
  // compute stroke dash offsets in order: red, amber, green
  const redPct = red / total
  const amberPct = amber / total
  const greenPct = green / total

  // cumulative for stacking
  const redLen = circumference * redPct
  const amberLen = circumference * amberPct
  const greenLen = circumference * greenPct

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" aria-label="Risk overview">
      <g transform="translate(60,60) rotate(-90)">
        {/* Background circle */}
        <circle r={radius} fill="none" stroke="#e5e7eb" strokeWidth={20} />
        {/* Red slice */}
        {red > 0 && (
          <circle
            r={radius}
            fill="none"
            stroke="#dc2626"
            strokeWidth={20}
            strokeDasharray={`${redLen} ${circumference - redLen}`}
            strokeDashoffset={0}
          />
        )}
        {/* Amber slice */}
        {amber > 0 && (
          <circle
            r={radius}
            fill="none"
            stroke="#d97706"
            strokeWidth={20}
            strokeDasharray={`${amberLen} ${circumference - amberLen}`}
            strokeDashoffset={-redLen}
          />
        )}
        {/* Green slice */}
        {green > 0 && (
          <circle
            r={radius}
            fill="none"
            stroke="#16a34a"
            strokeWidth={20}
            strokeDasharray={`${greenLen} ${circumference - greenLen}`}
            strokeDashoffset={-(redLen + amberLen)}
          />
        )}
      </g>
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dy="0.3em"
        className="font-semibold"
        style={{ fontSize: 14 }}
      >
        {total === 0 ? '—' : `${Math.round((green / total) * 100)}%`}
      </text>
      <text
        x="60"
        y="76"
        textAnchor="middle"
        dy="0.3em"
        className="text-xs text-gray-500"
        style={{ fontSize: 10 }}
      >
        green
      </text>
    </svg>
  )
}

export default function DescribeResultPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const data = window.sessionStorage.getItem('analysisResult')
    if (data) {
      try {
        setAnalysis(JSON.parse(data))
      } catch {
        setAnalysis(null)
      }
    }
  }, [])

  const counts = useMemo(() => {
    if (!analysis) return { red: 0, amber: 0, green: 0 }
    let red = 0,
      amber = 0,
      green = 0
    for (const f of analysis.flags) {
      if (f.severity === 'red') red += 1
      else if (f.severity === 'amber') amber += 1
      else if (f.severity === 'green') green += 1
    }
    return { red, amber, green }
  }, [analysis])

  const compliance = useMemo(() => {
    if (!analysis) return 100
    return computeCompliance(analysis.flags)
  }, [analysis])

  if (!analysis) {
    return (
      <div className="py-12 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">No analysis to display</h1>
        <p className="mb-6 text-gray-600">
          It looks like you haven't submitted a project yet.{' '}
          <button
            onClick={() => router.push('/describe')}
            className="text-blue-600 underline"
          >
            Go back to the wizard
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">Assessment Results</h1>
          {analysis.project?.title && (
            <div className="text-gray-700 mb-2">
              Project: <span className="font-semibold">{analysis.project.title}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
              Compliance: {compliance}%
            </div>
            <div className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
              High Risk: {counts.red}
            </div>
            <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
              Medium Risk: {counts.amber}
            </div>
            <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
              Low/Informational: {counts.green}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="mb-1 text-sm font-medium">Risk Overview</div>
            <DonutChart red={counts.red} amber={counts.amber} green={counts.green} />
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                window.sessionStorage.removeItem('analysisResult')
                router.push('/describe')
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Start over
            </button>
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
            </button>
          </div>
        </div>
      </div>

      {analysis.flags.length === 0 ? (
        <div className="bg-green-100 p-6 rounded text-green-800 text-lg">
          No issues flagged, your project looks good!
        </div>
      ) : (
        <div className="space-y-6">
          {analysis.flags
            .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
            .map((flag, i) => {
              const { border, bg, text } = severityColor(flag.severity)
              return (
                <div
                  key={i}
                  className={`p-5 rounded shadow-sm flex flex-col ${border} ${bg} ${text} border-l-4`}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-xs uppercase font-semibold tracking-wide">
                      {flag.severity.toUpperCase()} / {flag.id}
                    </div>
                    <div className="text-sm font-medium">{flag.clause}</div>
                  </div>
                  <div className="mt-2 text-gray-700">{flag.reason}</div>
                  {flag.mitigation && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold">Suggested mitigation:</div>
                      <div className="text-sm">{flag.mitigation}</div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {showRaw && (
        <div className="mt-8">
          <div className="text-sm font-medium mb-1">Raw analysis (debug)</div>
          <pre className="bg-gray-900 text-white p-4 rounded overflow-auto text-xs">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
