import express from "express"
import * as complaintController from "../controllers/complaint.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { uploadMultiple } from "rod-fileupload"
import { cloudinaryConfig } from "../config/cloudinary" 

const router = express.Router()

// Create a new complaint (citizens only)
router.post("/", authenticate, authorize("citizen"),uploadMultiple('documents',cloudinaryConfig), complaintController.createComplaint)

// Get all complaints for a citizen
router.get("/citizen", authenticate, authorize("citizen",'sectoradmin'), complaintController.getCitizenComplaints)

// Get all complaints for a sector admin
router.get("/sector", authenticate, authorize("sectoradmin"), complaintController.getSectorComplaints)

// Get all complaints for a district admin
router.get("/district", authenticate, authorize("districtadmin"), complaintController.getDistrictComplaints)

// Get all complaints for an organization admin
router.get("/organization", authenticate, authorize("orgadmin"), complaintController.getOrganizationComplaints)

// Get complaint statistics
// router.get("/statistics", authenticate, complaintController.getComplaintStatistics)

// Get complaint details
router.get("/:id", authenticate, complaintController.getComplaintDetails)

// Update complaint status (admins only)
router.patch(
  "/:id/status",
  authenticate,
  authorize("sectoradmin", "districtadmin", "orgadmin", "superadmin"),
  complaintController.updateComplaintStatus,
)

// Add comment to a complaint
router.post("/:id/comments", authenticate, complaintController.addComment)

// Escalate a complaint
router.post("/:id/escalate", authenticate,  complaintController.escalateComplaint)

// Add feedback to a resolved complaint (citizens only)
// router.post("/:id/feedback", authenticate, authorize("citizen"), complaintController.addFeedback)

// Confirm resolution (citizens only)
// router.post("/:id/confirm-resolution", authenticate, authorize("citizen"), complaintController.confirmResolution)

export default router
