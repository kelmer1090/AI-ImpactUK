import { Progress } from '@/components/ui/progress'

export default function ProgressBar({
  currentStep,
  totalSteps,
  labels = []
}: {
  currentStep: number
  totalSteps: number
  labels?: string[]
}) {
  const pct = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="mb-4 w-full flex flex-col items-center">
      {/* Tabs/Labels */}
      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
        {labels.length > 0 &&
          labels.map((l, i) => (
            <div key={l} className="flex items-center">
              <span
                className={
                  i === currentStep
                    ? "font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded transition"
                    : "opacity-70 px-2"
                }
              >
                {l}
              </span>
              {i < labels.length - 1 && (
                <span className="mx-1 text-gray-300 select-none">|</span>
              )}
            </div>
          ))}
      </div>
      {/* Progress Bar */}
      <Progress value={pct} className="h-2 rounded w-full" />
    </div>
  )
}
