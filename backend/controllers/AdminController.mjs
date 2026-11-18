import express from "express"
import bcrypt from "bcryptjs"
import { AuthenticationController } from "./AuthenticationController.mjs"
import { UserModel, USER_ROLE_MEMBER, USER_ROLE_TRAINER, USER_ROLE_ADMIN } from "../models/UserModel.mjs"
import { ActivityModel } from "../models/ActivityModel.mjs"
import { LocationModel } from "../models/LocationModel.mjs"
import { SessionModel } from "../models/SessionModel.mjs"
import { SessionDetailModel } from "../models/SessionDetailModel.mjs"
import { BookingModel } from "../models/BookingModel.mjs"
import { BookingDetailModel } from "../models/BookingDetailModel.mjs"
import { PostModel } from "../models/PostModel.mjs"
import { PostDetailModel } from "../models/PostDetailModel.mjs"
import { Validation } from "../utils/Validation.mjs"

/** The actions every management form is allowed to submit. */
const ADMIN_ACTIONS = ["create", "update", "delete"]

/** Admin CRUD and search for all resources, mounted under /admin. */
export class AdminController {
    /** Mounted under /admin; every route on it is gated on the admin role. */
    static routes = express.Router()

    static {
        // Dashboard landing
        this.routes.get(
            "/",
            AuthenticationController.restrict(["admin"]),
            this.viewDashboard
        )

        // Users CRUD
        this.routes.get("/users", AuthenticationController.restrict(["admin"]), this.viewUsers)
        this.routes.get("/users/:id", AuthenticationController.restrict(["admin"]), this.viewUsers)
        this.routes.post("/users", AuthenticationController.restrict(["admin"]), this.handleUsers)
        this.routes.post("/users/:id", AuthenticationController.restrict(["admin"]), this.handleUsers)

        // Activities CRUD
        this.routes.get("/activities", AuthenticationController.restrict(["admin"]), this.viewActivities)
        this.routes.get("/activities/:id", AuthenticationController.restrict(["admin"]), this.viewActivities)
        this.routes.post("/activities", AuthenticationController.restrict(["admin"]), this.handleActivities)
        this.routes.post("/activities/:id", AuthenticationController.restrict(["admin"]), this.handleActivities)

        // Locations CRUD
        this.routes.get("/locations", AuthenticationController.restrict(["admin"]), this.viewLocations)
        this.routes.get("/locations/:id", AuthenticationController.restrict(["admin"]), this.viewLocations)
        this.routes.post("/locations", AuthenticationController.restrict(["admin"]), this.handleLocations)
        this.routes.post("/locations/:id", AuthenticationController.restrict(["admin"]), this.handleLocations)

        // Sessions CRUD
        this.routes.get("/sessions", AuthenticationController.restrict(["admin"]), this.viewSessions)
        this.routes.get("/sessions/:id", AuthenticationController.restrict(["admin"]), this.viewSessions)
        this.routes.post("/sessions", AuthenticationController.restrict(["admin"]), this.handleSessions)
        this.routes.post("/sessions/:id", AuthenticationController.restrict(["admin"]), this.handleSessions)

        // Bookings CRUD
        this.routes.get("/bookings", AuthenticationController.restrict(["admin"]), this.viewBookings)
        this.routes.get("/bookings/:id", AuthenticationController.restrict(["admin"]), this.viewBookings)
        this.routes.post("/bookings", AuthenticationController.restrict(["admin"]), this.handleBookings)
        this.routes.post("/bookings/:id", AuthenticationController.restrict(["admin"]), this.handleBookings)

        // Posts CRUD
        this.routes.get("/posts", AuthenticationController.restrict(["admin"]), this.viewPosts)
        this.routes.get("/posts/:id", AuthenticationController.restrict(["admin"]), this.viewPosts)
        this.routes.post("/posts", AuthenticationController.restrict(["admin"]), this.handlePosts)
        this.routes.post("/posts/:id", AuthenticationController.restrict(["admin"]), this.handlePosts)
    }

    //// Dashboard

    /**
     * Send admins to the first resource in the sidebar.
     * @type {express.RequestHandler}
     */
    static viewDashboard(req, res) {
        res.redirect("/admin/users")
    }

    //// Users

    /**
     * @type {express.RequestHandler}
     */
    static async viewUsers(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const users = searchTerm ? await UserModel.getBySearch(searchTerm) : await UserModel.getAll()
            const selectedUser = users.find(u => u.id == req.params.id) ?? new UserModel(null, "", "", "", "", USER_ROLE_MEMBER)

            res.render("admin/users.ejs", { users, selectedUser, searchTerm })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Users could not be loaded." })
        }
    }

    /**
     * Create, update or delete a user. A blank password on update keeps the
     * current hash.
     * @type {express.RequestHandler}
     */
    static async handleUsers(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            if (action == "delete") {
                const id = AdminController.#idParam(req, res)
                if (id === null) return

                await UserModel.delete(id)
                res.redirect("/admin/users")
                return
            }

            const values = AdminController.#accept(req, res, {
                firstName: Validation.text("First name", { max: 80 }),
                lastName: Validation.text("Last name", { max: 80 }),
                email: Validation.email(),
                password: Validation.newPassword("Password", { required: action == "create" }),
                role: Validation.choice("Role", [USER_ROLE_MEMBER, USER_ROLE_TRAINER, USER_ROLE_ADMIN])
            })
            if (!values) return

            // A blank password keeps the stored hash.
            let password
            let id = null

            if (action == "create") {
                password = bcrypt.hashSync(values.password)
            } else {
                id = AdminController.#idParam(req, res)
                if (id === null) return

                password = values.password
                    ? bcrypt.hashSync(values.password)
                    : (await UserModel.getById(id)).password
            }

            const user = new UserModel(id, values.firstName, values.lastName, values.email, password, values.role)

            if (action == "create") {
                await UserModel.create(user)
            } else {
                await UserModel.update(user)
            }

            res.redirect("/admin/users")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The user could not be saved." })
        }
    }

    //// Activities

    /**
     * @type {express.RequestHandler}
     */
    static async viewActivities(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const activities = searchTerm ? await ActivityModel.getBySearch(searchTerm) : await ActivityModel.getAll()
            const selectedActivity = activities.find(a => a.id == req.params.id) ?? new ActivityModel(null, "", "")

            res.render("admin/activities.ejs", { activities, selectedActivity, searchTerm })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Activities could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleActivities(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            if (action == "delete") {
                const id = AdminController.#idParam(req, res)
                if (id === null) return

                await ActivityModel.delete(id)
                res.redirect("/admin/activities")
                return
            }

            const values = AdminController.#accept(req, res, {
                name: Validation.text("Name", { max: 80 }),
                description: Validation.text("Description", { max: 1000, required: false })
            })
            if (!values) return

            let id = null
            if (action == "update") {
                id = AdminController.#idParam(req, res)
                if (id === null) return
            }

            const activity = new ActivityModel(id, values.name, values.description)

            if (action == "create") {
                await ActivityModel.create(activity)
            } else {
                await ActivityModel.update(activity)
            }

            res.redirect("/admin/activities")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The activity could not be saved." })
        }
    }

    //// Locations

    /**
     * @type {express.RequestHandler}
     */
    static async viewLocations(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const locations = searchTerm ? await LocationModel.getBySearch(searchTerm) : await LocationModel.getAll()
            const selectedLocation = locations.find(l => l.id == req.params.id) ?? new LocationModel(null, "", "")

            res.render("admin/locations.ejs", { locations, selectedLocation, searchTerm })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Locations could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleLocations(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            if (action == "delete") {
                const id = AdminController.#idParam(req, res)
                if (id === null) return

                await LocationModel.delete(id)
                res.redirect("/admin/locations")
                return
            }

            const values = AdminController.#accept(req, res, {
                name: Validation.text("Name", { max: 80 }),
                address: Validation.text("Address", { max: 200, required: false })
            })
            if (!values) return

            let id = null
            if (action == "update") {
                id = AdminController.#idParam(req, res)
                if (id === null) return
            }

            const location = new LocationModel(id, values.name, values.address)

            if (action == "create") {
                await LocationModel.create(location)
            } else {
                await LocationModel.update(location)
            }

            res.redirect("/admin/locations")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The location could not be saved." })
        }
    }

    //// Sessions

    /**
     * @type {express.RequestHandler}
     */
    static async viewSessions(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const sessions = searchTerm ? await SessionDetailModel.getBySearch(searchTerm) : await SessionDetailModel.getAll()
            const [activities, locations, trainers] = await Promise.all([
                ActivityModel.getAll(),
                LocationModel.getAll(),
                UserModel.getTrainers(),
            ])

            const selectedSession = sessions.find(s => s.session.id == req.params.id)?.session
                ?? new SessionModel(null, "", "", "", "", "", "", 20)

            res.render("admin/sessions.ejs", {
                sessions,
                selectedSession,
                activities,
                locations,
                trainers,
                searchTerm,
                // Cosmetic: hide Edit for started sessions and set the date minimum.
                hasStarted: SessionModel.hasStarted,
                today: SessionModel.toMySqlDate(new Date()),
            })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Sessions could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleSessions(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            // Resolve the target before validating the form. Create has no target.
            let id = null
            if (action != "create") {
                id = AdminController.#idParam(req, res)
                if (id === null) return

                // A started session can be deleted but not changed.
                if (action == "update") {
                    const existing = await SessionModel.getById(id).catch(() => null)
                    if (existing && SessionModel.hasStarted(existing)) {
                        res.status(400).render("status.ejs", {
                            status: "Invalid Input",
                            message: "This session has already started and can no longer be changed."
                        })
                        return
                    }
                }
            }

            if (action == "delete") {
                await SessionModel.delete(id)
                res.redirect("/admin/sessions")
                return
            }

            const values = AdminController.#accept(req, res, {
                activityId: Validation.integer("Activity", { min: 1 }),
                locationId: Validation.integer("Location", { min: 1 }),
                trainerId: Validation.integer("Trainer", { min: 1 }),
                date: Validation.date("Date"),
                startTime: Validation.time("Start time"),
                endTime: Validation.time("End time"),
                capacity: Validation.integer("Capacity", { min: 1, max: 500 })
            })
            if (!values) return

            // Both times are HH:MM:SS, so string comparison works.
            if (values.endTime <= values.startTime) {
                res.status(400).render("status.ejs", {
                    status: "Invalid Input",
                    message: "The end time must be after the start time."
                })
                return
            }

            // A session cannot be created or moved into the past.
            if (SessionModel.hasStarted(values)) {
                res.status(400).render("status.ejs", {
                    status: "Invalid Input",
                    message: "A session cannot start in the past."
                })
                return
            }

            const session = new SessionModel(
                id,
                values.activityId,
                values.locationId,
                values.trainerId,
                values.date,
                values.startTime,
                values.endTime,
                values.capacity
            )

            if (action == "create") {
                await SessionModel.create(session)
            } else {
                await SessionModel.update(session)
            }

            res.redirect("/admin/sessions")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The session could not be saved." })
        }
    }

    //// Bookings

    /**
     * @type {express.RequestHandler}
     */
    static async viewBookings(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const bookings = searchTerm ? await BookingDetailModel.getBySearch(searchTerm) : await BookingDetailModel.getAll()
            const [members, sessions] = await Promise.all([
                UserModel.getByRole(USER_ROLE_MEMBER),
                SessionDetailModel.getAll(),
            ])

            const selectedBooking = bookings.find(b => b.booking.id == req.params.id)?.booking
                ?? new BookingModel(null, "", "", "")

            res.render("admin/bookings.ejs", { bookings, selectedBooking, members, sessions, searchTerm })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Bookings could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleBookings(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            if (action == "delete") {
                const id = AdminController.#idParam(req, res)
                if (id === null) return

                await BookingModel.delete(id)
                res.redirect("/admin/bookings")
                return
            }

            const values = AdminController.#accept(req, res, {
                sessionId: Validation.integer("Session", { min: 1 }),
                memberId: Validation.integer("Member", { min: 1 })
            })
            if (!values) return

            let id = null
            if (action == "update") {
                id = AdminController.#idParam(req, res)
                if (id === null) return
            }

            // A member can only hold one booking per session. On update, the
            // booking being edited is allowed to match itself.
            const duplicate = await BookingModel.getBySessionAndMember(values.sessionId, values.memberId)
            if (duplicate && duplicate.id != id) {
                res.status(400).render("status.ejs", {
                    status: "Duplicate Booking",
                    message: "This member already has a booking for that session."
                })
                return
            }

            const booking = new BookingModel(
                id,
                values.sessionId,
                values.memberId,
                BookingModel.toMySqlDateTime(new Date())
            )

            if (action == "create") {
                await BookingModel.create(booking)
            } else {
                await BookingModel.update(booking)
            }

            res.redirect("/admin/bookings")
        } catch (error) {
            // The unique key on (session_id, member_id) catches the race the
            // check above cannot.
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(400).render("status.ejs", {
                    status: "Duplicate Booking",
                    message: "This member already has a booking for that session."
                })
                return
            }

            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The booking could not be saved." })
        }
    }

    //// Posts

    /**
     * @type {express.RequestHandler}
     */
    static async viewPosts(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const posts = searchTerm ? await PostDetailModel.getBySearch(searchTerm) : await PostDetailModel.getAll()
            const members = await UserModel.getByRole(USER_ROLE_MEMBER)

            const selectedPost = posts.find(p => p.post.id == req.params.id)?.post
                ?? new PostModel(null, "", "", "")

            res.render("admin/posts.ejs", { posts, selectedPost, members, searchTerm })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Posts could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handlePosts(req, res) {
        const action = AdminController.#action(req, res)
        if (action === null) return

        try {
            if (action == "delete") {
                const id = AdminController.#idParam(req, res)
                if (id === null) return

                await PostModel.delete(id)
                res.redirect("/admin/posts")
                return
            }

            const values = AdminController.#accept(req, res, {
                memberId: Validation.integer("Member", { min: 1 }),
                subject: Validation.text("Subject", { max: 120 }),
                body: Validation.text("Body", { max: 5000 })
            })
            if (!values) return

            let id = null
            if (action == "update") {
                id = AdminController.#idParam(req, res)
                if (id === null) return
            }

            const post = new PostModel(
                id,
                values.memberId,
                values.subject,
                values.body,
                PostModel.toMySqlDateTime(new Date())
            )

            if (action == "create") {
                await PostModel.create(post)
            } else {
                await PostModel.update(post)
            }

            res.redirect("/admin/posts")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The post could not be saved." })
        }
    }

    //// Helpers

    /**
     * Validate the action submitted by a management form.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {string | null} the action, or null once a 400 has been rendered
     */
    static #action(req, res) {
        const { values, isValid } = Validation.run(req.body, {
            action: Validation.choice("Action", ADMIN_ACTIONS)
        })

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Invalid Action",
                message: "The form doesn't support this action."
            })
            return null
        }

        return values.action
    }

    /**
     * Validate a submission and render the error page if it fails.
     * @param {express.Request} req
     * @param {express.Response} res
     * @param {Record<string, import("../utils/Validation.mjs").Rule>} fields
     * @returns {Record<string, any> | null} the sanitised values, or null once
     *          the rejection has already been rendered
     */
    static #accept(req, res, fields) {
        const { values, errors, isValid } = Validation.run(req.body, fields)

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Invalid Input",
                message: Validation.summarise(errors)
            })
            return null
        }

        return values
    }

    /**
     * Validate the ":id" route parameter.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {number | null} the identifier, or null once a 404 has been rendered
     */
    static #idParam(req, res) {
        const id = Validation.toId(req.params.id)

        if (id === null) {
            res.status(404).render("status.ejs", {
                status: "Not Found",
                message: "The requested record does not exist."
            })
        }

        return id
    }
}
