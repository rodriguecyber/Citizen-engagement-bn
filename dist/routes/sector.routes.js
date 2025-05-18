"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sector_controller_1 = require("../controllers/sector.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Get all sectors
router.get("/", auth_middleware_1.authenticate, sector_controller_1.sectorController.getAllSectors);
// Create sector (district admin only)
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("districtadmin"), sector_controller_1.sectorController.createSector);
// Get sector by ID
router.get("/:id", auth_middleware_1.authenticate, sector_controller_1.sectorController.getSectorById);
// Update sector
router.put("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("districtadmin"), sector_controller_1.sectorController.updateSector);
// Delete sector (district admin only)
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("districtadmin"), sector_controller_1.sectorController.deleteSector);
// Get sector citizens
router.get("/:id/citizens", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("sectoradmin"), sector_controller_1.sectorController.getSectorUsers);
// Get sector statistics
router.get("/:id/statistics", auth_middleware_1.authenticate, sector_controller_1.sectorController.getSectorStats);
// Assign admin to sector
router.post("/:id/assign-admin", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("districtadmin"), sector_controller_1.sectorController.assignAdminToSector);
exports.default = router;
