'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import questionsData from './questions.json'
import SectionCard from './SectionCard'
import ProgressBar from './ProgressBar'
import { mapWizardAnswersToApi } from '../../../../utils/mapWizardAnswersToApi'

type Answer = Record<string, any>

// Validation helper (same as before)
function isFieldFilled(q: any, val: any) {
  if (!q.required) return true
  if (val == null || val === undefined) return false
  if (typeof val === 'string' && val.trim() === '') return false
  switch (q.type) {
    case 'textarea':
    case 'text':
      if (typeof val !== 'string' || val.trim() === '') return false
      if (q.minLength && val.length < q.minLength) return false
      return true
    case 'select':
    case 'radio':
    case 'likert':
      return typeof val === 'string' && val.trim() !== ''
    case 'checklist':
    case 'multiselect':
    case 'checkbox':
      return Array.isArray(val) && val.length > 0
    case 'file':
      return !!val
    default:
      return !!val
  }
}

export default function DescribeWizard() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [sections, setSections] = useState<any[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()

  // Load questions.json
  useEffect(() => {
    setSections(questionsData as any[])
  }, [])

  if (sections.length === 0) return <div>Loading...</div>

  const section = sections[step]

  // Gather all questions in this section (works for subsections too)
  const questions =
    section.questions ||
    (section.subsections
      ? section.subsections.flatMap((s: any) =>
          s.questions.map((q: any) => ({ ...q, groupTitle: s.title }))
        )
      : [])

  // Only validate required fields, including dependency logic
  const missingRequired = questions.filter(q => {
    if (q.dependsOn && answers[q.dependsOn] !== q.showIfValue) return false
    return q.required && !isFieldFilled(q, answers[q.id])
  })

  // Project name for header
  const projectTitle =
    answers['project_title'] ||
    answers['projectName'] ||
    answers['project_name']

  function handleAnswer(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setShowWarning(false)
  }

  function handleNext() {
    if (missingRequired.length > 0) {
      setShowWarning(true)
      return
    }
    if (step < sections.length - 1) setStep(step + 1)
    setShowWarning(false)
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
    setShowWarning(false)
  }

  // ----- THE KEY NEW SUBMIT FUNCTION -----
  async function handleSubmit() {
    if (missingRequired.length > 0) {
      setShowWarning(true)
      return
    }
    setLoading(true)
    setSubmitError(null)
    try {
      // Map answers to backend shape
      const apiPayload = mapWizardAnswersToApi(answers)
      // Call backend
      const res = await fetch('http://localhost:8000/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })
      if (!res.ok) throw new Error(await res.text())
      const analysis = await res.json()
      // Save result in sessionStorage for result page
      window.sessionStorage.setItem('analysisResult', JSON.stringify(analysis))
      // Redirect to result page
      router.push('/describe/result')
    } catch (err: any) {
      setSubmitError('Submission failed: ' + (err?.message || 'unknown error'))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      {/* Stepper/tabs: centered, no underline */}
      <div className="flex flex-col items-center mb-2">
        <ProgressBar
          currentStep={step}
          totalSteps={sections.length}
          labels={sections.map((s) => s.stepLabel)}
          noUnderline
        />
        {projectTitle && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold text-base shadow-sm text-center max-w-md truncate">
            {projectTitle}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">
          Step {step + 1} of {sections.length}
        </div>
      </div>

      <SectionCard
        section={section}
        answers={answers}
        onAnswer={handleAnswer}
        showWarning={showWarning}
      />

      {showWarning && (
        <div className="text-red-600 text-sm mt-3 mb-2 text-center">
          Please complete all required fields before continuing.
        </div>
      )}
      {submitError && (
        <div className="text-red-700 text-sm mt-2 text-center">{submitError}</div>
      )}
      {loading && (
        <div className="text-blue-500 text-sm mt-2 text-center">Submitting...</div>
      )}

      <div className="flex gap-4 mt-8 justify-center">
        <button
          onClick={handleBack}
          disabled={step === 0 || loading}
          className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
          type="button"
        >
          Back
        </button>
        {step < sections.length - 1 ? (
          <button
            onClick={handleNext}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${missingRequired.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
            type="button"
            disabled={missingRequired.length > 0 || loading}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className={`bg-green-600 text-white px-4 py-2 rounded ${missingRequired.length > 0 || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            type="button"
            disabled={missingRequired.length > 0 || loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  )
}
