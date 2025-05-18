import express from "express"
import * as authController from "../controllers/auth.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"

const router = express.Router()

// Public routes
router.post("/register", authController.register)
router.post("/login", authController.login)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", authController.resetPassword)

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser)
router.put("/change-password", authenticate, authController.changePassword)

// Admin routes
router.post("/create-admin", authenticate, authorize("superadmin", "orgadmin", "districtadmin"), authController.createAdmin)

export default router