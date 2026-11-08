import type { UseDateRangePickerReturn } from './useDateRangePicker'

interface CalendarModalsProps {
  hook: UseDateRangePickerReturn
  startDate?: Date
  onChange: (startDate: Date | null, endDate: Date | null) => void
}

export function CalendarModals({ hook, startDate, onChange }: CalendarModalsProps) {
  const {
    t,
    getDateLocale,
    showResetConfirm,
    setShowResetConfirm,
    showExtendConfirm,
    setShowExtendConfirm,
    pendingExtendDate,
    setPendingExtendDate,
    handleReset,
  } = hook

  return (
    <>
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowResetConfirm(false)}
          />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl border border-border p-6 w-80">
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t('shifts.resetRange', { defaultValue: 'Réinitialiser la plage ?' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('shifts.resetRangeConfirm', { defaultValue: 'Cela supprimera toutes les dates sélectionnées et les exclusions.' })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Annuler' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReset()
                  setShowResetConfirm(false)
                }}
                className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('common.confirm', { defaultValue: 'Confirmer' })}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Extend Range Confirmation Modal */}
      {showExtendConfirm && pendingExtendDate && startDate && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => {
              setShowExtendConfirm(false)
              setPendingExtendDate(null)
            }}
          />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl border border-border p-6 w-80">
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t('shifts.extendRange', { defaultValue: 'Étendre la plage ?' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('shifts.extendRangeConfirm', {
                defaultValue: 'Voulez-vous étendre la plage jusqu\'au {{date}} ?',
                date: pendingExtendDate.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'long' })
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowExtendConfirm(false)
                  setPendingExtendDate(null)
                }}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Annuler' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(startDate, pendingExtendDate)
                  setShowExtendConfirm(false)
                  setPendingExtendDate(null)
                }}
                className="flex-1 px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                {t('common.confirm', { defaultValue: 'Étendre' })}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
