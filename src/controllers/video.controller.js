/*  //& Read this
    Here we will write controllers for video related routes
    We will leverage the asyncHandler util and other utils files to wrap our code
    Comments written: 
    1. for reasoning //^
    2. for steps //*
    3. for other approaches //!
*/

import mongoose, { isValidObjectId } from "mongoose" // ^ mongoose is a database

//* import from utils
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

//* import from models
import { Video } from "../models/video.model.js" 
import { User } from "../models/user.model.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    //* validation of title and description
    if(title.trim()===""){
        throw new ApiError(400, "Title is required")
    }
    if(description.trim()===""){
        throw new ApiError(400, "Description is required")
    }

    //* check if we have files(video, thumbnail) on public folder, video is compulsory
    const videoFileLocalPath = req.files?.videoFile[0]?.path

    let thumbnailLocalPath
    if( req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video is required")
    }

    //* upload the files on cloudinary, also check if video is uploaded to cloudinary successfully
    const uploadedVideo = await uploadOnCloudinary(videoFileLocalPath)
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!uploadedVideo){
        throw new ApiError(400, "could not upload the video to cloud, please try again")
    }

    //* create the video object
    const video = await Video.create({
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url || "",
        title,
        description,
        duration: uploadedVideo.duration,
        owner: req.user._id
    })

    //* check if video object is created on db successfully
    const createdVideo = await Video.findById(video._id)
    if(!createdVideo){
        throw new ApiError(500, "Something went wrong while creating the video, please try again")
    }

    //* return response
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            createdVideo,
            "Video published successfully"
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId) || !isValidObjectId(req.user._id)){ //^ check if video id or the user id is valid
        throw new ApiError(400, "Invalid request")
    }

    // further processing

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}