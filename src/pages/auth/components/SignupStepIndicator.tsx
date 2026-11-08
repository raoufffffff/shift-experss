import { Check } from 'lucide-react'

interface SignupStepIndicatorProps {
  currentStep: number
}

export function SignupStepIndicator({ currentStep }: SignupStepIndicatorProps) {
  const dot = (n: number) => (
    <div
      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
        currentStep >= n ? 'bg-se-blue text-white' : 'bg-se-surface-2 text-se-muted border border-se-line'
      }`}
    >
      {currentStep > n ? <Check className="w-3.5 h-3.5" /> : n}
    </div>
  )
  const bar = (n: number) => <div className={`h-0.5 w-8 rounded ${currentStep >= n ? 'bg-se-blue' : 'bg-se-line'}`} />
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {dot(1)}
      {bar(2)}
      {dot(2)}
      {bar(3)}
      {dot(3)}
    </div>
  )
}
