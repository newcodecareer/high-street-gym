import { useState } from "react"
import { Link } from "react-router"
import { fetchAPI } from "../api.mjs"
import { useAuthenticate } from "../authentication/useAuthenticate"
import ConfirmDialog from "../common/ConfirmDialog.jsx"
import { EmptyState, ErrorAlert, Loading } from "../common/PageState.jsx"
import { useAPI } from "../common/useAPI.mjs"
import PostCard from "./PostCard.jsx"

function PostFeedView() {
    const { user } = useAuthenticate()

    const [search, setSearch] = useState("")
    const [query, setQuery] = useState("")

    const route = query
        ? "/posts?search=" + encodeURIComponent(query)
        : "/posts"

    const { data, status, error, reload } = useAPI(route, user?.authenticationKey)
    const posts = data ?? []

    const [selected, setSelected] = useState(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)

    const submitSearch = event => {
        event.preventDefault()

        if (search == query) {
            reload()
        } else {
            setQuery(search)
        }
    }

    const askDelete = post => {
        setSelected(post)
        setDeleteError(null)
        setDeleteOpen(true)
    }

    const confirmDelete = () => {
        setDeleting(true)
        setDeleteError(null)

        fetchAPI("DELETE", `/posts/${selected.post.id}`, null, user.authenticationKey)
            .then(response => {
                if (response.status < 300) {
                    setDeleteOpen(false)
                    setSelected(null)
                    reload()
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

    const canDelete = item => user && (user.role == "admin" || item.post.memberId == user.id)
    const canPost = user?.role == "member" || user?.role == "trainer"

    return <section className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">Community blog</h1>
                <p className="mt-1 text-sm opacity-60">News, wins and class notes from members and trainers.</p>
            </div>
            {canPost && <Link to="/blog/new" className="btn btn-primary btn-sm shrink-0">
                New post
            </Link>}
        </div>

        <form onSubmit={submitSearch} className="join w-full">
            <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                type="search"
                className="input join-item grow"
                placeholder="Search posts"
                aria-label="Search posts" />
            <button type="submit" className="btn join-item">Search</button>
        </form>

        <ErrorAlert message={error} />

        {status == "loading" && <Loading />}

        {status != "loading" && posts.length == 0 && <EmptyState
            title={query ? "No posts match that search" : "No posts yet"}
            message={query ? "Try a different word." : "Be the first to share something."} />}

        <div className="space-y-3">
            {posts.map(item => <PostCard
                key={item.post.id}
                item={item}
                canDelete={canDelete(item)}
                onDelete={askDelete} />)}
        </div>

        {!user && <p className="text-center text-sm opacity-60">
            <Link to="/login" className="link link-primary font-semibold">Log in</Link>
            {" "}as a member or trainer to join the conversation.
        </p>}

        <ConfirmDialog
            open={deleteOpen}
            title="Delete this post?"
            message={selected ? selected.post.subject : ""}
            confirmLabel="Delete post"
            cancelLabel="Keep post"
            danger
            busy={deleting}
            error={deleteError}
            onConfirm={confirmDelete}
            onClose={() => setDeleteOpen(false)} />
    </section>
}

export default PostFeedView
