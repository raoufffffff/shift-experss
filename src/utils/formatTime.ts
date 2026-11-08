/**
 * Format a datetime string as local time
 * @param datetime - ISO datetime string (e.g., "2025-01-10T20:00:00.000Z")
 * @param use12Hour - Whether to use 12-hour format (default: false)
 * @returns Formatted time string (e.g., "8:00 PM" or "22:00")
 */
export function formatTimeUTC(datetime: string, use12Hour: boolean = false): string {
  const date = new Date(datetime)

  const hours = date.getHours()
  const minutes = date.getMinutes()

  if (use12Hour) {
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const minutesStr = minutes.toString().padStart(2, '0')
    return `${displayHours}:${minutesStr} ${period}`
  } else {
    const hoursStr = hours.toString().padStart(2, '0')
    const minutesStr = minutes.toString().padStart(2, '0')
    return `${hoursStr}:${minutesStr}`
  }
}
