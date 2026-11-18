/**
 * A small confirmation modal, used before cancelling a booking or deleting a
 * session or post.
 */
function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    busy = false,
    error = null,
    onConfirm,
    onClose,
}) {
    if (!open) return null

    return <div className="modal modal-open" role="dialog" aria-modal="true">
        <div className="modal-box">
            <h3 className="text-lg font-bold">{title}</h3>
            {message && <p className="mt-2 text-sm opacity-70">{message}</p>}
            {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}

            <div className="modal-action">
                <button onClick={onClose} className="btn btn-ghost" disabled={busy}>
                    {cancelLabel}
                </button>
                <button
                    onClick={onConfirm}
                    className={`btn ${danger ? "btn-error" : "btn-primary"}`}
                    disabled={busy}>
                    {busy ? <span className="loading loading-spinner loading-sm"></span> : confirmLabel}
                </button>
            </div>
        </div>
        <div className="modal-backdrop" onClick={() => busy || onClose()}></div>
    </div>
}

export default ConfirmDialog
