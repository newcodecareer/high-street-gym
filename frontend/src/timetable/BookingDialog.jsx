import { useMemo, useState } from "react"
import { fetchAPI } from "../api.mjs"
import { formatDate, formatTime } from "../common/format.mjs"

/**
 * Booking modal. Owns the trainer choice and the request, so the timetable
 * only has to decide which class was selected.
 */
function BookingDialog({ detail, sessions, authenticationKey, onClose, onBooked }) {
    const [chosenSessionId, setChosenSessionId] = useState(detail.session.id)
    const [booking, setBooking] = useState(false)
    const [bookingError, setBookingError] = useState(null)

    // Other trainers running the same activity at the same time.
    const trainerOptions = useMemo(() => sessions
        .filter(option =>
            option.session.activityId == detail.session.activityId
            && option.session.date == detail.session.date
            && option.session.startTime == detail.session.startTime
        )
        .sort((a, b) => `${a.trainer.firstName} ${a.trainer.lastName}`
            .localeCompare(`${b.trainer.firstName} ${b.trainer.lastName}`)),
        [detail, sessions])

    const close = () => {
        if (!booking) onClose()
    }

    const confirm = () => {
        setBooking(true)
        setBookingError(null)

        fetchAPI("POST", "/bookings", { sessionId: chosenSessionId }, authenticationKey)
            .then(response => {
                if (response.status < 300) {
                    onBooked(detail.activity.name)
                } else {
                    setBookingError(response.body.message)
                }
            })
            .catch(error => {
                setBookingError(String(error))
            })
            .finally(() => {
                setBooking(false)
            })
    }

    return <div className="modal modal-open" role="dialog" aria-modal="true">
        <div className="modal-box">
            <h3 className="text-lg font-bold">Book {detail.activity.name}</h3>
            <p className="mt-1 text-sm opacity-70">
                {formatDate(detail.session.date, { weekday: "long", day: "numeric", month: "long" })}
                {" · "}
                {formatTime(detail.session.startTime)}–{formatTime(detail.session.endTime)}
            </p>

            <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-semibold">Choose a trainer</legend>

                <div className="space-y-2">
                    {trainerOptions.map(option => {
                        const spotsLeft = Math.max(option.session.capacity - option.bookedCount, 0)

                        return <label
                            key={option.session.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                                chosenSessionId == option.session.id
                                    ? "border-primary bg-primary/10"
                                    : "border-base-300"
                            }`}>
                            <input
                                type="radio"
                                name="sessionId"
                                className="radio radio-primary radio-sm"
                                checked={chosenSessionId == option.session.id}
                                onChange={() => setChosenSessionId(option.session.id)} />

                            <span className="text-sm">
                                <span className="block font-semibold">
                                    {option.trainer.firstName} {option.trainer.lastName}
                                </span>
                                <span className="block text-xs opacity-60">
                                    {option.location.name} &middot; {spotsLeft} spot{spotsLeft == 1 ? "" : "s"} left
                                </span>
                            </span>
                        </label>
                    })}
                </div>
            </fieldset>

            {bookingError && <div className="alert alert-error mt-4 text-sm">{bookingError}</div>}

            <div className="modal-action">
                <button onClick={close} className="btn btn-ghost" disabled={booking}>
                    Cancel
                </button>
                <button onClick={confirm} className="btn btn-primary" disabled={booking}>
                    {booking
                        ? <span className="loading loading-spinner loading-sm"></span>
                        : "Confirm booking"}
                </button>
            </div>
        </div>
        <div className="modal-backdrop" onClick={close}></div>
    </div>
}

export default BookingDialog
