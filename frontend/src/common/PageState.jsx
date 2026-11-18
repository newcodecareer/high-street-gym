/**
 * Messages for loading, errors and empty lists, so every screen matches.
 */

export function Loading() {
    return <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-xl"></span>
    </div>
}

export function ErrorAlert({ message }) {
    if (!message) return null

    return <div className="alert alert-error mx-4 mt-4 text-sm">{message}</div>
}

export function EmptyState({ title, message, action }) {
    return <div className="rounded-box border border-base-300 bg-base-100 px-6 py-12 text-center">
        <p className="font-semibold">{title}</p>
        {message && <p className="mt-1 text-sm opacity-60">{message}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
}
