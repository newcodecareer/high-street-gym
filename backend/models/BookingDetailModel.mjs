import { DatabaseModel } from "./DatabaseModel.mjs";
import { BookingModel } from "./BookingModel.mjs";
import { SessionModel } from "./SessionModel.mjs";
import { ActivityModel } from "./ActivityModel.mjs";
import { LocationModel } from "./LocationModel.mjs";
import { UserModel } from "./UserModel.mjs";

/**
 * A booking joined with its session, activity, location, trainer and member,
 * so views can display readable names.
 */
export class BookingDetailModel extends DatabaseModel {

    //// Instance

    constructor(booking, session, activity, location, trainer, member) {
        super()
        this.booking = booking
        this.session = session
        this.activity = activity
        this.location = location
        this.trainer = trainer
        this.member = member
    }

    //// Static

    static tableToModel(row) {
        return new BookingDetailModel(
            BookingModel.tableToModel(row.bookings),
            SessionModel.tableToModel(row.sessions),
            ActivityModel.tableToModel(row.activities),
            LocationModel.tableToModel(row.locations),
            UserModel.tableToModel(row.trainer),
            UserModel.tableToModel(row.member)
        )
    }

    static getAll() {
        return this.query(`
            SELECT * FROM bookings
            JOIN sessions ON bookings.session_id = sessions.id
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            JOIN users AS member ON bookings.member_id = member.id
            ORDER BY bookings.created_at DESC
        `).then(result => result.map(row => this.tableToModel(row)))
    }

    static getByMemberId(memberId) {
        return this.query(`
            SELECT * FROM bookings
            JOIN sessions ON bookings.session_id = sessions.id
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            JOIN users AS member ON bookings.member_id = member.id
            WHERE bookings.member_id = ?
            ORDER BY sessions.date, sessions.start_time
        `, [memberId]).then(result => result.map(row => this.tableToModel(row)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM bookings
            JOIN sessions ON bookings.session_id = sessions.id
            JOIN activities ON sessions.activity_id = activities.id
            JOIN locations ON sessions.location_id = locations.id
            JOIN users AS trainer ON sessions.trainer_id = trainer.id
            JOIN users AS member ON bookings.member_id = member.id
            WHERE CONCAT_WS(' ', member.first_name, member.last_name) LIKE ?
            OR activities.name LIKE ? OR locations.name LIKE ?
            ORDER BY bookings.created_at DESC
        `, [this.toLikePattern(term), this.toLikePattern(term), this.toLikePattern(term)])
            .then(result => result.map(row => this.tableToModel(row)))
    }
}
