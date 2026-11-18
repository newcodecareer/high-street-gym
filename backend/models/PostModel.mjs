import { DatabaseModel } from "./DatabaseModel.mjs";

/**
 * A blog post written by a member. The author is stored as a foreign key; the
 * readable name comes from PostDetailModel.
 */
export class PostModel extends DatabaseModel {

    //// Instance

    constructor(id, memberId, subject, body, createdAt) {
        super()
        this.id = id
        this.memberId = memberId
        this.subject = subject
        this.body = body
        this.createdAt = createdAt
    }

    //// Static

    static tableToModel(row) {
        return new PostModel(
            Number(row["id"]),
            Number(row["member_id"]),
            row["subject"],
            row["body"],
            row["created_at"]
        )
    }

    static getAll() {
        return this.query("SELECT * FROM posts ORDER BY created_at DESC")
            .then(result => result.map(row => this.tableToModel(row.posts)))
    }

    static getById(id) {
        return this.query("SELECT * FROM posts WHERE id = ?", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].posts)
                    : Promise.reject("not found")
            )
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM posts
            WHERE subject LIKE ? OR body LIKE ?
            ORDER BY created_at DESC
        `,
            [this.toLikePattern(term), this.toLikePattern(term)]
        ).then(result => result.map(row => this.tableToModel(row.posts)))
    }

    static create(post) {
        return this.query(`
            INSERT INTO posts (member_id, subject, body, created_at)
            VALUES (?, ?, ?, ?)
        `,
            [post.memberId, post.subject, post.body, post.createdAt]
        )
    }

    static update(post) {
        return this.query(`
            UPDATE posts
            SET member_id = ?, subject = ?, body = ?
            WHERE id = ?
        `,
            [post.memberId, post.subject, post.body, post.id]
        )
    }

    /**
     * Removes the post outright: this is a real DELETE, not the soft delete the
     * other models use, so the row is gone and cannot be brought back.
     * @param {number} id
     * @returns {Promise<mysql.OkPacket>}
     */
    static delete(id) {
        return this.query(`DELETE FROM posts WHERE id = ?`, [id])
    }
}
