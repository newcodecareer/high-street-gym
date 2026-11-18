import express from "express"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"
import { UserModel } from "../../models/UserModel.mjs"
import { Validation } from "../../utils/Validation.mjs"

/**
 * @openapi
 * /api/authenticate:
 *   post:
 *     summary: Log in and receive an API key
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCredentials'
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthenticationKey'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     summary: Log out and clear the API key
 *     tags: [Authentication]
 *     security:
 *       - ApiKey: []
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * Login and logout for the JSON API.
 *
 * The server-side views use a session cookie. A client-side app cannot rely on
 * that across origins, so login returns a random key instead. The client sends
 * the key back in the "x-auth-key" header on every authenticated request.
 */
export class APIAuthenticationController {
    /** Reads the "x-auth-key" header and loads the matching user. */
    static middleware = express.Router()

    /** Login and logout routes, mounted at /api. */
    static routes = express.Router()

    static {
        this.middleware.use(this.#authenticationProvider)
        this.routes.post("/authenticate", this.handleLogin)
        this.routes.delete("/authenticate", this.handleLogout)
    }

    /**
     * @private
     * @type {express.RequestHandler}
     */
    static async #authenticationProvider(req, res, next) {
        const authenticationKey = req.headers["x-auth-key"]

        // Requests without a key stay anonymous; role guards reject them later.
        if (!authenticationKey) {
            next()
            return
        }

        try {
            req.authenticatedUser = await UserModel.getByAuthenticationKey(authenticationKey)
            next()
        } catch (error) {
            if (error == "not found") {
                res.status(401).json({
                    message: "Invalid authentication key."
                })
            } else {
                console.error(error)
                res.status(500).json({
                    message: "Authentication failed."
                })
            }
        }
    }

    /**
     * Exchange an email and password for a fresh authentication key.
     * @type {express.RequestHandler}
     */
    static async handleLogin(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            email: Validation.email(),
            password: Validation.password()
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return
        }

        try {
            const user = await UserModel.getByEmail(values.email)
            const isCorrectPassword = await bcrypt.compare(values.password, user.password)

            if (!isCorrectPassword) {
                res.status(400).json({
                    message: "Invalid credentials."
                })
                return
            }

            // A new key on every login invalidates the previous one.
            const authenticationKey = randomUUID()
            await UserModel.updateAuthenticationKey(user.id, authenticationKey)

            res.status(200).json({
                key: authenticationKey
            })
        } catch (error) {
            if (error == "not found") {
                res.status(400).json({
                    message: "Invalid credentials."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Authentication failed."
            })
        }
    }

    /**
     * Clear the caller's authentication key.
     * @type {express.RequestHandler}
     */
    static async handleLogout(req, res) {
        if (!req.authenticatedUser) {
            res.status(401).json({
                message: "Not authenticated."
            })
            return
        }

        try {
            await UserModel.updateAuthenticationKey(req.authenticatedUser.id, null)
            res.status(200).json({
                message: "Logged out."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Logout failed."
            })
        }
    }

    /**
     * JSON counterpart of AuthenticationController.restrict.
     * @param {Array<"member" | "trainer" | "admin">} allowedRoles
     * @returns {express.RequestHandler}
     */
    static restrict(allowedRoles) {
        return function (req, res, next) {
            if (!req.authenticatedUser) {
                res.status(401).json({
                    message: "Not authenticated."
                })
            } else if (allowedRoles.includes(req.authenticatedUser.role)) {
                next()
            } else {
                res.status(403).json({
                    message: "Access forbidden."
                })
            }
        }
    }
}
