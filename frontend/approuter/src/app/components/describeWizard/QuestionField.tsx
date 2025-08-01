import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectItem, 
  SelectTrigger, 
  SelectContent, 
  SelectValue 
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function QuestionField({
  question,
  value,
  onChange,
  allAnswers,
  showError = false
}: {
  question: any
  value: any
  onChange: (val: any) => void
  allAnswers: Record<string, any>
  showError?: boolean
}) {
  // Show only if not dependent OR if dependency matches
  if (
    question.dependsOn &&
    allAnswers[question.dependsOn] !== question.showIfValue
  ) {
    return null
  }

  const commonErrorMsg = "This field is required."

  // --- Render by type ---
  switch (question.type) {
    case 'textarea': {
      const charCount = value ? value.length : 0
      const minLength = question.minLength || 0
      const tooShort = minLength > 0 && charCount < minLength

      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          {question.helperText && (
            <div className="text-xs text-gray-500 mb-1">{question.helperText}</div>
          )}
          <Textarea
            rows={4}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            minLength={minLength}
            className={(showError || tooShort && value) ? 'border-red-500' : ''}
          />
          {minLength > 0 && (
            <div className={`text-xs mt-1 flex items-center gap-2 ${tooShort && value ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount}/{minLength} characters
              {tooShort && value && (
                <span>— {minLength - charCount} more needed</span>
              )}
            </div>
          )}
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    }
    case 'text':
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <Input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={showError ? 'border-red-500' : ''}
          />
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    case 'number':
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <Input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={showError ? 'border-red-500' : ''}
          />
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    case 'select':
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={`w-full mt-1 ${showError ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    case 'radio':
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <RadioGroup
            className="flex gap-4 mt-1"
            value={value || ''}
            onValueChange={onChange}
          >
            {question.options.map((opt: string) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem value={opt} />
                <Label>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    case 'checkbox':
    case 'checklist':
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <div className={`flex flex-col gap-2 mt-2 ${showError ? 'border border-red-500 rounded px-2 py-1' : ''}`}>
            {question.options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <Checkbox
                  checked={Array.isArray(value) && value.includes(opt)}
                  onCheckedChange={checked => {
                    let newVal = Array.isArray(value) ? [...value] : []
                    if (checked) newVal.push(opt)
                    else newVal = newVal.filter((v: string) => v !== opt)
                    onChange(newVal)
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
          {showError && (!Array.isArray(value) || value.length === 0) && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    case 'multiselect':
      // For simplicity, use checkboxes for multi-select (can upgrade to custom component later)
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <div className={`flex flex-col gap-2 mt-2 ${showError ? 'border border-red-500 rounded px-2 py-1' : ''}`}>
            {question.options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <Checkbox
                  checked={Array.isArray(value) && value.includes(opt)}
                  onCheckedChange={checked => {
                    let newVal = Array.isArray(value) ? [...value] : []
                    if (checked) newVal.push(opt)
                    else newVal = newVal.filter((v: string) => v !== opt)
                    onChange(newVal)
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
          {showError && (!Array.isArray(value) || value.length === 0) && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
    // ...other field types as before
    default:
      return (
        <div>
          <Label className="font-medium">{question.label}</Label>
          <Input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={showError ? 'border-red-500' : ''}
          />
          {showError && (value == null || value === '') && (
            <div className="text-xs text-red-500 mt-1">{commonErrorMsg}</div>
          )}
        </div>
      )
  }
}
