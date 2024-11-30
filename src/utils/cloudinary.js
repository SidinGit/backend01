// all the tasks related to file upload will be taken care of here
// actually the user uploads a file from their device to the local server(front end) and then
// the file is uploaded to cloudinary
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

//* Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

//* Uploading files from public/temp to cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        // upload the file on cloudinary
        const uploadResult = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        // file has been uploaded successfully
        // console.log("File uploaded successfully: ",uploadResult.url)
        // unlink(delete) the local temporary file
        fs.unlinkSync(localFilePath)
        return uploadResult
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the local temporary file as the upload failed
        console.log("uploadOnCloudinary error: ",error)
        return null
    }
}

//* Deleting files from cloudinary
const deleteFromCloudinary = async (url, resource_type="image") => {
    const publicId = url.split("/").pop().split(".")[0] //^ extract the public id from the url
    const resource_extension = url.split("/").pop().split(".")[1].toLowerCase() //^extract the resource extension from the url
    
    if (![// Image extensions
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        
        // Video extensions
        "mp4",
        "mov",
        "mkv",
        "webm",
        "avi"].includes(resource_extension)) {
        throw new Error(`unsupported extension: ${resource_extension}, try jpg, jpeg, png, gif, webp, mp4, mov, mkv, webm, avi)`);
    }

    try {
        const deleteResult = await cloudinary.uploader.destroy(
            publicId,
            {
                resource_type: resource_type
            }
        )
    console.log(`${resource_type} file '${publicId}' deleted successfully: `,deleteResult)
    } catch (error) {
        console.log("deleteFromCloudinary error: ",error)
    }
}

export {
    uploadOnCloudinary,
    deleteFromCloudinary
}