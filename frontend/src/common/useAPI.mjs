import { useCallback, useEffect, useState } from "react"
import { fetchAPI } from "../api.mjs"

/**
 * Load a GET route and track its data, loading and error states.
 *
 * The request starts on mount and again whenever the route, the key or
 * `enabled` changes; `reload` repeats it after a create, update or delete.
 *
 * @param {string} route - API route starting with /
 * @param {string | null | undefined} authenticationKey - optional x-auth-key header
 * @param {boolean} enabled - false holds the request until the caller is ready
 * @returns {{data: any, status: "loading" | "loaded" | "error", error: string | null, reload: () => Promise<void>}}
 */
export function useAPI(route, authenticationKey, enabled = true) {
    const [data, setData] = useState(null)
    const [status, setStatus] = useState("loading")
    const [error, setError] = useState(null)

    const reload = useCallback(() => {
        if (!enabled) return Promise.resolve()

        setStatus("loading")
        setError(null)

        return fetchAPI("GET", route, null, authenticationKey)
            .then(response => {
                if (response.status == 200) {
                    setData(response.body)
                    setStatus("loaded")
                } else {
                    setError(response.body.message)
                    setStatus("error")
                }
            })
            .catch(error => {
                setError(String(error))
                setStatus("error")
            })
    }, [route, authenticationKey, enabled])

    useEffect(() => {
        reload()
    }, [reload])

    return { data, status, error, reload }
}
