import express from "express"
import  {sectorController} from "../controllers/sector.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"

const router = express.Router()

// Get all sectors
router.get("/", authenticate, sectorController.getAllSectors)

// Create sector (district admin only)
router.post("/", authenticate, authorize("districtadmin"), sectorController.createSector)

// Get sector by ID
router.get("/:id", authenticate, sectorController.getSectorById)

// Update sector
router.put("/:id", authenticate, authorize("districtadmin"), sectorController.updateSector)

// Delete sector (district admin only)
router.delete("/:id", authenticate, authorize("districtadmin"), sectorController.deleteSector)

// Get sector citizens
router.get("/:id/citizens", authenticate, authorize("sectoradmin"), sectorController.getSectorUsers)

// Get sector statistics
router.get("/:id/statistics", authenticate, sectorController.getSectorStats)

// Assign admin to sector
router.post("/:id/assign-admin", authenticate, authorize("districtadmin"), sectorController.assignAdminToSector)

export default router