import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { fetchAPI } from "../api.mjs"
import { useAuthenticate } from "../authentication/useAuthenticate"
import { ErrorAlert, Loading } from "../common/PageState.jsx"

const POSTING_ROLES = ["member", "trainer"]

function CreatePostView() {
    const navigate = useNavigate()
    const { user } = useAuthenticate(POSTING_ROLES)

    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const submit = event => {
        event.preventDefault()
        setSaving(true)
        setError(null)

        fetchAPI("POST", "/posts", { subject, body }, user.authenticationKey)
            .then(response => {
                if (response.status == 201) {
                    navigate("/blog")
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

    // Wait for the authentication key before showing the form.
    if (!user) return <Loading />

    return <section className="flex flex-col gap-4 p-4">
        <div className="mt-4">
            <h1 className="text-2xl font-bold">New post</h1>
            <p className="mt-1 text-sm opacity-60">Share a win, a class note or a question.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="input w-full">
                <span className="label">Subject</span>
                <input
                    value={subject}
                    onChange={event => setSubject(event.target.value)}
                    type="text"
                    className="grow"
                    maxLength="120"
                    required />
            </label>

            <label className="textarea w-full">
                <span className="label">Body</span>
                <textarea
                    value={body}
                    onChange={event => setBody(event.target.value)}
                    className="min-h-48 grow"
                    maxLength="1000"
                    required></textarea>
            </label>

            <p className="-mt-2 text-right text-xs opacity-50">{body.length} / 1000</p>

            <ErrorAlert message={error} />

            <div className="flex gap-3">
                <Link to="/blog" className="btn btn-outline flex-1">Cancel</Link>
                <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                    {saving
                        ? <span className="loading loading-spinner loading-sm"></span>
                        : "Publish"}
                </button>
            </div>
        </form>
    </section>
}

export default CreatePostView
