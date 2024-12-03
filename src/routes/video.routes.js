/*
This is where all the video related routes will be defined. 
Here, we will define the routes for video publishing, updating video and related
tasks
 */

import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { 
    deleteVideo, 
    getAllVideos, 
    getVideoById, 
    publishAVideo, 
    togglePublishStatus, 
    updateVideoDetails, 
    updateVideoThumbnail } from "../controllers/video.controller"

const router = Router()

router.use(verifyJWT) //^ apply verify JWT middleware to all the routes here

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "thumbnail",
                maxCount: 1
            },
            {
                name: "videoFile",
                maxCount: 1
            }
        ])
        , publishAVideo)

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(updateVideoDetails)

router.route("/updateThumbnail/:videoId").patch(upload.single("thumbnail"), updateVideoThumbnail)

router.route("/togglePublish/:videoId").patch(togglePublishStatus)