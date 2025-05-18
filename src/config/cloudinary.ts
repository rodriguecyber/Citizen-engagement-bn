import dotenv from 'dotenv'
dotenv.config()
export const cloudinaryConfig ={
  cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
  apiKey: process.env.CLOUDINARY_API_KEY as string,
  apiSecret: process.env.CLOUDINARY_API_SECRET as string, 
}