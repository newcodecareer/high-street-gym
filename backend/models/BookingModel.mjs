import { DatabaseModel } from "./DatabaseModel.mjs";

/**
 * A member's place in a session. The member and the session are both foreign
 * keys; the readable names come from BookingDetailModel.
 */
export class BookingModel extends DatabaseModel {

    //// Instance

    constructor(id, sessionId, memberId, createdAt) {
        super()
        this.id = id
        this.sessionId = sessionId
        this.memberId = memberId
        this.createdAt = createdAt
    }

    //// Static

    static tableToModel(row) {
        return new BookingModel(
            Number(row["id"]),
            Number(row["session_id"]),
            Number(row["member_id"]),
            row["created_at"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM bookings ORDER BY created_at DESC")
            .then(result => result.map(row => this.tableToModel(row.bookings)))
    }

    static getById(id) {
        return this.query("SELECT * FROM bookings WHERE id = ?", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].bookings)
                    : Promise.reject("not found")
            )
    }

    static getByMemberId(memberId) {
        return this.query("SELECT * FROM bookings WHERE member_id = ? ORDER BY created_at DESC", [memberId])
            .then(result => result.map(row => this.tableToModel(row.bookings)))
    }

    static getBySessionId(sessionId) {
        return this.query("SELECT * FROM bookings WHERE session_id = ?", [sessionId])
            .then(result => result.map(row => this.tableToModel(row.bookings)))
    }

    /**
     * Every booking for a session in the date range, so the API can count how
     * full each session is.
     * @param {string} start "YYYY-MM-DD"
     * @param {string} end "YYYY-MM-DD"
     * @returns {Promise<Array<BookingModel>>}
     */
    static getByDateRange(start, end) {
        return this.query(`
            SELECT bookings.* FROM bookings
            JOIN sessions ON bookings.session_id = sessions.id
            WHERE sessions.date BETWEEN ? AND ?
        `, [start, end]).then(result => result.map(row => this.tableToModel(row.bookings)))
    }

    /**
     * The booking a member holds for a session, or null if they have none.
     * @param {number} sessionId
     * @param {number} memberId
     * @returns {Promise<BookingModel | null>}
     */
    static getBySessionAndMember(sessionId, memberId) {
        return this.query(
            "SELECT * FROM bookings WHERE session_id = ? AND member_id = ? LIMIT 1",
            [sessionId, memberId]
        ).then(result =>
            result.length > 0
                ? this.tableToModel(result[0].bookings)
                : null
        )
    }

    static create(booking) {
        return this.query(`
            INSERT INTO bookings (session_id, member_id, created_at)
            VALUES (?, ?, ?)
        `,
            [booking.sessionId, booking.memberId, booking.createdAt]
        )
    }

    static update(booking) {
        return this.query(`
            UPDATE bookings
            SET session_id = ?, member_id = ?
            WHERE id = ?
        `,
            [booking.sessionId, booking.memberId, booking.id]
        )
    }

    /**
     * Hard delete, unlike the soft delete used by the other models.
     * @param {number} id
     * @returns {Promise<mysql.OkPacket>}
     */
    static delete(id) {
        return this.query(`DELETE FROM bookings WHERE id = ?`, [id])
    }
}
