import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuthenticate } from "./useAuthenticate.jsx"

function LoginView() {
    const navigate = useNavigate()
    const { user, login, status } = useAuthenticate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const busy = ["resuming", "loading", "authenticating"].includes(status)
    const message = status && !["resuming", "loading", "authenticating", "loaded"].includes(status)
        ? status
        : null

    useEffect(() => {
        if (user) {
            navigate("/")
        }
    }, [user, navigate])

    const submit = event => {
        event.preventDefault()
        login(email, password)
    }

    return <section className="flex flex-col gap-5 p-4">
        <div className="mt-4">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm opacity-60">
                Log in to book classes and keep an eye on your week.
            </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
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
                    autoComplete="current-password"
                    required />
            </label>

            {message && <div className="alert alert-error text-sm">{message}</div>}

            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                {busy
                    ? <span className="loading loading-spinner"></span>
                    : "Log in"}
            </button>
        </form>

        <p className="text-center text-sm opacity-70">
            New to High Street Gym?{" "}
            <Link to="/register" className="link link-primary font-semibold">Create an account</Link>
        </p>

        <p className="rounded-box bg-base-200 p-3 text-center text-xs opacity-60">
            Demo member: ava@hsgym.com &middot; password
        </p>

        <p className="text-center text-sm">
            <a href="#" className="link link-primary">Privacy Policy</a>
        </p>
    </section>
}

export default LoginView
