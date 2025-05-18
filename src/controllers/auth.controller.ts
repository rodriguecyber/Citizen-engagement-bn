import type { Request, Response } from "express"
import jwt from "jsonwebtoken"
import User, { type IUser } from "../models/user"
import Organization from "../models/organization"

// Hardcoded JWT secret (for development only)
const HARDCODED_JWT_SECRET = "citizen-engagement-jwt-secret-key-2024"
const JWT_SECRET = process.env.JWT_SECRET || HARDCODED_JWT_SECRET

// Generate JWT token
const generateToken = (user: IUser) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  )
}

// Register a new citizen user
export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, phone, province, district, sector, cell, village } = req.body

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
       res.status(400).json({ message: "User already exists with this email" })
       return
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: "citizen",
      location: {
        province,
        district,
        sector,
        cell,
        village,
      },
    })

    await user.save()

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error during registration" })
  }
}

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
       res.status(404).json({ message: "User not found" })
       return
    }

    // Verify password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
       res.status(401).json({ message: "Invalid credentials" })
       return
    }

    // Generate token
    const token = generateToken(user)

    // Return user info based on role
    const userData: any = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    }

    // Add additional info for admins
    if (user.role === "orgadmin") {
      const organization = await Organization.findOne({ admin: user._id })
      if (organization) {
        userData.organization = {
          id: organization._id,
          name: organization.name,
        }
      }
    }

    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
}

// Create admin user (for superadmin to create org admin)
export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, role, organizationId } = req.body

    // Generate default password
    const defaultPassword = "ChangeMe123!"

    // Create admin user
    const user = new User({
      firstName,
      lastName,
      email,
      password: defaultPassword,
      phone,
      role,
      organization: organizationId,
    })

    await user.save()

    // If this is an org admin, update the organization
    if (role === "orgadmin" && organizationId) {
      await Organization.findByIdAndUpdate(organizationId, { admin: user._id })
    }

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Create admin error:", error)
    res.status(500).json({ message: "Server error during admin creation" })
  }
}


// Additional methods for auth.controller.ts

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -__v")
      .populate("organization", "name")
      .populate("district", "name")
      .populate("sector", "name")

    if (!user) {
       res.status(404).json({ message: "User not found" })
       return
    }

    res.status(200).json(user)
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({ message: "Server error fetching user profile" })
  }
}

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
       res.status(400).json({ message: "Current password and new password are required" })
       return
    }

    const user = await User.findById(req.user.id)
    if (!user) {
       res.status(404).json({ message: "User not found" })
       return
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
       res.status(401).json({ message: "Current password is incorrect" })
       return
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.status(200).json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ message: "Server error changing password" })
  }
}

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
       res.status(400).json({ message: "Email is required" })
       return
    }

    const user = await User.findOne({ email })
          // For security reasons, i don't reveal that the user doesn't exist
    if (!user) {
       res.status(200).json({ message: "If your email is registered, you will receive a password reset link" })
    return
      }

    // Generate reset token (in a real app, you would store this securely)
    const resetToken = Math.random().toString(36).substring(2, 15)

    // In a real app, you would:
    // 1. Store the token in the database with an expiration
    // 2. Send an email with a reset link

    // For this example, we'll just simulate success
    res.status(200).json({ message: "If your email is registered, you will receive a password reset link" })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error processing password reset request" })
  }
}

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
       res.status(400).json({ message: "Token and new password are required" })
       return
    }

    // In a real app, you would:
    // 1. Verify the token from the database
    // 2. Check if it's expired
    // 3. Find the user associated with the token

    // For this example, we'll just simulate success
    res.status(200).json({ message: "Password has been reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error resetting password" })
  }
}
