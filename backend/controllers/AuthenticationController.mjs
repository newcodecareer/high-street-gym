import express from "express"
import session from "express-session"
import bcrypt from "bcryptjs"
import { UserModel, USER_ROLE_MEMBER } from "../models/UserModel.mjs"
import { Validation } from "../utils/Validation.mjs"

/** Registration, login and logout, plus the role guard used by other controllers. */
export class AuthenticationController {
    /** Loads the session and the signed-in user. */
    static middleware = express.Router()

    /** Login, register and logout routes. */
    static routes = express.Router()

    static {
        this.middleware.use(session({
            secret: "9c55abf5-111d-4235-b8d8-07c3463999e7",
            resave: false,
            saveUninitialized: false,
            cookie: { secure: "auto" }
        }))
        this.middleware.use(this.#sessionAuthenticationProvider)

        this.routes.get("/login", this.viewLogin)
        this.routes.post("/login", this.handleLogin)

        this.routes.get("/register", this.viewRegister)
        this.routes.post("/register", this.handleRegister)

        this.routes.get("/logout", this.handleLogout)
    }

    /**
     * Loads the user for an active session.
     * @type {express.RequestHandler}
     */
    static async #sessionAuthenticationProvider(req, res, next) {
        if (req.session.userId && !req.authenticatedUser) {
            try {
                req.authenticatedUser = await UserModel.getById(req.session.userId)
            } catch (error) {
                console.error("Failed to authenticate user session - " + error)
            }
        }
        next()
    }

    /**
     * @type {express.RequestHandler}
     */
    static viewLogin(req, res) {
        res.render("login.ejs")
    }

    /**
     * @type {express.RequestHandler}
     */
    static viewRegister(req, res) {
        res.render("register.ejs")
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleLogin(req, res) {
        const { values, isValid } = Validation.run(req.body, {
            email: Validation.email(),
            password: Validation.password()
        })

        // Use the same message for every failure.
        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Authentication Failed.",
                message: "Invalid credentials."
            })
            return
        }

        try {
            const user = await UserModel.getByEmail(values.email)
            const isCorrectPassword = await bcrypt.compare(values.password, user.password)

            if (isCorrectPassword) {
                // Store the user id in the session
                req.session.userId = user.id

                // Redirect to the role dashboard
                res.redirect("/dashboard")
            } else {
                res.status(400).render("status.ejs", {
                    status: "Authentication Failed.",
                    message: "Invalid credentials."
                })
            }
        } catch (error) {
            if (error == "not found") {
                res.status(400).render("status.ejs", {
                    status: "Authentication Failed.",
                    message: "Invalid credentials."
                })
            } else {
                console.error(error)
                res.status(500).render("status.ejs", {
                    status: "Authentication Failed.",
                    message: "Server error."
                })
            }
        }
    }

    /**
     * Register a new member account. Trainer and admin accounts are created by
     * an admin.
     * @type {express.RequestHandler}
     */
    static async handleRegister(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            firstName: Validation.text("First name", { max: 80 }),
            lastName: Validation.text("Last name", { max: 80 }),
            email: Validation.email(),
            password: Validation.newPassword()
        })

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Registration Failed.",
                message: Validation.summarise(errors)
            })
            return
        }

        const user = new UserModel(
            null,
            values.firstName,
            values.lastName,
            values.email,
            bcrypt.hashSync(values.password),
            USER_ROLE_MEMBER
        )

        try {
            await UserModel.create(user)
            res.redirect("/authenticate/login")
        } catch (error) {
            console.error(error)
            if (error.code == "ER_DUP_ENTRY") {
                res.status(400).render("status.ejs", {
                    status: "Registration Failed.",
                    message: "An account with that email already exists."
                })
            } else {
                res.status(500).render("status.ejs", {
                    status: "Registration Failed.",
                    message: "Server error."
                })
            }
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static handleLogout(req, res) {
        if (req.session.userId) {
            req.session.destroy(() => {
                res.redirect("/authenticate/login")
            })
        } else {
            res.redirect("/authenticate/login")
        }
    }

    /**
     * @param {Array<"member" | "trainer" | "admin">} allowedRoles
     * @returns {express.RequestHandler}
     */
    static restrict(allowedRoles) {
        return function (req, res, next) {
            if (req.authenticatedUser) {
                if (allowedRoles.includes(req.authenticatedUser.role)) {
                    next()
                } else {
                    res.status(403).render("status.ejs", {
                        status: "Access Forbidden.",
                        message: "Role does not have access to the requested resource."
                    })
                }
            } else {
                res.status(401).render("status.ejs", {
                    status: "Unauthenticated.",
                    message: "Please login to access the requested resource."
                })
            }
        }
    }
}
