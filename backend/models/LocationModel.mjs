import { DatabaseModel } from "./DatabaseModel.mjs";

/**
 * A place a session can be held, with the street address shown alongside it.
 */
export class LocationModel extends DatabaseModel {

    //// Instance

    constructor(id, name, address, deleted = 0) {
        super()
        this.id = id
        this.name = name
        this.address = address
        this.deleted = deleted
    }

    //// Static

    static tableToModel(row) {
        return new LocationModel(
            Number(row["id"]),
            row["name"],
            row["address"],
            row["deleted"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM locations WHERE deleted = 0")
            .then(result => result.map(row => this.tableToModel(row.locations)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM locations
            WHERE deleted = 0
            AND (name LIKE ? OR address LIKE ?)
        `,
            [this.toLikePattern(term), this.toLikePattern(term)]
        ).then(result => result.map(row => this.tableToModel(row.locations)))
    }

    static getById(id) {
        return this.query("SELECT * FROM locations WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].locations)
                    : Promise.reject("not found")
            )
    }

    static create(location) {
        return this.query(`
            INSERT INTO locations (name, address, deleted)
            VALUES (?, ?, ?)
        `,
            [location.name, location.address, location.deleted]
        )
    }

    static update(location) {
        return this.query(`
            UPDATE locations
            SET name = ?, address = ?, deleted = ?
            WHERE id = ?
        `,
            [location.name, location.address, location.deleted, location.id]
        )
    }

    static delete(id) {
        return this.query(`UPDATE locations SET deleted = 1 WHERE id = ?`, [id])
    }
}
