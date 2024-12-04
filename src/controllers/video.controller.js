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
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"


//^ here we will get all the videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    //* here we create a mongo db aggregation pipeline
    const pipeline = [] 

    //* now if query exists we will feed it in the pipeline
    if(query){
        pipeline.push(
            {
                $search: {
                    index: "search-videos",
                    text: {
                        query: query,
                        path: ["title", "description"],
                    },
                },
            }
        )
    }

    //* now if userId exists we will feed it in the pipeline
    if(isValidObjectId(userId)){
        pipeline.push(
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId), //^ this is the userId
                }
            }
        )
    } else {
        throw new ApiError(400, "Invalid userId")
    }

    //* list only published videos
    pipeline.push(
        {
            $match: {
                isPublished: true
            }
        }
    )

    //* now if sortBy and sortType exists we will feed it in the pipeline
    if(sortBy && sortType){
        pipeline.push(
            {
                $sort: { [sortBy] : sortType === "asc" ? 1 : -1 }
            }
        )
    } else {
        pipeline.push( { $sort: { createdAt: -1 } } )
    }

    //* here we only project avatar and username from owner field
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                owner: 0
            }
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    //* debugging
    // Explain the pipeline
    const pipelineExplain = await Video.aggregate(pipeline).explain();
    console.log("Pipeline Explain: ", pipelineExplain);

    // const video = await Video.aggregatePaginate(videoAggregate, options);
    

    // return res
    //     .status(200)
    //     .json(new ApiResponse(200, video, "Videos fetched successfully"));

    //^ manually implementing pagination
    //* get total number of videos
    const totalVideos = await Video.countDocuments();
    const totalPages = Math.ceil(totalVideos / options.limit);
    const offset = (options.page - 1) * options.limit;

    const videos = await videoAggregate.skip(offset).limit(options.limit);

    const pagination = {
        docs: videos,
        totalDocs: totalVideos,
        limit: options.limit,
        page: options.page,
        pagingCounter: options.page,
        totalPages: totalPages,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
        nextPage: options.page < totalPages ? options.page + 1 : null,
        prevPage: options.page > 1 ? options.page - 1 : null
    };

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            pagination, 
            "Videos fetched successfully"
        ));
});


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

//^ here we will get video by id and return it to frontend
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId) || !isValidObjectId(req.user._id)){ //^ check if video id or the user id is valid
        throw new ApiError(400, "Invalid request")
    }

    const userId = req.user._id //^ store the user id, mongo db can not dereference the user id, so we have to do it manually

    //* fetch the video, its likes, comments and other related data from db at once
    //^ so we use mongo db aggregation pipeline, to gather all the data at once
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video" ,
                as: "comments"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField:"_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField:"channel",
                            as: "subscribers"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt:1,
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [userId, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                },
                commentsCount: { $size: "$comments" },
                owner: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    subscribersCount: { $size: "$owner.subscribers" }
                },
                isSubscribed:{
                    $cond: {
                        if: {
                            $in: [userId,"$owner.subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        }
    ])

    //* check if video is valid
    if(!video){
        throw new ApiError(500, "failed to fetch the video, please try again")
    }

    //* update the view count of the video
    await Video.findByIdAndUpdate( videoId, { $inc: { views: 1 } } )

    //* add this video to user's watch history
    await User.findByIdAndUpdate(userId, { $addToSet: {  watchHistory: videoId } })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            "Video fetched successfully"
        )
    )
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
    const oldThumbnailUrl = oldThumbnail?.thumbnail.toString().trim()
    

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
    if(video && (oldThumbnailUrl !== "") && (oldThumbnailUrl !== updatedThumbnail.url.toString().trim())){
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

//^ here we will delete a video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //* check if the object ids are valid
    if(!isValidObjectId(videoId) || !isValidObjectId(req.user._id)){
        throw new ApiError(400, "Invalid request")
    }

    //* check if the user is the owner of the video
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video?.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "Unauthorized request")
    }

    //^now we have to delete the video from cloudinary and the corresponding video object from db

    //* delete the thumbnail and video from cloudinary
    
    const thumbnailUrl = video.thumbnail.toString().trim() //^ cloudinary thumbnail url
    const videoUrl = video.videoFile.toString().trim() //^ cloudinary video url

    if(thumbnailUrl!==""){
        await deleteFromCloudinary(thumbnailUrl)
    }
    if(videoUrl!==""){
        await deleteFromCloudinary(videoUrl, "video")
    }
    console.log("resources deleted from cloudinary")

    //* delete the video, like, comment objects from db
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    await Like.deleteMany({video: videoId})
    await Comment.deleteMany({video: videoId})

    if(!deletedVideo){
        throw new ApiError(500, "Something went wrong while deleting the video, please try again")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedVideo,
            "Video deleted successfully"
        )
    )
})

//^ here we will toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //* check if the object ids are valid
    if( !isValidObjectId(videoId) || !isValidObjectId(req.user._id)){
        throw new ApiError(400, "Invalid request")
    }

    //* check if the owner is the user
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "Unauthorized request")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished: !video.isPublished
            }
        },
        {new: true}
    )

    if(!updatedVideo){
        throw new ApiError(500, "failed to update publish status, please try again")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedVideo,
            `publish status set to ${updatedVideo.isPublished}`
        )
    )

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