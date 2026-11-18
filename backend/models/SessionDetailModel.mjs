import { DatabaseModel } from "./DatabaseModel.mjs";
import { SessionModel } from "./SessionModel.mjs";
import { ActivityModel } from "./ActivityModel.mjs";
import { LocationModel } from "./LocationModel.mjs";
import { UserModel } from "./UserModel.mjs";

/**
 * A session joined with its activity, location and trainer, so views can
 * display human readable names instead of foreign key ids.
 */
export class SessionDetailModel extends DatabaseModel {

    //// Instance

    constructor(session, activity, location, trainer) {
        super()
        this.session = session
        this.activity = activity
        this.location = location
        this.trainer = trainer
    }

    //// Static

    static tableToModel(row) {
        return new SessionDetailModel(
            SessionModel.tableToModel(row.sessions),
            ActivityModel.tableToModel(row.activities),
            LocationModel.tableToModel(row.locations),
            UserModel.tableToModel(row.trainer)
        )
    }

    static getAll() {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0
            ORDER BY sessions.date DESC, sessions.start_time DESC
        `).then(result => result.map(row => this.tableToModel(row)))
    }

    static getById(id) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.id = ? AND sessions.deleted = 0
        `, [id]).then(result =>
            result.length > 0
                ? this.tableToModel(result[0])
                : Promise.reject("not found")
        )
    }

    static getByTrainerId(trainerId) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0 AND sessions.trainer_id = ?
            ORDER BY sessions.date, sessions.start_time
        `, [trainerId]).then(result => result.map(row => this.tableToModel(row)))
    }

    /**
     * A trainer's sessions within a date range, oldest first. Used by the
     * weekly XML export.
     * @param {number} trainerId
     * @param {string} start "YYYY-MM-DD"
     * @param {string} end "YYYY-MM-DD"
     * @returns {Promise<Array<SessionDetailModel>>}
     */
    static getByTrainerIdAndDateRange(trainerId, start, end) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0
            AND sessions.trainer_id = ?
            AND sessions.date BETWEEN ? AND ?
            ORDER BY sessions.date, sessions.start_time
        `, [trainerId, start, end]).then(result => result.map(row => this.tableToModel(row)))
    }

    static getByDateRange(start, end) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0 AND sessions.date BETWEEN ? AND ?
            ORDER BY sessions.date, sessions.start_time
        `, [start, end]).then(result => result.map(row => this.tableToModel(row)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0
            AND (activities.name LIKE ? OR locations.name LIKE ?
                 OR CONCAT_WS(' ', trainer.first_name, trainer.last_name) LIKE ?
                 OR sessions.date LIKE ?)
            ORDER BY sessions.date DESC, sessions.start_time DESC
        `, [this.toLikePattern(term), this.toLikePattern(term), this.toLikePattern(term), this.toLikePattern(term)])
            .then(result => result.map(row => this.tableToModel(row)))
    }

    /**
     * Finds other sessions running the same activity at the same date and
     * time but led by a different trainer, so a member can choose a trainer.
     * @param {SessionModel} session
     * @returns {Promise<Array<SessionDetailModel>>}
     */
    static getAlternatives(session) {
        return this.query(`
            SELECT * FROM sessions
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            WHERE sessions.deleted = 0
            AND sessions.activity_id = ?
            AND sessions.date = ?
            AND sessions.start_time = ?
            AND sessions.id != ?
            ORDER BY trainer.first_name, trainer.last_name
        `, [session.activityId, session.date, session.startTime, session.id])
            .then(result => result.map(row => this.tableToModel(row)))
    }

    /**
     * Trims a MySQL "HH:MM:SS" time string to "HH:MM" for display.
     * @param {string} time
     * @returns {string}
     */
    static formatTime(time) {
        return (time || "").slice(0, 5)
    }

    static dayName(date) {
        const [year, month, day] = date.split("-").map(Number)
        return new Date(year, month - 1, day).toLocaleDateString("en-au", { weekday: "long" })
    }
}
