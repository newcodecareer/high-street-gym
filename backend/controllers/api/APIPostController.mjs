import express from "express"
import { APIAuthenticationController } from "./APIAuthenticationController.mjs"
import { PostModel } from "../../models/PostModel.mjs"
import { PostDetailModel } from "../../models/PostDetailModel.mjs"
import { Validation } from "../../utils/Validation.mjs"

/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: Read the blog feed, newest first
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/Search'
 *     responses:
 *       '200':
 *         description: The blog feed
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PostDetail'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create a post as the signed-in member or trainer
 *     tags: [Posts]
 *     security:
 *       - ApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       '201':
 *         $ref: '#/components/responses/Created'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post (members and trainers delete their own; admins delete any)
 *     tags: [Posts]
 *     security:
 *       - ApiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/** The shared microblog: read the feed, post, and delete. */
export class APIPostController {
    /** Mounted under /api/posts. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.getPosts)
        this.routes.post("/", APIAuthenticationController.restrict(["member", "trainer"]), this.createPost)
        this.routes.delete("/:id", APIAuthenticationController.restrict(["member", "trainer", "admin"]), this.deletePost)
    }

    /**
     * The feed, newest first. Supports an optional "search" query.
     * @type {express.RequestHandler}
     */
    static async getPosts(req, res) {
        const searchTerm = Validation.searchTerm(req.query.search)

        try {
            const posts = searchTerm
                ? await PostDetailModel.getBySearch(searchTerm)
                : await PostDetailModel.getAll()

            res.status(200).json(posts)
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Posts could not be loaded."
            })
        }
    }

    /**
     * Create a post authored by the signed-in member or trainer.
     * @type {express.RequestHandler}
     */
    static async createPost(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            subject: Validation.text("Subject", { max: 120 }),
            body: Validation.text("Body", { max: 1000 })
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return
        }

        const post = new PostModel(
            null,
            req.authenticatedUser.id,
            values.subject,
            values.body,
            PostModel.toMySqlDateTime(new Date())
        )

        try {
            const result = await PostModel.create(post)
            res.status(201).json({
                id: result.insertId,
                message: "Post created."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Post could not be created."
            })
        }
    }

    /**
     * Delete a post. Members and trainers delete their own; admins delete any.
     * @type {express.RequestHandler}
     */
    static async deletePost(req, res) {
        const postId = Validation.toId(req.params.id)

        if (postId === null) {
            res.status(404).json({
                message: "Post not found."
            })
            return
        }

        try {
            const post = await PostModel.getById(postId)

            const isOwner = post.memberId == req.authenticatedUser.id
            const isAdmin = req.authenticatedUser.role == "admin"

            if (!isOwner && !isAdmin) {
                res.status(403).json({
                    message: "You can only delete your own posts."
                })
                return
            }

            await PostModel.delete(post.id)
            res.status(200).json({
                message: "Post deleted."
            })
        } catch (error) {
            if (error == "not found") {
                res.status(404).json({
                    message: "Post not found."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Post could not be deleted."
            })
        }
    }
}
