'use client'
import { useEffect, useState } from 'react';

type Flag = {
  id: string
  clause: string
  severity: string // 'red' | 'amber' | 'green'
  reason: string
  mitigation?: string
};

export default function DescribeResultPage() {
  const [analysis, setAnalysis] = useState<{ flags: Flag[] } | null>(null);

  useEffect(() => {
    // Get from sessionStorage
    const data = window.sessionStorage.getItem('analysisResult');
    if (data) setAnalysis(JSON.parse(data));
  }, []);

  if (!analysis) return <div className="py-8 text-center">No analysis to display.</div>;

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Assessment Results</h1>
      {analysis.flags.length === 0 ? (
        <div className="bg-green-100 p-6 rounded text-green-800 text-lg">
           No issues flagged, your project looks good!
        </div>
      ) : (
        <div className="space-y-5">
          {analysis.flags.map((flag, i) => (
            <div key={i} className={`
                border-l-4 p-4 rounded shadow
                ${flag.severity === 'red' ? 'border-red-600 bg-red-50' : ''}
                ${flag.severity === 'amber' ? 'border-yellow-400 bg-yellow-50' : ''}
                ${flag.severity === 'green' ? 'border-green-500 bg-green-50' : ''}
              `}>
              <div className="text-sm uppercase font-bold mb-1">{flag.severity} / {flag.id}</div>
              <div className="font-semibold">{flag.clause}</div>
              <div className="text-gray-600 my-2">{flag.reason}</div>
              {flag.mitigation && (
                <div className="text-xs text-blue-700">Mitigation: {flag.mitigation}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
