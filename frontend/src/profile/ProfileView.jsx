import { useEffect, useState } from "react"
import { fetchAPI } from "../api.mjs"
import { useAuthenticate } from "../authentication/useAuthenticate"
import { Loading } from "../common/PageState.jsx"

const ALL_ROLES = ["member", "trainer", "admin"]

function ProfileView() {
    const { user, refresh } = useAuthenticate(ALL_ROLES)

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [notice, setNotice] = useState(null)

    // Fill the form when the account loads, and again after a successful save.
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName)
            setLastName(user.lastName)
            setEmail(user.email)
        }
    }, [user])

    if (!user) return <Loading />

    const submit = event => {
        event.preventDefault()
        setSaving(true)
        setError(null)
        setNotice(null)

        fetchAPI("PUT", "/users/self", { firstName, lastName, email }, user.authenticationKey)
            .then(response => {
                if (response.status == 200) {
                    setNotice("Profile updated.")
                    return refresh()
                }

                setError(response.body.message)
            })
            .catch(error => {
                setError(String(error))
            })
            .finally(() => {
                setSaving(false)
            })
    }

    return <section className="flex flex-col gap-5 p-4">
        <div className="mt-4 flex items-center gap-4">
            <div className="avatar avatar-placeholder">
                <div className="w-16 rounded-full bg-primary text-primary-content">
                    <span className="text-2xl font-bold">{user.firstName.charAt(0)}</span>
                </div>
            </div>
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold">{user.firstName} {user.lastName}</h1>
                <span className="badge badge-outline badge-sm capitalize">{user.role}</span>
            </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="input w-full">
                <span className="label">First name</span>
                <input
                    value={firstName}
                    onChange={event => setFirstName(event.target.value)}
                    type="text"
                    className="grow"
                    maxLength="80"
                    autoComplete="given-name"
                    required />
            </label>

            <label className="input w-full">
                <span className="label">Last name</span>
                <input
                    value={lastName}
                    onChange={event => setLastName(event.target.value)}
                    type="text"
                    className="grow"
                    maxLength="80"
                    autoComplete="family-name"
                    required />
            </label>

            <label className="input w-full">
                <span className="label">Email</span>
                <input
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    type="email"
                    className="grow"
                    autoComplete="email"
                    required />
            </label>

            {error && <div className="alert alert-error text-sm">{error}</div>}
            {notice && <div className="alert alert-success text-sm">{notice}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                    ? <span className="loading loading-spinner loading-sm"></span>
                    : "Save changes"}
            </button>
        </form>

        <p className="rounded-box bg-base-200 p-3 text-xs opacity-60">
            Your role and password are managed by the gym. Ask the front desk if either needs to change.
        </p>
    </section>
}

export default ProfileView
