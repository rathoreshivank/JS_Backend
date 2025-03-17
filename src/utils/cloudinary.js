import { v2 as cloudinary } from "cloudinary"
import fs from "fs/promises"
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {

    try {
        if (!localFilePath) throw new ApiError("No file path provided");

        // Check if the file exists
        if (!(await fs.stat(localFilePath).catch(() => false))) {
            throw new ApiError("File does not exist: ${localFilePath}");
        }

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            folder: "avatars"
        })

        // file has been uploaded successfully

        console.log("Cloudinary upload response:", response);
        
        
        await fs.unlink(localFilePath)
        console.log("file uploaded to cloudinary: ", response.secure_url);
        return response
        
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error.message);
        await fs.unlink(localFilePath).catch((unlinkErr) =>
            console.error("Failed to delete local file:", unlinkErr)
        );
        throw error;
    }
}

export { uploadOnCloudinary }