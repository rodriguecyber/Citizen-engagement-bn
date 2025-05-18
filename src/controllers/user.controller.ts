import type { Request, Response } from "express"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { sendEmail } from "../services/email.service"
import User from "../models/user"
import Complaint from "../models/complaint"
import Notification from "../models/notification"

export const userController = {
    
  // Get all users with pagination and filtering
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        district,
        sector,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = {}

      if (role) filter.role = role
      if (district) filter.district = district
      if (sector) filter.sector = sector

      // Add search functionality
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ]
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const users = await User.find(filter)
        .select("-password")
        .populate("district", "name")
        .populate("sector", "name")
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      const total = await User.countDocuments(filter)

      res.status(200).json({
        users,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalUsers: total,
      })
    } catch (error) {
      console.error("Error getting users:", error)
      res.status(500).json({ message: "Failed to get users", error: (error as Error).message })
    }
  },

  // Get user by ID
  getUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid user ID" })
         return
      }

      const user = await User.findById(id).select("-password").populate("district", "name").populate("sector", "name")

      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      res.status(200).json(user)
    } catch (error) {
      console.error("Error getting user:", error)
      res.status(500).json({ message: "Failed to get user", error: (error as Error).message })
    }
  },

  // Create a new user (admin function)
  createUser: async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password, phone, role, district, sector, address } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
         res.status(400).json({ message: "User with this email already exists" })
         return
      }

      // Hash password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      // Create new user
      const newUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role,
        district: district || null,
        sector: sector || null,
        address: address || {},
        isActive: true,
      })

      await newUser.save()

      // Send welcome email
      await sendEmail(
         email,
         "Welcome to Citizen Engagement Platform",
         `Hello ${firstName},\n\nYour account has been created successfully. Your temporary password is: ${password}\n\nPlease login and change your password immediately.\n\nRegards,\nCitizen Engagement Platform Team`,
      )

      res.status(201).json({
        message: "User created successfully",
        user: {
          ...newUser.toObject(),
          password: undefined,
        },
      })
    } catch (error) {
      console.error("Error creating user:", error)
      res.status(500).json({ message: "Failed to create user", error: (error as Error).message })
    }
  },

  // Update user
  updateUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { firstName, lastName, email, phone, role, district, sector, address, isActive } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid user ID" })
         return
      }

      // Check if user exists
      const user = await User.findById(id)
      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      // Check if email is being changed and if it's already in use
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
           res.status(400).json({ message: "Email is already in use" })
           return
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          email: email || user.email,
          phone: phone || user.phone,
          role: role || user.role,
          district: district || user.district,
          sector: sector || user.sector,
          //@ts-ignore
          address: address || user.address,
          //@ts-ignore
          isActive: isActive !== undefined ? isActive : user.isActive,
          updatedAt: new Date(),
        },
        { new: true },
      ).select("-password")

      res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      res.status(500).json({ message: "Failed to update user", error: (error as Error).message })
    }
  },

  // Delete user
  deleteUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid user ID" })
         return
      }

      // Check if user exists
      const user = await User.findById(id)
      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      // Check if user has complaints
      const complaintsCount = await Complaint.countDocuments({ submittedBy: id })
      if (complaintsCount > 0) {
        // Soft delete - deactivate user instead of deleting
        await User.findByIdAndUpdate(id, { isActive: false })
         res.status(200).json({ message: "User has been deactivated because they have associated complaints" })
         return
      }

      // Hard delete if no complaints
      await User.findByIdAndDelete(id)

      // Delete user's notifications
      await Notification.deleteMany({ user: id })

      res.status(200).json({ message: "User deleted successfully" })
    } catch (error) {
      console.error("Error deleting user:", error)
      res.status(500).json({ message: "Failed to delete user", error: (error as Error).message })
    }
  },

  // Change user password
  changePassword: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { currentPassword, newPassword } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid user ID" })
         return
      }

      // Check if user exists
      const user = await User.findById(id)
      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
         res.status(400).json({ message: "Current password is incorrect" })
         return
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)

      // Update password
      user.password = hashedPassword
      user.updatedAt = new Date()
      await user.save()

      res.status(200).json({ message: "Password changed successfully" })
    } catch (error) {
      console.error("Error changing password:", error)
      res.status(500).json({ message: "Failed to change password", error: (error as Error).message })
    }
  },

  // Reset user password (admin function)
  resetPassword: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid user ID" })
         return
      }

      // Check if user exists
      const user = await User.findById(id)
      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      // Generate random password
      const tempPassword = Math.random().toString(36).slice(-8)

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(tempPassword, salt)

      // Update password
      user.password = hashedPassword
      user.updatedAt = new Date()
      await user.save()

      // Send email with new password
      await sendEmail(
        user.email,
         "Password Reset - Citizen Engagement Platform",
     `Hello ${user.firstName},\n\nYour password has been reset. Your new temporary password is: ${tempPassword}\n\nPlease login and change your password immediately.\n\nRegards,\nCitizen Engagement Platform Team`,
      )

      res
        .status(200)
        .json({ message: "Password reset successfully. A temporary password has been sent to the user's email." })
    } catch (error) {
      console.error("Error resetting password:", error)
      res.status(500).json({ message: "Failed to reset password", error: (error as Error).message })
    }
  },

  // Get user profile (for logged in user)
  getProfile: async (req: Request, res: Response) => {
    try {
      // @ts-ignore - req.user is set by auth middleware
      const userId = req.user.id

      const user = await User.findById(userId)
        .select("-password")
        .populate("district", "name")
        .populate("sector", "name")

      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      res.status(200).json(user)
    } catch (error) {
      console.error("Error getting profile:", error)
      res.status(500).json({ message: "Failed to get profile", error: (error as Error).message })
    }
  },

  // Update user profile (for logged in user)
  updateProfile: async (req: Request, res: Response) => {
    try {
      // @ts-ignore - req.user is set by auth middleware
      const userId = req.user.id
      const { firstName, lastName, phone, address } = req.body

      const user = await User.findById(userId)
      if (!user) {
         res.status(404).json({ message: "User not found" })
         return
      }

      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          phone: phone || user.phone,
          //@ts-ignore
          address: address || user.address,
          updatedAt: new Date(),
        },
        { new: true },
      ).select("-password")

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      res.status(500).json({ message: "Failed to update profile", error: (error as Error).message })
    }
  },

  // Get user statistics
  getUserStats: async (req: Request, res: Response) => {
    try {
      // Total users count
      const totalUsers = await User.countDocuments()

      // Users by role
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            role: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ])

      // Active vs inactive users
      const activeUsers = await User.countDocuments({ isActive: true })
      const inactiveUsers = await User.countDocuments({ isActive: false })

      // Users registered in the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const newUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      })

      // Users by district
      const usersByDistrict = await User.aggregate([
        {
          $match: {
            district: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$district",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "districts",
            localField: "_id",
            foreignField: "_id",
            as: "districtInfo",
          },
        },
        {
          $project: {
            districtId: "$_id",
            districtName: { $arrayElemAt: ["$districtInfo.name", 0] },
            count: 1,
            _id: 0,
          },
        },
      ])

      res.status(200).json({
        totalUsers,
        usersByRole,
        activeUsers,
        inactiveUsers,
        newUsers,
        usersByDistrict,
      })
    } catch (error) {
      console.error("Error getting user statistics:", error)
      res.status(500).json({ message: "Failed to get user statistics", error: (error as Error).message })
    }
  },
  
}
