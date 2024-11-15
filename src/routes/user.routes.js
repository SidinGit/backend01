/*
This is where all the user routes will be defined. 
Here, we will define the routes for user registration, login, logout, etc.
 */
import { Router } from "express"
import { registerUser } from "../controllers/user.controller.js"

const router = Router()

router.route("/register").post(registerUser)
// router.route("/login").post(login) // todo: login is not defined yet inside user.controller.js

export default router