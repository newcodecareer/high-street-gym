import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { fetchAPI } from "../api.mjs"

export const AuthenticationContext = createContext(null)

export function AuthenticationProvider({ children }) {
    // User and status state to be shared via context
    const [user, setUser] = useState(null)
    const [status, setStatus] = useState("resuming")

    // Load the account behind a key and remember the key on the user object,
    // so views can send it when downloading XML.
    const getUser = useCallback(authenticationKey => {
        setStatus("loading")

        return fetchAPI("GET", "/users/self", null, authenticationKey)
            .then(response => {
                if (response.status == 200) {
                    setUser({ ...response.body, authenticationKey })
                    setStatus("loaded")
                } else {
                    localStorage.removeItem("auth-key")
                    setUser(null)
                    setStatus(response.body.message)
                }
            })
            .catch(error => {
                setStatus(String(error))
            })
    }, [])

    // Attempt to reload the user from the auth-key saved in local storage
    useEffect(() => {
        const authenticationKey = localStorage.getItem("auth-key")

        if (authenticationKey) {
            getUser(authenticationKey)
        } else {
            setStatus(null)
        }
    }, [getUser])

    return <AuthenticationContext.Provider value={[user, setUser, status, setStatus, getUser]}>
        {children}
    </AuthenticationContext.Provider>
}

export function useAuthenticate(restrictToRoles = null) {
    const [user, setUser, status, setStatus, getUser] = useContext(AuthenticationContext)

    const login = useCallback((email, password) => {
        setStatus("authenticating")

        return fetchAPI("POST", "/authenticate", { email, password })
            .then(response => {
                if (response.status == 200) {
                    const authenticationKey = response.body.key
                    localStorage.setItem("auth-key", authenticationKey)
                    return getUser(authenticationKey)
                }

                setStatus(response.body.message)
            })
            .catch(error => {
                setStatus(String(error))
            })
    }, [getUser, setStatus])

    const register = useCallback(values => {
        setStatus("registering")

        return fetchAPI("POST", "/users", values)
            .then(response => {
                if (response.status == 201) {
                    // Registration signs the new member straight in.
                    return login(values.email, values.password)
                }

                setStatus(response.body.message)
            })
            .catch(error => {
                setStatus(String(error))
            })
    }, [login, setStatus])

    const logout = useCallback(() => {
        const authenticationKey = localStorage.getItem("auth-key")

        localStorage.removeItem("auth-key")
        setUser(null)
        setStatus(null)

        if (authenticationKey) {
            // The local state is already cleared; a failed call is harmless.
            fetchAPI("DELETE", "/authenticate", null, authenticationKey).catch(() => { })
        }
    }, [setUser, setStatus])

    // Reload the signed-in account after the profile has been edited.
    const refresh = useCallback(() => {
        const authenticationKey = localStorage.getItem("auth-key")

        if (authenticationKey) {
            return getUser(authenticationKey)
        }
    }, [getUser])

    const navigate = useNavigate()

    useEffect(() => {
        if (restrictToRoles
            && status != "resuming"
            && status != "loading"
            && (!user || !restrictToRoles.includes(user.role))) {
            navigate("/")
        }
    }, [user, status, restrictToRoles, navigate])

    return {
        user,
        login,
        register,
        logout,
        refresh,
        status,
    }
}
