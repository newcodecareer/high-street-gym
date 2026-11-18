import { isToday } from "../common/format.mjs"
import SessionRow from "./SessionRow.jsx"

/**
 * A single day card in the timetable, listing that day's classes.
 */
function DaySection({ day, sessions, user, onBook }) {
    return <section className="overflow-hidden rounded-box border border-base-300">
        <div className="flex items-center justify-between border-b border-base-300 bg-base-200 px-4 py-2">
            <div>
                <h2 className="text-sm font-bold">{day.name}</h2>
                <p className="text-xs opacity-60">{day.date}</p>
            </div>
            {isToday(day.date) && <span className="badge badge-primary badge-sm">Today</span>}
        </div>

        <div className="divide-y divide-base-200">
            {sessions.length == 0 && <p className="py-6 text-center text-xs opacity-50">
                No classes
            </p>}

            {sessions.map(detail => <SessionRow
                key={detail.session.id}
                detail={detail}
                user={user}
                onBook={onBook} />)}
        </div>
    </section>
}

export default DaySection
