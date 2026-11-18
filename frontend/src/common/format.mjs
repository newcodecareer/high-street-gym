/**
 * Date and time helpers shared by the timetable, bookings and trainer views.
 * Session dates are "YYYY-MM-DD" and times are "HH:MM:SS", so text comparison
 * is enough to tell whether a session has started.
 */

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD"
 */
export function toDateString(date) {
    const pad = number => String(number).padStart(2, "0")

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * The current local time in the same format MySQL uses.
 * @returns {string} "YYYY-MM-DD HH:MM:SS"
 */
export function nowString() {
    const now = new Date()
    const pad = number => String(number).padStart(2, "0")

    return `${toDateString(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * @param {{date: string, startTime: string}} session
 * @returns {boolean}
 */
export function hasStarted(session) {
    return `${session.date} ${session.startTime}` <= nowString()
}

/**
 * Trim a MySQL time to minutes.
 * @param {string} time
 * @returns {string} "HH:MM"
 */
export function formatTime(time) {
    return (time || "").slice(0, 5)
}

/**
 * @param {string} date "YYYY-MM-DD"
 * @param {object} [options] passed to toLocaleDateString
 * @returns {string}
 */
export function formatDate(date, options = { weekday: "short", day: "numeric", month: "short" }) {
    const [year, month, day] = date.split("-").map(Number)

    return new Date(year, month - 1, day).toLocaleDateString("en-au", options)
}

/**
 * The seven days of the week beginning on `start`.
 * @param {string | null} start "YYYY-MM-DD", a Monday
 * @returns {Array<{date: string, name: string, short: string}>}
 */
export function weekDays(start) {
    if (!start) return []

    const [year, month, day] = start.split("-").map(Number)
    const days = []

    for (let offset = 0; offset < 7; offset++) {
        const date = new Date(year, month - 1, day + offset)
        days.push({
            date: toDateString(date),
            name: date.toLocaleDateString("en-au", { weekday: "long" }),
            short: date.toLocaleDateString("en-au", { weekday: "short" }),
        })
    }

    return days
}

/**
 * @param {string} date "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isToday(date) {
    return date == toDateString(new Date())
}

/**
 * @param {number} days from today
 * @returns {string} "YYYY-MM-DD"
 */
export function dateFromToday(days) {
    const date = new Date()
    date.setDate(date.getDate() + days)

    return toDateString(date)
}
