import { DatabaseModel } from "./DatabaseModel.mjs";
import { PostModel } from "./PostModel.mjs";
import { UserModel } from "./UserModel.mjs";

/**
 * A blog post joined with its author, so views can display the author name.
 */
export class PostDetailModel extends DatabaseModel {

    //// Instance

    constructor(post, author) {
        super()
        this.post = post
        this.author = author
    }

    //// Static

    static tableToModel(row) {
        return new PostDetailModel(
            PostModel.tableToModel(row.posts),
            UserModel.tableToModel(row.author)
        )
    }

    static getAll() {
        return this.query(`
            SELECT * FROM posts
            JOIN users AS author ON posts.member_id = author.id
            ORDER BY posts.created_at DESC
        `).then(result => result.map(row => this.tableToModel(row)))
    }

    static getBySearch(term) {
        return this.query(`
            SELECT * FROM posts
            JOIN users AS author ON posts.member_id = author.id
            WHERE posts.subject LIKE ? OR posts.body LIKE ?
            OR CONCAT_WS(' ', author.first_name, author.last_name) LIKE ?
            ORDER BY posts.created_at DESC
        `, [this.toLikePattern(term), this.toLikePattern(term), this.toLikePattern(term)])
            .then(result => result.map(row => this.tableToModel(row)))
    }
}
