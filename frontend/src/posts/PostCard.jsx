/**
 * One post in the community feed, with a delete button when the viewer is
 * allowed to remove it.
 */
function PostCard({ item, canDelete, onDelete }) {
    return <article className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="font-bold">{item.post.subject}</h2>
                <p className="mt-1 text-xs opacity-60">
                    {item.author.firstName} {item.author.lastName}
                    {" · "}{item.post.createdAt.slice(0, 16)}
                </p>
            </div>

            {canDelete && <button
                onClick={() => onDelete(item)}
                className="btn btn-ghost btn-xs shrink-0 text-error">
                Delete
            </button>}
        </div>

        <p className="mt-3 whitespace-pre-line text-sm">{item.post.body}</p>
    </article>
}

export default PostCard
