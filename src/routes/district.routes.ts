import express from "express"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { districtController } from "../controllers/district.controller"

const router = express.Router()

// Get all districts
router.get("/", authenticate, districtController.getAllDistricts)

// Create district (org admin only)
router.post("/", authenticate, authorize("orgadmin"), districtController.createDistrict)

// Get district by ID
router.get("/:id", authenticate, districtController.getDistrictById)

// Update district
router.put("/:id", authenticate, authorize("orgadmin"), districtController.updateDistrict)

// Delete district (org admin only)
router.delete("/:id", authenticate, authorize("orgadmin"), districtController.deleteDistrict)

// Get district sectors
router.get("/:id/sectors", authenticate, districtController.getDistrictSectors)

// Get district statistics
router.get("/:id/statistics", authenticate, districtController.getDistrictStats)

// Assign admin to district
router.post("/:id/assign-admin", authenticate, authorize("orgadmin"), districtController.assignAdminToDistrict)

export default router