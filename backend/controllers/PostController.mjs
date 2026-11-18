import express from "express"
import { PostModel } from "../models/PostModel.mjs"
import { PostDetailModel } from "../models/PostDetailModel.mjs"
import { AuthenticationController } from "./AuthenticationController.mjs"
import { Validation } from "../utils/Validation.mjs"

/**
 * The shared blog: reading the feed, writing a post, and deleting one.
 */
export class PostController {
    /** Mounted under /blog. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.viewBlog)

        this.routes.get(
            "/new",
            AuthenticationController.restrict(["member"]),
            this.viewCreatePost
        )

        this.routes.post(
            "/new",
            AuthenticationController.restrict(["member"]),
            this.handleCreatePost
        )

        this.routes.post(
            "/:id/delete",
            AuthenticationController.restrict(["member", "admin"]),
            this.handleDeletePost
        )
    }

    /**
     * The shared blog feed, viewable by any visitor.
     * @type {express.RequestHandler}
     */
    static viewBlog(req, res) {
        PostDetailModel.getAll()
            .then(posts => {
                res.render("blog.ejs", { posts })
            })
            .catch(error => {
                console.error(error)
                res.render("status.ejs", {
                    status: "Database Error",
                    message: "The blog could not be loaded."
                })
            })
    }

    /**
     * @type {express.RequestHandler}
     */
    static viewCreatePost(req, res) {
        res.render("blog_new.ejs")
    }

    /**
     * Creates a blog post authored by the current member.
     * @type {express.RequestHandler}
     */
    static async handleCreatePost(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            subject: Validation.text("Subject", { max: 120 }),
            body: Validation.text("Body", { max: 5000 })
        })

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Post Failed",
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
            await PostModel.create(post)
            res.redirect("/blog")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", {
                status: "Post Failed",
                message: "The post could not be created."
            })
        }
    }

    /**
     * Delete a post. Members can delete their own; admins can delete any.
     * @type {express.RequestHandler}
     */
    static async handleDeletePost(req, res) {
        const postId = Validation.toId(req.params.id)

        if (postId === null) {
            res.status(404).render("status.ejs", {
                status: "Post Not Found",
                message: "The post you tried to delete does not exist."
            })
            return
        }

        try {
            const post = await PostModel.getById(postId)

            const isOwner = post.memberId == req.authenticatedUser.id
            const isAdmin = req.authenticatedUser.role == "admin"

            if (!isOwner && !isAdmin) {
                res.status(403).render("status.ejs", {
                    status: "Access Forbidden.",
                    message: "You can only delete your own posts."
                })
                return
            }

            await PostModel.delete(post.id)
            res.redirect("/blog")
        } catch (error) {
            if (error == "not found") {
                res.status(404).render("status.ejs", {
                    status: "Post Not Found",
                    message: "The post you tried to delete does not exist."
                })
                return
            }

            console.error(error)
            res.status(500).render("status.ejs", {
                status: "Deletion Failed",
                message: "The post could not be deleted."
            })
        }
    }
}
