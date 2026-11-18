import { DatabaseModel } from "./DatabaseModel.mjs";

/**
 * A type of class the gym offers, such as Yoga or HIIT. A session is a
 * scheduled instance of one of these.
 */
export class ActivityModel extends DatabaseModel {

    //// Instance

    constructor(id, name, description, deleted = 0) {
        super()
        this.id = id
        this.name = name
        this.description = description
        this.deleted = deleted
    }

    //// Static

    static tableToModel(row) {
        return new ActivityModel(
            Number(row["id"]),
            row["name"],
            row["description"],
            row["deleted"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM activities WHERE deleted = 0")
            .then(result => result.map(row => this.tableToModel(row.activities)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM activities
            WHERE deleted = 0
            AND (name LIKE ? OR description LIKE ?)
        `,
            [this.toLikePattern(term), this.toLikePattern(term)]
        ).then(result => result.map(row => this.tableToModel(row.activities)))
    }

    static getById(id) {
        return this.query("SELECT * FROM activities WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].activities)
                    : Promise.reject("not found")
            )
    }

    static create(activity) {
        return this.query(`
            INSERT INTO activities (name, description, deleted)
            VALUES (?, ?, ?)
        `,
            [activity.name, activity.description, activity.deleted]
        )
    }

    static update(activity) {
        return this.query(`
            UPDATE activities
            SET name = ?, description = ?, deleted = ?
            WHERE id = ?
        `,
            [activity.name, activity.description, activity.deleted, activity.id]
        )
    }

    static delete(id) {
        return this.query(`UPDATE activities SET deleted = 1 WHERE id = ?`, [id])
    }
}
