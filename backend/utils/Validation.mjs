/**
 * Input validation and sanitising rules.
 *
 * Each rule checks a value and cleans it up (trim, lower case, coerce), so
 * controllers can use the returned values directly.
 *
 *     const { values, errors, isValid } = Validation.run(req.body, {
 *         email: Validation.email(),
 *         password: Validation.password(),
 *     })
 */

/**
 * A rule for one field. Returns `{ value }` when the input is acceptable, and
 * `{ error }` with a message when it is not.
 * @typedef {(raw: unknown) => { value?: any, error?: string }} Rule
 */

export class Validation {

    /** Longest email address accepted, per RFC 5321. */
    static MAX_EMAIL_LENGTH = 254

    /** Shortest password accepted when an account is created or changed. */
    static MIN_PASSWORD_LENGTH = 8

    /** bcrypt only hashes the first 72 bytes. */
    static MAX_PASSWORD_LENGTH = 72

    /** Longest password accepted at login, before it is compared to a hash. */
    static MAX_LOGIN_PASSWORD_LENGTH = 200

    /** Matches the start of an HTML tag, but not a bare "<". */
    static #MARKUP = /<[a-zA-Z!\/]/

    //// Running a schema

    /**
     * Runs every rule in `schema` and returns cleaned values plus one error per
     * field that failed.
     * @param {Record<string, any>} source usually req.body or req.query
     * @param {Record<string, Rule>} schema
     * @returns {{ values: Record<string, any>, errors: Record<string, string>, isValid: boolean }}
     */
    static run(source, schema) {
        const values = {}
        const errors = {}

        for (const [field, rule] of Object.entries(schema)) {
            const { value, error } = rule(source?.[field])

            if (error) {
                errors[field] = error
            } else {
                values[field] = value
            }
        }

        return { values, errors, isValid: Object.keys(errors).length === 0 }
    }

    /**
     * Joins the error messages into one line.
     * @param {Record<string, string>} errors
     * @returns {string}
     */
    static summarise(errors) {
        return Object.values(errors).join(" ")
    }

    //// Field rules

    /**
     * Free text. Trimmed, stripped of control characters, capped at `max`, and
     * rejected if it contains HTML or script markup.
     * @param {string} label used in the error message, e.g. "First name"
     * @param {{ max?: number, required?: boolean }} [options]
     * @returns {Rule}
     */
    static text(label, { max = 255, required = true } = {}) {
        return (raw) => {
            const value = Validation.#asString(raw)
            if (value === null) return { error: `${label} must be text.` }

            const cleaned = Validation.#stripControlCharacters(value).trim()
            if (!cleaned) return required ? { error: `${label} is required.` } : { value: "" }

            // Check the cleaned value, so "<scr\u0000ipt>" cannot slip through.
            if (Validation.#MARKUP.test(cleaned)) {
                return { error: `${label} must not contain HTML or script markup.` }
            }

            if (cleaned.length > max) return { error: `${label} must be ${max} characters or fewer.` }

            return { value: cleaned }
        }
    }

    /**
     * Email address. Trimmed, lower cased and shape checked.
     * @param {string} [label]
     * @returns {Rule}
     */
    static email(label = "Email") {
        return (raw) => {
            const value = Validation.#asString(raw)
            if (value === null) return { error: `${label} must be text.` }

            const normalised = value.trim().toLowerCase()
            if (!normalised) return { error: `${label} is required.` }
            if (normalised.length > Validation.MAX_EMAIL_LENGTH) {
                return { error: `${label} must be ${Validation.MAX_EMAIL_LENGTH} characters or fewer.` }
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) {
                return { error: `${label} must be a valid email address.` }
            }

            return { value: normalised }
        }
    }

    /**
     * Login password. Never trimmed, since spaces can be part of it.
     * @param {string} [label]
     * @returns {Rule}
     */
    static password(label = "Password") {
        return (raw) => {
            const value = Validation.#asString(raw) ?? ""
            if (!value) return { error: `${label} is required.` }
            if (value.length > Validation.MAX_LOGIN_PASSWORD_LENGTH) {
                return { error: `${label} is not valid.` }
            }

            return { value }
        }
    }

    /**
     * Password being set for a new account, or replaced by an admin.
     * @param {string} [label]
     * @param {{ required?: boolean }} [options] false means an empty field keeps
     *        the current password.
     * @returns {Rule}
     */
    static newPassword(label = "Password", { required = true } = {}) {
        return (raw) => {
            const value = Validation.#asString(raw) ?? ""
            if (!value) return required ? { error: `${label} is required.` } : { value: "" }

            if (value.length < Validation.MIN_PASSWORD_LENGTH) {
                return { error: `${label} must be at least ${Validation.MIN_PASSWORD_LENGTH} characters.` }
            }
            if (value.length > Validation.MAX_PASSWORD_LENGTH) {
                return { error: `${label} must be ${Validation.MAX_PASSWORD_LENGTH} characters or fewer.` }
            }

            return { value }
        }
    }

    /**
     * Whole number, optionally within a range.
     * @param {string} label
     * @param {{ min?: number, max?: number, required?: boolean, fallback?: number }} [options]
     *        `fallback` is used when the field is absent or empty.
     * @returns {Rule}
     */
    static integer(label, { min, max, required = true, fallback } = {}) {
        return (raw) => {
            if (raw === undefined || raw === null || raw === "") {
                if (fallback !== undefined) return { value: fallback }
                return required ? { error: `${label} is required.` } : { value: null }
            }

            const value = Number(String(raw).trim())
            if (!Number.isInteger(value)) return { error: `${label} must be a whole number.` }
            if (min !== undefined && value < min) return { error: `${label} must be ${min} or more.` }
            if (max !== undefined && value > max) return { error: `${label} must be ${max} or less.` }

            return { value }
        }
    }

    /**
     * A value from a fixed list, used for roles and form actions.
     * @param {string} label
     * @param {Array<string>} allowed
     * @param {{ fallback?: string }} [options]
     * @returns {Rule}
     */
    static choice(label, allowed, { fallback } = {}) {
        return (raw) => {
            const value = (Validation.#asString(raw) ?? "").trim().toLowerCase()
            if (allowed.includes(value)) return { value }
            if (fallback !== undefined) return { value: fallback }

            return { error: `${label} must be one of: ${allowed.join(", ")}.` }
        }
    }

    /**
     * A calendar date in the "YYYY-MM-DD" format an <input type="date"> submits.
     * @param {string} [label]
     * @returns {Rule}
     */
    static date(label = "Date") {
        return (raw) => {
            const value = (Validation.#asString(raw) ?? "").trim()
            if (!value) return { error: `${label} is required.` }

            const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
            if (!parts) return { error: `${label} must be a date in YYYY-MM-DD format.` }

            const [year, month, day] = parts.slice(1).map(Number)
            const parsed = new Date(Date.UTC(year, month - 1, day))
            const isRealDate = parsed.getUTCFullYear() === year
                && parsed.getUTCMonth() === month - 1
                && parsed.getUTCDate() === day
            if (!isRealDate) return { error: `${label} is not a real date.` }

            return { value }
        }
    }

    /**
     * A clock time, normalised to the "HH:MM:SS" format MySQL expects.
     * @param {string} [label]
     * @returns {Rule}
     */
    static time(label = "Time") {
        return (raw) => {
            const value = (Validation.#asString(raw) ?? "").trim()
            if (!value) return { error: `${label} is required.` }

            const parts = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value)
            if (!parts) return { error: `${label} must be a 24 hour time in HH:MM format.` }

            const [, hours, minutes, seconds = "00"] = parts
            return { value: `${hours}:${minutes}:${seconds}` }
        }
    }

    //// Standalone values

    /**
     * Cleans a search term. A repeated query parameter (an array) becomes an
     * empty string.
     * @param {unknown} raw
     * @param {{ max?: number }} [options]
     * @returns {string}
     */
    static searchTerm(raw, { max = 100 } = {}) {
        if (typeof raw !== "string") return ""

        return raw.trim().slice(0, max)
    }

    /**
     * Turns a route parameter such as ":id" into a positive integer.
     * @param {unknown} raw
     * @returns {number | null} the id, or null when it is not valid
     */
    static toId(raw) {
        const value = String(raw ?? "").trim()
        if (!/^[1-9]\d*$/.test(value)) return null

        const id = Number(value)
        return Number.isSafeInteger(id) ? id : null
    }

    //// Internals

    /**
     * Convert a submitted value to a string. Arrays are rejected.
     * @param {unknown} raw
     * @returns {string | null}
     */
    static #asString(raw) {
        if (typeof raw === "string") return raw
        if (typeof raw === "number" || typeof raw === "boolean") return String(raw)

        return null
    }

    /**
     * Remove control characters. Tabs and newlines are kept because blog bodies
     * and descriptions are multi line.
     * @param {string} value
     * @returns {string}
     */
    static #stripControlCharacters(value) {
        return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    }
}
