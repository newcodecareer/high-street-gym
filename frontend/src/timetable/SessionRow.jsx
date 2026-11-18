import { formatTime, hasStarted } from "../common/format.mjs"

/**
 * One class in the timetable, with the action the current user can take.
 */
function SessionRow({ detail, user, onBook }) {
    const renderAction = () => {
        if (hasStarted(detail.session)) {
            return <span className="badge badge-ghost badge-sm">Ended</span>
        }

        if (!user) {
            return <button onClick={() => onBook(detail)} className="btn btn-primary btn-xs">
                Book
            </button>
        }

        if (user.role != "member") return null

        if (detail.booked) {
            return <span className="badge badge-success badge-sm">Booked</span>
        }

        if (detail.bookedCount >= detail.session.capacity) {
            return <span className="badge badge-warning badge-sm">Full</span>
        }

        return <button onClick={() => onBook(detail)} className="btn btn-primary btn-xs">
            Book
        </button>
    }

    return <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 shrink-0 text-xs font-semibold tabular-nums opacity-70">
            {formatTime(detail.session.startTime)}
        </div>

        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{detail.activity.name}</p>
            <p className="truncate text-xs opacity-60">
                {detail.location.name} &middot; {detail.trainer.firstName} {detail.trainer.lastName}
            </p>
        </div>

        <div className="shrink-0">{renderAction()}</div>
    </div>
}

export default SessionRow
