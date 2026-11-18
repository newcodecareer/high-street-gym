import { useMemo, useState } from "react"
import { fetchAPI } from "../api.mjs"
import { useAuthenticate } from "../authentication/useAuthenticate"
import ConfirmDialog from "../common/ConfirmDialog.jsx"
import XMLDownloadButton from "../common/XMLDownloadButton.jsx"
import { formatDate, formatTime, hasStarted } from "../common/format.mjs"
import { EmptyState, ErrorAlert, Loading } from "../common/PageState.jsx"
import { useAPI } from "../common/useAPI.mjs"
import SessionFormDialog from "./SessionFormDialog.jsx"

const TRAINER_ROLES = ["trainer"]

function TrainerSessionsView() {
    const { user } = useAuthenticate(TRAINER_ROLES)

    // One hook per resource; only the session list changes after an edit.
    const sessionList = useAPI("/sessions/mine", user?.authenticationKey, Boolean(user))
    const activityList = useAPI("/activities", user?.authenticationKey, Boolean(user))
    const locationList = useAPI("/locations", user?.authenticationKey, Boolean(user))

    const sessions = useMemo(() => sessionList.data ?? [], [sessionList.data])
    const activities = useMemo(() => activityList.data ?? [], [activityList.data])
    const locations = useMemo(() => locationList.data ?? [], [locationList.data])

    const resources = [sessionList, activityList, locationList]
    const failed = resources.find(resource => resource.status == "error")
    const status = resources.some(resource => resource.status == "loading")
        ? "loading"
        : failed ? "error" : "loaded"
    const error = failed?.error ?? null

    const reloadSessions = sessionList.reload

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState(null)

    const [selected, setSelected] = useState(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)

    // Sessions are already oldest first, so grouping keeps the same order.
    const dayGroups = useMemo(() => {
        const grouped = new Map()

        for (const detail of sessions) {
            const date = detail.session.date

            if (!grouped.has(date)) {
                grouped.set(date, [])
            }

            grouped.get(date).push(detail)
        }

        return [...grouped.entries()]
    }, [sessions])

    const openEdit = detail => {
        setEditing(detail)
        setFormOpen(true)
    }

    const handleSaved = () => {
        setFormOpen(false)
        reloadSessions()
    }

    const askDelete = detail => {
        setSelected(detail)
        setDeleteError(null)
        setDeleteOpen(true)
    }

    const confirmDelete = () => {
        setDeleting(true)
        setDeleteError(null)

        fetchAPI("DELETE", `/sessions/${selected.session.id}`, null, user.authenticationKey)
            .then(response => {
                if (response.status < 300) {
                    setDeleteOpen(false)
                    setSelected(null)
                    reloadSessions()
                } else {
                    setDeleteError(response.body.message)
                }
            })
            .catch(error => {
                setDeleteError(String(error))
            })
            .finally(() => {
                setDeleting(false)
            })
    }

    // Wait for the authentication key before showing actions that need it.
    if (!user) return <Loading />

    return <section className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">My sessions</h1>
                <p className="mt-1 text-sm opacity-60">Manage the classes you lead.</p>
            </div>
        </div>

        {user && <XMLDownloadButton
            route="/sessions/xml"
            filename="high-street-gym-sessions.xml"
            authenticationKey={user.authenticationKey}
            className="btn btn-outline btn-sm self-start">
            Export this week as XML
        </XMLDownloadButton>}

        <ErrorAlert message={error} />

        {status == "loading" && sessions.length == 0 && <Loading />}

        {status != "loading" && sessions.length == 0 && <EmptyState
            title="No sessions yet"
            message="Sessions you lead will appear here." />}

        {dayGroups.map(([date, daySessions]) => <div key={date} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wide opacity-50">
                {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
            </h2>

            {daySessions.map(detail => <article
                key={detail.session.id}
                className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate font-bold">{detail.activity.name}</h3>
                        <p className="mt-1 text-sm opacity-70">
                            {formatTime(detail.session.startTime)}–{formatTime(detail.session.endTime)}
                            {" · "}{detail.location.name}
                        </p>
                        <p className="text-xs opacity-60">Capacity {detail.session.capacity}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        {hasStarted(detail.session)
                            ? <span className="badge badge-ghost badge-sm">Started</span>
                            : <button onClick={() => openEdit(detail)} className="btn btn-ghost btn-xs">
                                Edit
                            </button>}
                        <button onClick={() => askDelete(detail)} className="btn btn-ghost btn-xs text-error">
                            Delete
                        </button>
                    </div>
                </div>
            </article>)}
        </div>)}

        {formOpen && <SessionFormDialog
            detail={editing}
            activities={activities}
            locations={locations}
            authenticationKey={user.authenticationKey}
            onClose={() => setFormOpen(false)}
            onSaved={handleSaved} />}

        <ConfirmDialog
            open={deleteOpen}
            title="Delete this session?"
            message={selected
                ? `${selected.activity.name} · ${formatDate(selected.session.date)} ${formatTime(selected.session.startTime)}`
                : ""}
            confirmLabel="Delete session"
            cancelLabel="Keep session"
            danger
            busy={deleting}
            error={deleteError}
            onConfirm={confirmDelete}
            onClose={() => setDeleteOpen(false)} />
    </section>
}

export default TrainerSessionsView
