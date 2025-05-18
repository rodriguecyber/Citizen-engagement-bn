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

// Get citizens by sector (sector admin only)
// router.get("/sector/:sectorId/citizens", authenticate, authorize("sectoradmin"), userController.getCitizensBySector)

// Get admins by organization (org admin only)
// router.get("/organization/:orgId/admins", authenticate, authorize("orgadmin"), userController.getAdminsByOrganization)

// Get admins by district (district admin only)
// router.get("/district/:districtId/admins", authenticate, authorize("districtadmin"), userController.getAdminsByDistrt)

export default router