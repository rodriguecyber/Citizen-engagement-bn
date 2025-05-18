import express from "express"
import  {userController} from "../controllers/user.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"

const router = express.Router()

// Get all users (admin only)
router.get("/", authenticate, authorize("superadmin", "orgadmin", "districtadmin", "sectoradmin"), userController.getAllUsers)

// Get user by ID
router.get("/:id", authenticate, userController.getUserById)

// Update user
router.put("/:id", authenticate, userController.updateUser)

// Delete user (admin only)
router.delete("/:id", authenticate, authorize("superadmin", "orgadmin", "districtadmin"), userController.deleteUser)


export default router