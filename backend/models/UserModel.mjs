import { DatabaseModel } from "./DatabaseModel.mjs";

/** The "role" value for a customer who books sessions. */
export const USER_ROLE_MEMBER = "member"

/** The "role" value for a trainer who leads sessions. */
export const USER_ROLE_TRAINER = "trainer"

/** The "role" value for an administrator. */
export const USER_ROLE_ADMIN = "admin"

/**
 * A user account: a member, a trainer or an administrator. The three constants
 * above are the only values the "role" column accepts, and they are what
 * `AuthenticationController.restrict` tests a route against.
 */
export class UserModel extends DatabaseModel {

    //// Instance

    constructor(id, firstName, lastName, email, password, role, deleted = 0, authenticationKey = null) {
        super()
        this.id = id
        this.firstName = firstName
        this.lastName = lastName
        this.email = email
        this.password = password
        this.role = role
        this.deleted = deleted
        this.authenticationKey = authenticationKey
    }

    /**
     * Keep the password hash and the API key out of JSON responses. The key is
     * returned once, by the login route.
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            role: this.role,
        }
    }

    //// Static

    static tableToModel(row) {
        return new UserModel(
            Number(row["id"]),
            row["first_name"],
            row["last_name"],
            row["email"],
            row["password"],
            row["role"],
            row["deleted"],
            row["authentication_key"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM users WHERE deleted = 0")
            .then(result => result.map(row => this.tableToModel(row.users)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM users
            WHERE deleted = 0
            AND (CONCAT_WS(' ', first_name, last_name) LIKE ? OR email LIKE ? OR role LIKE ?)
        `,
            [this.toLikePattern(term), this.toLikePattern(term), this.toLikePattern(term)]
        ).then(result => result.map(row => this.tableToModel(row.users)))
    }

    static getById(id) {
        return this.query("SELECT * FROM users WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].users)
                    : Promise.reject("not found")
            )
    }

    static getByEmail(email) {
        return this.query("SELECT * FROM users WHERE email = ? AND deleted = 0", [email])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].users)
                    : Promise.reject("not found")
            )
    }

    /**
     * The user holding an API authentication key, or "not found".
     * @param {string} authenticationKey
     * @returns {Promise<UserModel>}
     */
    static getByAuthenticationKey(authenticationKey) {
        return this.query(
            "SELECT * FROM users WHERE authentication_key = ? AND deleted = 0",
            [authenticationKey]
        ).then(result =>
            result.length > 0
                ? this.tableToModel(result[0].users)
                : Promise.reject("not found")
        )
    }

    static getTrainers() {
        return this.getByRole(USER_ROLE_TRAINER)
    }

    static getByRole(role) {
        return this.query("SELECT * FROM users WHERE role = ? AND deleted = 0", [role])
            .then(result => result.map(row => this.tableToModel(row.users)))
    }

    static create(user) {
        return this.query(`
            INSERT INTO users
            (first_name, last_name, email, password, role, deleted)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
            [user.firstName, user.lastName, user.email, user.password, user.role, user.deleted]
        )
    }

    static update(user) {
        return this.query(`
            UPDATE users
            SET first_name = ?, last_name = ?, email = ?, password = ?, role = ?, deleted = ?
            WHERE id = ?
        `,
            [user.firstName, user.lastName, user.email, user.password, user.role, user.deleted, user.id]
        )
    }

    /**
     * Store the API key issued at login, or null to log the user out. Kept
     * separate from update() so admin edits do not touch the key.
     * @param {number} id
     * @param {string | null} authenticationKey
     * @returns {Promise<mysql.OkPacket>}
     */
    static updateAuthenticationKey(id, authenticationKey) {
        return this.query(
            "UPDATE users SET authentication_key = ? WHERE id = ?",
            [authenticationKey, id]
        )
    }

    static delete(id) {
        return this.query(`UPDATE users SET deleted = 1 WHERE id = ?`, [id])
    }
}
