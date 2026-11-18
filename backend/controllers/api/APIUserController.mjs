import express from "express"
import bcrypt from "bcryptjs"
import { APIAuthenticationController } from "./APIAuthenticationController.mjs"
import { UserModel, USER_ROLE_MEMBER } from "../../models/UserModel.mjs"
import { Validation } from "../../utils/Validation.mjs"

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Register a new member account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       '201':
 *         $ref: '#/components/responses/Created'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/users/self:
 *   get:
 *     summary: Get the signed-in account
 *     tags: [Users]
 *     security:
 *       - ApiKey: []
 *     responses:
 *       '200':
 *         description: The signed-in user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   put:
 *     summary: Update the signed-in account's name and email
 *     tags: [Users]
 *     security:
 *       - ApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Partially update the signed-in account's name and email
 *     description: Send only the fields that should change; missing fields keep their current value.
 *     tags: [Users]
 *     security:
 *       - ApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfilePatch'
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/** Registration and the signed-in user's own account. */
export class APIUserController {
    /** Mounted under /api/users. */
    static routes = express.Router()

    static {
        this.routes.post("/", this.register)
        this.routes.get("/self", APIAuthenticationController.restrict(["member", "trainer", "admin"]), this.getSelf)
        this.routes.put("/self", APIAuthenticationController.restrict(["member", "trainer", "admin"]), this.updateSelf)
        this.routes.patch("/self", APIAuthenticationController.restrict(["member", "trainer", "admin"]), this.patchSelf)
    }

    /**
     * Register a new member account.
     * @type {express.RequestHandler}
     */
    static async register(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            firstName: Validation.text("First name", { max: 80 }),
            lastName: Validation.text("Last name", { max: 80 }),
            email: Validation.email(),
            password: Validation.newPassword()
        })

        if (!isValid) {
            res.status(400).json({
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
            const result = await UserModel.create(user)
            res.status(201).json({
                id: result.insertId,
                message: "Account created."
            })
        } catch (error) {
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(409).json({
                    message: "An account with that email already exists."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Account could not be created."
            })
        }
    }

    /**
     * The account behind the supplied authentication key.
     * @type {express.RequestHandler}
     */
    static getSelf(req, res) {
        res.status(200).json(req.authenticatedUser)
    }

    /**
     * Update the caller's own name and email. The role and password are not
     * editable here; an administrator manages those.
     * @type {express.RequestHandler}
     */
    static async updateSelf(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            firstName: Validation.text("First name", { max: 80 }),
            lastName: Validation.text("Last name", { max: 80 }),
            email: Validation.email()
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return
        }

        try {
            const user = await UserModel.getById(req.authenticatedUser.id)

            user.firstName = values.firstName
            user.lastName = values.lastName
            user.email = values.email
            await UserModel.update(user)

            res.status(200).json({
                message: "Profile updated."
            })
        } catch (error) {
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(409).json({
                    message: "An account with that email already exists."
                })
                return
            }

            if (error == "not found") {
                res.status(404).json({
                    message: "Account not found."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Profile could not be updated."
            })
        }
    }

    /**
     * Update only the fields present in the body. A PATCH with no recognised
     * field is rejected rather than silently doing nothing.
     * @type {express.RequestHandler}
     */
    static async patchSelf(req, res) {
        const body = req.body ?? {}
        const schema = {}

        if (body.firstName !== undefined) schema.firstName = Validation.text("First name", { max: 80 })
        if (body.lastName !== undefined) schema.lastName = Validation.text("Last name", { max: 80 })
        if (body.email !== undefined) schema.email = Validation.email()

        if (Object.keys(schema).length == 0) {
            res.status(400).json({
                message: "Provide at least one of firstName, lastName or email."
            })
            return
        }

        const { values, errors, isValid } = Validation.run(body, schema)

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return
        }

        try {
            const user = await UserModel.getById(req.authenticatedUser.id)

            if (values.firstName !== undefined) user.firstName = values.firstName
            if (values.lastName !== undefined) user.lastName = values.lastName
            if (values.email !== undefined) user.email = values.email

            await UserModel.update(user)

            res.status(200).json({
                message: "Profile updated."
            })
        } catch (error) {
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(409).json({
                    message: "An account with that email already exists."
                })
                return
            }

            if (error == "not found") {
                res.status(404).json({
                    message: "Account not found."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Profile could not be updated."
            })
        }
    }
}
