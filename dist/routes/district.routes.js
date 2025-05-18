"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const district_controller_1 = require("../controllers/district.controller");
const router = express_1.default.Router();
// Get all districts
router.get("/", auth_middleware_1.authenticate, district_controller_1.districtController.getAllDistricts);
// Create district (org admin only)
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orgadmin"), district_controller_1.districtController.createDistrict);
// Get district by ID
router.get("/:id", auth_middleware_1.authenticate, district_controller_1.districtController.getDistrictById);
// Update district
router.put("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orgadmin"), district_controller_1.districtController.updateDistrict);
// Delete district (org admin only)
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orgadmin"), district_controller_1.districtController.deleteDistrict);
// Get district sectors
router.get("/:id/sectors", auth_middleware_1.authenticate, district_controller_1.districtController.getDistrictSectors);
// Get district statistics
router.get("/:id/statistics", auth_middleware_1.authenticate, district_controller_1.districtController.getDistrictStats);
// Assign admin to district
router.post("/:id/assign-admin", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orgadmin"), district_controller_1.districtController.assignAdminToDistrict);
exports.default = router;
