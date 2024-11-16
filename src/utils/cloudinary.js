// all the tasks related to file upload will be taken care of here
// actually the user uploads a file from their device to the local server(front end) and then
// the file is uploaded to cloudinary
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Upload an image
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
        console.log(error)
        return null
    }
}

export {uploadOnCloudinary}