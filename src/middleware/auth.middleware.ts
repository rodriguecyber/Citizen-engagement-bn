import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import User from "../models/user"

// Hardcoded JWT secret (for development only)
const JWT_SECRET = process.env.JWT_SECRET! 

interface DecodedToken {
  id: string
  email: string
  role: string
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

// Authenticate JWT token
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
       res.status(401).json({ message: "No token provided, authorization denied" })

       return
    }

    const token = authHeader.split(" ")[1]

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken

    // Add user to request
    const user = await User.findById(decoded.id).select("-password")
    if (!user) {
       res.status(404).json({ message: "User not found" })
       return
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Authentication error:", error)
    res.status(401).json({ message: "Invalid token, authorization denied" })
  }
}

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Access denied, insufficient permissions" })
      return
    }

    next()
  }
}
