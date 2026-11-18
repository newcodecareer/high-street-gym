import { useState } from "react"
import { fetchAPI } from "../api.mjs"
import { dateFromToday, formatTime } from "../common/format.mjs"

/**
 * The form shown when creating a session, or editing the one passed in.
 * It owns the fields and the request; the list only says when it is open.
 */
function SessionFormDialog({ detail, activities, locations, authenticationKey, onClose, onSaved }) {
    const editing = Boolean(detail)

    const [form, setForm] = useState(() => editing
        ? {
            activityId: detail.session.activityId,
            locationId: detail.session.locationId,
            date: detail.session.date,
            startTime: formatTime(detail.session.startTime),
            endTime: formatTime(detail.session.endTime),
            capacity: detail.session.capacity,
        }
        : {
            activityId: activities[0]?.id ?? "",
            locationId: locations[0]?.id ?? "",
            date: dateFromToday(1),
            startTime: "07:00",
            endTime: "08:00",
            capacity: 20,
        })
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)

    const updateField = (field, value) => {
        setForm(current => ({
            ...current,
            [field]: value,
        }))
    }

    const close = () => {
        if (!saving) onClose()
    }

    const submit = event => {
        event.preventDefault()
        setSaving(true)
        setError(null)

        const body = {
            activityId: Number(form.activityId),
            locationId: Number(form.locationId),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            capacity: Number(form.capacity),
        }

        const route = editing ? `/sessions/${detail.session.id}` : "/sessions"
        const method = editing ? "PUT" : "POST"

        fetchAPI(method, route, body, authenticationKey)
            .then(response => {
                if (response.status < 300) {
                    onSaved()
                } else {
                    setError(response.body.message)
                }
            })
            .catch(error => {
                setError(String(error))
            })
            .finally(() => {
                setSaving(false)
            })
    }

    return <div className="modal modal-open" role="dialog" aria-modal="true">
        <div className="modal-box max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">
                {editing ? "Edit session" : "New session"}
            </h3>

            <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
                <label className="select w-full">
                    <span className="label">Activity</span>
                    <select
                        value={form.activityId}
                        onChange={event => updateField("activityId", event.target.value)}
                        required>
                        {activities.map(activity => <option key={activity.id} value={activity.id}>
                            {activity.name}
                        </option>)}
                    </select>
                </label>

                <label className="select w-full">
                    <span className="label">Location</span>
                    <select
                        value={form.locationId}
                        onChange={event => updateField("locationId", event.target.value)}
                        required>
                        {locations.map(location => <option key={location.id} value={location.id}>
                            {location.name}
                        </option>)}
                    </select>
                </label>

                <label className="input w-full">
                    <span className="label">Date</span>
                    <input
                        type="date"
                        className="grow"
                        value={form.date}
                        min={dateFromToday(0)}
                        onChange={event => updateField("date", event.target.value)}
                        required />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="input w-full">
                        <span className="label">Start</span>
                        <input
                            type="time"
                            className="grow"
                            value={form.startTime}
                            onChange={event => updateField("startTime", event.target.value)}
                            required />
                    </label>

                    <label className="input w-full">
                        <span className="label">End</span>
                        <input
                            type="time"
                            className="grow"
                            value={form.endTime}
                            onChange={event => updateField("endTime", event.target.value)}
                            required />
                    </label>
                </div>

                <label className="input w-full">
                    <span className="label">Capacity</span>
                    <input
                        type="number"
                        className="grow"
                        value={form.capacity}
                        min="1"
                        max="500"
                        onChange={event => updateField("capacity", event.target.value)}
                        required />
                </label>

                {error && <div className="alert alert-error text-sm">{error}</div>}

                <div className="modal-action">
                    <button
                        type="button"
                        onClick={close}
                        className="btn btn-ghost"
                        disabled={saving}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving
                            ? <span className="loading loading-spinner loading-sm"></span>
                            : editing ? "Save changes" : "Create session"}
                    </button>
                </div>
            </form>
        </div>
        <div className="modal-backdrop" onClick={close}></div>
    </div>
}

export default SessionFormDialog
