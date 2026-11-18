import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useAuthenticate } from "../authentication/useAuthenticate"
import { formatDate, weekDays } from "../common/format.mjs"
import { ErrorAlert, Loading } from "../common/PageState.jsx"
import { useAPI } from "../common/useAPI.mjs"
import BookingDialog from "./BookingDialog.jsx"
import DaySection from "./DaySection.jsx"

function TimetableView() {
    const navigate = useNavigate()
    const { user } = useAuthenticate()

    const { data, status, error, reload } = useAPI("/sessions", user?.authenticationKey)
    const sessions = useMemo(() => data?.sessions ?? [], [data])
    const weekStart = data?.start ?? null

    const [notice, setNotice] = useState(null)
    const [selected, setSelected] = useState(null)

    // Sessions grouped under their day, plus the seven day cards themselves.
    const sessionsByDate = useMemo(() => {
        const grouped = new Map()

        for (const detail of sessions) {
            const date = detail.session.date

            if (!grouped.has(date)) {
                grouped.set(date, [])
            }

            grouped.get(date).push(detail)
        }

        return grouped
    }, [sessions])

    const days = useMemo(() => weekDays(weekStart), [weekStart])

    const openBooking = detail => {
        if (!user) {
            navigate("/login")
            return
        }

        // Only members can book.
        if (user.role != "member") return

        setSelected(detail)
    }

    const handleBooked = activityName => {
        setSelected(null)
        setNotice(`Booked ${activityName}.`)
        reload()
    }

    return <section className="flex flex-col gap-4 p-4">
        <div className="flex items-end justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">Timetable</h1>
                <p className="mt-1 text-sm opacity-60">
                    {weekStart
                        ? `${formatDate(weekStart, { day: "numeric", month: "short" })} – ${formatDate(days[6]?.date ?? weekStart, { day: "numeric", month: "short" })}`
                        : "This week's classes"}
                </p>
            </div>
            <button onClick={reload} className="btn btn-ghost btn-sm" disabled={status == "loading"}>
                Refresh
            </button>
        </div>

        {notice && <div className="alert alert-success text-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="btn btn-ghost btn-xs">Dismiss</button>
        </div>}

        <ErrorAlert message={error} />

        {status == "loading" && sessions.length == 0
            ? <Loading />
            : days.map(day => <DaySection
                key={day.date}
                day={day}
                sessions={sessionsByDate.get(day.date) ?? []}
                user={user}
                onBook={openBooking} />)}

        {selected && <BookingDialog
            detail={selected}
            sessions={sessions}
            authenticationKey={user.authenticationKey}
            onClose={() => setSelected(null)}
            onBooked={handleBooked} />}
    </section>
}

export default TimetableView
