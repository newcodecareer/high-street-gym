import { DatabaseModel } from "./DatabaseModel.mjs";

/**
 * A scheduled class: one activity, held at one location, led by one trainer, at
 * a particular date and time. A row here is what a member books.
 */
export class SessionModel extends DatabaseModel {

    //// Instance

    constructor(id, activityId, locationId, trainerId, date, startTime, endTime, capacity, deleted = 0) {
        super()
        this.id = id
        this.activityId = activityId
        this.locationId = locationId
        this.trainerId = trainerId
        this.date = date
        this.startTime = startTime
        this.endTime = endTime
        this.capacity = capacity
        this.deleted = deleted
    }

    //// Static

    static tableToModel(row) {
        return new SessionModel(
            Number(row["id"]),
            Number(row["activity_id"]),
            Number(row["location_id"]),
            Number(row["trainer_id"]),
            row["date"],
            row["start_time"],
            row["end_time"],
            Number(row["capacity"]),
            row["deleted"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM sessions WHERE deleted = 0 ORDER BY date, start_time")
            .then(result => result.map(row => this.tableToModel(row.sessions)))
    }

    static getById(id) {
        return this.query("SELECT * FROM sessions WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].sessions)
                    : Promise.reject("not found")
            )
    }

    static getByTrainerId(trainerId) {
        return this.query("SELECT * FROM sessions WHERE trainer_id = ? AND deleted = 0 ORDER BY date, start_time", [trainerId])
            .then(result => result.map(row => this.tableToModel(row.sessions)))
    }

    /**
     * Whether the session's start has passed. Dates and times are fixed-width
     * strings, so a plain text comparison works. Local time is used, and the
     * class is named instead of `this` because views receive the method as a
     * detached reference.
     * @param {{date: string, startTime: string}} session
     * @returns {boolean}
     */
    static hasStarted(session) {
        return `${session.date} ${session.startTime}` <= SessionModel.toMySqlDateTime(new Date())
    }

    static create(session) {
        return this.query(`
            INSERT INTO sessions
            (activity_id, location_id, trainer_id, date, start_time, end_time, capacity, deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [session.activityId, session.locationId, session.trainerId, session.date, session.startTime, session.endTime, session.capacity, session.deleted]
        )
    }

    static update(session) {
        return this.query(`
            UPDATE sessions
            SET activity_id = ?, location_id = ?, trainer_id = ?, date = ?, start_time = ?, end_time = ?, capacity = ?, deleted = ?
            WHERE id = ?
        `,
            [session.activityId, session.locationId, session.trainerId, session.date, session.startTime, session.endTime, session.capacity, session.deleted, session.id]
        )
    }

    static delete(id) {
        return this.query(`UPDATE sessions SET deleted = 1 WHERE id = ?`, [id])
    }
}
