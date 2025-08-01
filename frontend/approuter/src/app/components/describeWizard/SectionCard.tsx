import QuestionField from './QuestionField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SectionCardProps {
  section: any
  answers: Record<string, any>
  onAnswer: (id: string, value: any) => void
  showWarning?: boolean // <--- Add this prop
}

function isFieldFilled(q: any, val: any) {
  if (!q.required) return true
  if (val == null || val === '') return false
  if (q.type === 'textarea' || q.type === 'text') {
    if (q.minLength && typeof val === 'string' && val.length < q.minLength) return false
  }
  if ((q.type === 'checklist' || q.type === 'multiselect' || q.type === 'checkbox') && Array.isArray(val) && val.length === 0) return false
  return true
}

export default function SectionCard({ section, answers, onAnswer, showWarning }: SectionCardProps) {
  // Supports both .questions and .subsections
  const questions =
    section.questions ||
    (section.subsections
      ? section.subsections.flatMap((s: any) =>
          s.questions.map((q: any) => ({
            ...q,
            groupTitle: s.title
          }))
        )
      : [])

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{section.section || section.stepLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {questions.map((q: any) => {
          // Show error if required, not filled, and user attempted to proceed
          const showError = !!showWarning && q.required && !isFieldFilled(q, answers[q.id])
          return (
            <div key={q.id} className="mb-6">
              {q.groupTitle && (
                <div className="text-lg font-semibold mb-2">{q.groupTitle}</div>
              )}
              <QuestionField
                question={q}
                value={answers[q.id]}
                onChange={(val: any) => onAnswer(q.id, val)}
                allAnswers={answers}
                showError={showError}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
