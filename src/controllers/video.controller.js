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
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

//* import from models
import { Video } from "../models/video.model.js" 
import { User } from "../models/user.model.js"

//^ TODO: here we will get all the videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
})

//^ here we will publish a video
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

//^ TODO: here we will get video by id
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
    //TODO: get video by id
}) 

//^ here we will update video details like title, description
const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    
    //* check if the object ids are valid
    if(!isValidObjectId(videoId) || !isValidObjectId(req.user._id)){
        throw new ApiError(400, "Invalid request")
    }

    //* check if the user is the owner of the video
    const videoOwner = await Video.findById(videoId).select("owner")
    if(videoOwner?.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "Unauthorized request")
    }

    //* check if the title and description are present
    if(title.trim()==="" || description.trim()===""){
        throw new ApiError(400, "Title and description are required")
    }

    //^ now we have the video id, title, description
    //* make a call to db and update the required video object fields
    
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title: title,
                description: description,
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video details updated successfully"
        )
    )
})

//^ here we will update the video thumbnail
const updateVideoThumbnail = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const thumbnailLocalPath = req.file?.path

    //* check if the object ids are valid
    if(!isValidObjectId(videoId) || !isValidObjectId(req.user._id)){
        throw new ApiError(400, "Invalid request")
    }

    //* check if the owner of the video is the user
    const videoOwner = await Video.findById(videoId).select("owner")
    if(videoOwner?.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "Unauthorized request")
    }

    //* check if the thumbnail is present
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is missing")
    }

    //* upload the thumbnail on cloudinary
    const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!updatedThumbnail.url){
        throw new ApiError(500, "Something went wrong while uploading the thumbnail, please try again")
    }

    //* here we will extract the old thumbnail url from the db
    const oldThumbnail = await Video.findById(videoId).select("thumbnail")
    const oldThumbnailUrl = oldThumbnail?.thumbnail.toString()
    

    //^ now we have the video id and new thumbnail url
    //* make a call to db and update the required video object fields
    
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                thumbnail: updatedThumbnail.url
            }
        },
        {new: true}
    )

    //* delete the old thumbnail from cloudinary
    if(video && oldThumbnailUrl.trim() !== "" && oldThumbnailUrl.trim() !== updatedThumbnail.url.toString().trim()){
        await deleteFromCloudinary(oldThumbnailUrl)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video thumbnail updated successfully"
        )
    )
})

//^ TODO: here we will delete a video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

//^ TODO: here we will toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideoDetails,
    updateVideoThumbnail,
    deleteVideo,
    togglePublishStatus
}