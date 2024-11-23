/*
This is where all the user routes will be defined. 
Here, we will define the routes for user registration, login, logout, etc.
 */
import { Router } from "express"
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
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

router.route("/login").post( loginUser )

// secured routes
router.route("/logout").post( verifyJWT, logoutUser ) // verifyJWT is the middleware defined in auth.middleware.js
router.route("/refresh-token").post( refreshAccessToken ) // verifyJWT is already in use inside refreshAccessToken controller
router.route("/change-password").post( verifyJWT, changeCurrentPassword )
router.route("/current-user").get( verifyJWT, getCurrentUser )
router.route("/update-account").patch( verifyJWT, updateAccountDetails ) // only selected fields will be updated unlike post method
router.route("/avatar").patch( verifyJWT, upload.single("avatar"), updateUserAvatar ) //(middleware1, middleware2, controller)
router.route("/cover-image").patch( verifyJWT, upload.single("coverImage"), updateUserCoverImage )
router.route("/c/:username").get( verifyJWT, getUserChannelProfile ) // whatever username is passed after ':' will be received through params
router.route("/history").get( verifyJWT, getWatchHistory )

export default router