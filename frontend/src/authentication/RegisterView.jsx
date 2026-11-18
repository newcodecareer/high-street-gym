import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuthenticate } from "./useAuthenticate.jsx"

function RegisterView() {
    const navigate = useNavigate()
    const { user, register, status } = useAuthenticate()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const busy = ["resuming", "loading", "registering", "authenticating"].includes(status)
    const message = status && !["resuming", "loading", "registering", "authenticating", "loaded"].includes(status)
        ? status
        : null

    useEffect(() => {
        if (user) {
            navigate("/")
        }
    }, [user, navigate])

    const submit = event => {
        event.preventDefault()
        register({ firstName, lastName, email, password })
    }

    return <section className="flex flex-col gap-5 p-4">
        <div className="mt-4">
            <h1 className="text-2xl font-bold">Become a member</h1>
            <p className="mt-1 text-sm opacity-60">
                Create a free account to book classes and join the blog.
            </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
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
            </div>

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

            <label className="input w-full">
                <span className="label">Password</span>
                <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type="password"
                    className="grow"
                    minLength="8"
                    maxLength="72"
                    autoComplete="new-password"
                    required />
            </label>

            {message && <div className="alert alert-error text-sm">{message}</div>}

            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                {busy
                    ? <span className="loading loading-spinner"></span>
                    : "Create account"}
            </button>
        </form>

        <p className="text-center text-sm opacity-70">
            Already a member?{" "}
            <Link to="/login" className="link link-primary font-semibold">Log in</Link>
        </p>
    </section>
}

export default RegisterView
