// src/components/RagDonut.tsx
'use client'
import { PieChart, Pie, Cell } from 'recharts'

const COLORS = { red: '#ef4444', amber: '#f59e0b', green: '#10b981' } as const
const ORDER: Array<keyof typeof COLORS> = ['red', 'amber', 'green']

export default function RagDonut({
  counts,
}: {
  counts: Record<'red' | 'amber' | 'green', number>
}) {
  const data = ORDER.map((name) => ({ name, value: counts[name] || 0 }))

  return (
    <PieChart width={160} height={160}>
      <Pie
        data={data}
        innerRadius={60}
        outerRadius={80}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((entry) => (
          <Cell key={entry.name} fill={COLORS[entry.name]} />
        ))}
      </Pie>
    </PieChart>
  )
}
