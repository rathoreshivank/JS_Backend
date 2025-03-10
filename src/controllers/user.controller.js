import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // adding refresh token to user instance of mongoDb user
        user.refreshToken = refreshToken
        // adding refresh token to db
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, error)
    }
};

const registerUser = asyncHandler(async (req, res) => {

    //  get user details form frontend
    console.log("Request body:", req.body);
    const { fullName, email, username, password } = req.body


    //  Validation - not empty

    if (
        [fullName, email, username, password].some((field) => { field?.trim() === "" })
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists: username, email

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        console.log("User already exists:", existedUser); 
        
        throw new ApiError(409, "User with email or username already exist")
    }

    // check for images, check for avatar

    console.log("Request files:", req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // upload them to cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    console.log("avatar: ", avatar);
    console.log("coverImage: ", coverImage);

    if (!avatar) {
        throw new ApiError(400, "Api file is required")
    }

    // create user object - create entry in db

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registerd Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send to cookie

    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Build the query based on which field is provided
    const query = {};
    if (username) query.username = username
    if (email) query.email = email

    console.log("Login attempt with query:", query); // Debug log to see the query

    const user = await User.findOne(query);

    if (!user) {
        console.log("No user found for query:", query); // Debug log when user not found
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Enter correct password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

// Add a utility function to help with debugging - can be commented out or removed in production
const listAllUsers = asyncHandler(async (req, res) => {
    // This should be protected by admin authentication in a real application
    if (process.env.NODE_ENV === "production") {
        throw new ApiError(403, "Not allowed in production");
    }

    const users = await User.find({}, 'email username fullName').limit(20);

    return res.status(200).json(
        new ApiResponse(200, users, `Found ${users.length} users in database`)
    );
});

export { registerUser, loginUser, logOutUser, listAllUsers }