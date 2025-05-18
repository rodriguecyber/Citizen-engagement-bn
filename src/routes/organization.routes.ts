import express from "express"
import * as organizationController from "../controllers/organization.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"

const router = express.Router()

// Get all organizations (superadmin only)
router.get("/", authenticate, authorize("superadmin",'citizen'), organizationController.getOrganizations)

// Create organization (superadmin only)
router.post("/", authenticate, authorize("superadmin"), organizationController.createOrganization)

// Get organization by ID
router.get("/:id", authenticate, authorize("superadmin", "orgadmin"), organizationController.getOrganizationById)

// Update organization
router.put("/:id", authenticate, authorize("superadmin", "orgadmin"), organizationController.updateOrganization)

// Delete organization (superadmin only)
router.delete("/:id", authenticate, authorize("superadmin"), organizationController.deleteOrganization)

// Get organization statistics
router.get("/:id/statistics", authenticate, authorize("superadmin", "orgadmin"), organizationController.getOrganizationStatistics)

// Get organization districts
router.get("/:id/districts", authenticate, authorize("superadmin", "orgadmin"), organizationController.getOrganizationDistricts)

export default router