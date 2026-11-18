import { formatDate, formatTime } from "../common/format.mjs"

/**
 * One booking in the member's list. Completed bookings show a status label
 * instead of the cancel action.
 */
function BookingCard({ item, completed = false, onCancel }) {
    const cardClass = completed
        ? "rounded-box border border-base-300 bg-base-100 p-4 opacity-80"
        : "rounded-box border border-base-300 bg-base-100 p-4"

    return <article className={cardClass}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="truncate font-bold">{item.activity.name}</h3>
                <p className="mt-1 text-sm opacity-70">
                    {formatDate(item.session.date, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-sm opacity-70">
                    {formatTime(item.session.startTime)}–{formatTime(item.session.endTime)}
                    {" · "}{item.location.name}
                </p>
                <p className="text-sm opacity-70">
                    with {item.trainer.firstName} {item.trainer.lastName}
                </p>
            </div>

            {completed
                ? <span className="badge badge-ghost badge-sm shrink-0">Completed</span>
                : <button onClick={() => onCancel(item)} className="btn btn-error btn-outline btn-xs shrink-0">
                    Cancel
                </button>}
        </div>
    </article>
}

export default BookingCard
