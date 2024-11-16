/*
    1.User uploads file → Multer handles upload.
    2.Multer stores file temporarily → Validates file.
    3.Validated file → Uploaded to Cloudinary.
    4.Cloudinary processes file → Returns URL.
    5.URL stored in database → File served from Cloudinary CDN.
    6Think of Multer as the "file handler" and Cloudinary as the "file host".
 */

import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // cb(null, "/public/temp")
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

export const upload = multer({ 
    storage 
})