import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {

    try {
        if (!localFilePath) return null

        // Check if the file exists
        if (!fs.existsSync(localFilePath)) {
            console.error("File does not exist:", localFilePath);
            return null;
        }

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // file has been uploaded successfully

        console.log("Cloudinary upload response:", response);
        
        
        fs.unlinkSync(localFilePath)
        return response
        

    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);

        // remove the locally saved temporary file 
        
        fs.unlinkSync(localFilePath);
        
        return null;
    }
}

export { uploadOnCloudinary }