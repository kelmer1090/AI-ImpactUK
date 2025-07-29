'use client'
import { PieChart, Pie, Cell } from 'recharts'

const COLORS = { red: '#ef4444', amber: '#f59e0b', green: '#10b981' }

export default function RagDonut({
  counts,
}: {
  counts: Record<string, number>
}) {
  const data = Object.entries(counts).map(([k, v]) => ({ name: k, value: v }))
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
          <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
        ))}
      </Pie>
    </PieChart>
  )
}
