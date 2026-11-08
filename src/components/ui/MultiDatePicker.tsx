import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface MultiDatePickerProps {
    selectedDates: Date[];
    onChange: (dates: Date[]) => void;
    maxDates?: number;
}

export function MultiDatePicker({ selectedDates, onChange, maxDates = 7 }: MultiDatePickerProps) {
    const { t, i18n } = useTranslation();
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const previousMonth = () => {
        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
        const dateKey = date.toISOString().split('T')[0];
        const isSelected = selectedDates.some(d => d.toISOString().split('T')[0] === dateKey);

        if (isSelected) {
            onChange(selectedDates.filter(d => d.toISOString().split('T')[0] !== dateKey));
        } else {
            if (selectedDates.length >= maxDates) {
                toast.error(t('shifts.maxDaysError', { defaultValue: `Maximum ${maxDates} jours` }));
                return;
            }
            onChange([...selectedDates, date].sort((a, b) => a.getTime() - b.getTime()));
        }
    };

    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const dayNames = i18n.language === 'fr'
        ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={previousMonth}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-sm">
                    {calendarMonth.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                        {day}
                    </div>
                ))}
                {days.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} />;
                    }

                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const dateKey = date.toISOString().split('T')[0];
                    const isSelected = selectedDates.some(d => d.toISOString().split('T')[0] === dateKey);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isToday = dateKey === new Date().toISOString().split('T')[0];

                    return (
                        <button
                            key={day}
                            type="button"
                            disabled={isPast}
                            onClick={() => handleDateClick(day)}
                            className={`aspect-square rounded-md text-sm font-medium transition-colors ${isPast
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                    : isSelected
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : isToday
                                            ? 'border-2 border-primary text-primary hover:bg-primary/10'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                                }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
