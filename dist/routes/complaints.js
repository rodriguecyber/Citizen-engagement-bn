"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const complaintController = __importStar(require("../controllers/complaint.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const rod_fileupload_1 = require("rod-fileupload");
const cloudinary_1 = require("../config/cloudinary");
const router = express_1.default.Router();
// Create a new complaint (citizens only)
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("citizen"), (0, rod_fileupload_1.uploadMultiple)('documents', cloudinary_1.cloudinaryConfig), complaintController.createComplaint);
// Get all complaints for a citizen
router.get("/citizen", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("citizen", 'sectoradmin'), complaintController.getCitizenComplaints);
// Get all complaints for a sector admin
router.get("/sector", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("sectoradmin"), complaintController.getSectorComplaints);
// Get all complaints for a district admin
router.get("/district", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("districtadmin"), complaintController.getDistrictComplaints);
// Get all complaints for an organization admin
router.get("/organization", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orgadmin"), complaintController.getOrganizationComplaints);
// Get complaint statistics
// router.get("/statistics", authenticate, complaintController.getComplaintStatistics)
// Get complaint details
router.get("/:id", auth_middleware_1.authenticate, complaintController.getComplaintDetails);
// Update complaint status (admins only)
router.patch("/:id/status", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("sectoradmin", "districtadmin", "orgadmin", "superadmin"), complaintController.updateComplaintStatus);
// Add comment to a complaint
router.post("/:id/comments", auth_middleware_1.authenticate, complaintController.addComment);
// Escalate a complaint
router.post("/:id/escalate", auth_middleware_1.authenticate, complaintController.escalateComplaint);
exports.default = router;
