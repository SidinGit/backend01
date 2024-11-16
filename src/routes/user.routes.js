/*
This is where all the user routes will be defined. 
Here, we will define the routes for user registration, login, logout, etc.
 */
import { Router } from "express"
import { registerUser } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)// here upload is the middleware defined in multer.middleware.js
// router.route("/login").post(login) // todo: login is not defined yet inside user.controller.js

export default router