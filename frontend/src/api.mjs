export const API_BASE_URL = "http://localhost:8080/api"

/**
 * Call the JSON API.
 * @param {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string} method
 * @param {string} route - API route starting with /
 * @param {object | null} body - body data object
 * @param {string | null} authKey - optional x-auth-key header
 * @returns {Promise<{status: number, body: any}>}
 */
export async function fetchAPI(method, route, body, authKey) {
    const headers = {
        "Content-Type": "application/json",
    }

    if (authKey) {
        headers["x-auth-key"] = authKey
    }

    try {
        const response = await fetch(API_BASE_URL + route, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        })

        const status = response.status
        // Every API route answers with JSON, but keep a network error from
        // turning into an unhandled parse failure.
        const responseBody = await response.json().catch(() => ({}))

        return {
            status,
            body: responseBody,
        }
    } catch (error) {
        throw String(error)
    }
}
