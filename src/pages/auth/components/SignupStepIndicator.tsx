import { Check } from 'lucide-react'

interface SignupStepIndicatorProps {
  currentStep: number
}

export function SignupStepIndicator({ currentStep }: SignupStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'} font-semibold text-sm`}>
        {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
      </div>
      <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'} font-semibold text-sm`}>
        {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
      </div>
      <div className={`h-0.5 w-8 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'} font-semibold text-sm`}>
        3
      </div>
    </div>
  )
}
