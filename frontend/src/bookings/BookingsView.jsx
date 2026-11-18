import { useState } from "react"
import { Link } from "react-router"
import { fetchAPI } from "../api.mjs"
import { useAuthenticate } from "../authentication/useAuthenticate"
import ConfirmDialog from "../common/ConfirmDialog.jsx"
import XMLDownloadButton from "../common/XMLDownloadButton.jsx"
import { formatDate, formatTime, hasStarted } from "../common/format.mjs"
import { EmptyState, ErrorAlert, Loading } from "../common/PageState.jsx"
import { useAPI } from "../common/useAPI.mjs"
import BookingCard from "./BookingCard.jsx"

const MEMBER_ROLES = ["member"]

function BookingsView() {
    const { user } = useAuthenticate(MEMBER_ROLES)

    const { data, status, error, reload } = useAPI("/bookings", user?.authenticationKey, Boolean(user))
    const bookings = data ?? []

    const [selected, setSelected] = useState(null)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [cancelError, setCancelError] = useState(null)

    // getByMemberId returns oldest first; show the soonest class first, and
    // the most recent finished class first.
    const upcoming = bookings.filter(item => !hasStarted(item.session))
    const past = bookings.filter(item => hasStarted(item.session)).reverse()

    const askCancel = booking => {
        setSelected(booking)
        setCancelError(null)
        setCancelOpen(true)
    }

    const confirmCancel = () => {
        setCancelling(true)
        setCancelError(null)

        fetchAPI("DELETE", `/bookings/${selected.booking.id}`, null, user.authenticationKey)
            .then(response => {
                if (response.status < 300) {
                    setCancelOpen(false)
                    setSelected(null)
                    reload()
                } else {
                    setCancelError(response.body.message)
                }
            })
            .catch(error => {
                setCancelError(String(error))
            })
            .finally(() => {
                setCancelling(false)
            })
    }

    // Wait for the authentication key before showing actions that need it.
    if (!user) return <Loading />

    return <section className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">My bookings</h1>
                <p className="mt-1 text-sm opacity-60">Every class you have booked.</p>
            </div>
            <Link to="/" className="btn btn-primary btn-sm">Book a class</Link>
        </div>

        {user && <XMLDownloadButton
            route="/bookings/xml"
            filename="high-street-gym-bookings.xml"
            authenticationKey={user.authenticationKey}
            className="btn btn-outline btn-sm self-start">
            Export all as XML
        </XMLDownloadButton>}

        <ErrorAlert message={error} />

        {status == "loading" && bookings.length == 0 && <Loading />}

        {status != "loading" && bookings.length == 0 && <EmptyState
            title="No bookings yet"
            message="Browse the timetable and book your first class."
            action={<Link to="/" className="btn btn-primary btn-sm">View timetable</Link>} />}

        {upcoming.length > 0 && <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide opacity-50">Upcoming</h2>

            {upcoming.map(item => <BookingCard
                key={item.booking.id}
                item={item}
                onCancel={askCancel} />)}
        </div>}

        {past.length > 0 && <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide opacity-50">Completed</h2>

            {past.map(item => <BookingCard
                key={item.booking.id}
                item={item}
                completed />)}
        </div>}

        <ConfirmDialog
            open={cancelOpen}
            title="Cancel this booking?"
            message={selected
                ? `${selected.activity.name} · ${formatDate(selected.session.date)} ${formatTime(selected.session.startTime)}`
                : ""}
            confirmLabel="Cancel booking"
            cancelLabel="Keep booking"
            danger
            busy={cancelling}
            error={cancelError}
            onConfirm={confirmCancel}
            onClose={() => setCancelOpen(false)} />
    </section>
}

export default BookingsView
