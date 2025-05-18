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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateComplaint = exports.removeFile = exports.addComment = exports.updateComplaintStatus = exports.getComplaintDetails = exports.getOrganizationComplaints = exports.getDistrictComplaints = exports.getSectorComplaints = exports.getCitizenComplaints = exports.createComplaint = void 0;
const complaint_1 = __importStar(require("../models/complaint"));
const user_1 = __importDefault(require("../models/user"));
const organization_1 = __importDefault(require("../models/organization"));
const sector_1 = __importDefault(require("../models/sector"));
const mongoose_1 = __importDefault(require("mongoose"));
const notification_service_1 = require("../services/notification.service");
// Function to generate complaint ID
const generateComplaintId = () => __awaiter(void 0, void 0, void 0, function* () {
    const year = new Date().getFullYear();
    const count = yield complaint_1.default.countDocuments({
        createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
        },
    });
    return `CM-${year}-${(count + 1).toString().padStart(3, "0")}`;
});
// Create a new complaint
const createComplaint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, description, organization, service } = req.body;
        const userId = req.user.id;
        // Get user details
        const user = yield user_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Ensure user is a citizen
        if (user.role !== "citizen") {
            res.status(403).json({ message: "Only citizens can create complaints" });
            return;
        }
        // Get user's sector
        if (!((_a = user.location) === null || _a === void 0 ? void 0 : _a.sector)) {
            res.status(400).json({ message: "User's sector is required to create a complaint" });
            return;
        }
        // Get organization details
        const org = yield organization_1.default.findById(organization);
        if (!org) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        // Find sector admin to assign the complaint
        const userSector = yield sector_1.default.findOne({ name: user.location.sector });
        let sectorId = userSector === null || userSector === void 0 ? void 0 : userSector._id;
        let districtId;
        if (!sectorId) {
            // If sector not found, create a placeholder
            console.warn(`Sector ${user.location.sector} not found in database`);
            sectorId = new mongoose_1.default.Types.ObjectId();
        }
        else {
            districtId = userSector === null || userSector === void 0 ? void 0 : userSector.district;
        }
        // Create new complaint
        const complaint = new complaint_1.default({
            complaintId: generateComplaintId(),
            title,
            description,
            service,
            organization,
            citizen: userId,
            sector: sectorId,
            district: districtId,
            attachments: req.body['documents'].map((att) => att.url),
            status: complaint_1.ComplaintStatus.RECEIVED,
            escalationLevel: complaint_1.EscalationLevel.SECTOR,
            comments: [{
                    text: "Complaint submitted",
                    user: userId,
                    role: "citizen",
                    createdAt: new Date()
                }]
        });
        yield complaint.save();
        // Notify sector admin (implementation depends on your notification system)
        const sectorAdmin = yield user_1.default.findOne({ role: 'sector_admin', sector: sectorId });
        if (sectorAdmin) {
            yield (0, notification_service_1.createComplaintUpdateNotification)(complaint._id, 'status_change', 'new complaints', sectorAdmin._id);
        }
        res.status(201).json({
            message: "Complaint created successfully",
            complaint: {
                id: complaint._id,
                title: complaint.title,
                status: complaint.status,
                createdAt: complaint.createdAt,
            },
        });
    }
    catch (error) {
        console.error("Create complaint error:", error);
        res.status(500).json({ message: "Server error during complaint creation" });
    }
});
exports.createComplaint = createComplaint;
// Get all complaints for a citizen
const getCitizenComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const complaints = yield complaint_1.default.find({ citizen: userId })
            .populate("organization", "name")
            .populate({
            path: 'comments.user',
            select: 'firstName lastName role'
        })
            .sort({ createdAt: -1 })
            .select("-__v");
        res.status(200).json(complaints);
    }
    catch (error) {
        console.error("Get citizen complaints error:", error);
        res.status(500).json({ message: "Server error fetching complaints" });
    }
});
exports.getCitizenComplaints = getCitizenComplaints;
// Get complaints for sector admin
const getSectorComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.user;
        // Ensure user is a sector admin
        if (req.user.role !== "sectoradmin") {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        // Get admin's sector
        if (!admin || !admin.sector) {
            res.status(400).json({ message: "Admin's sector not found" });
            return;
        }
        console.log(admin);
        const complaints = yield complaint_1.default.find({
            sector: admin.sector,
            escalationLevel: complaint_1.EscalationLevel.SECTOR
        })
            .populate("organization", "name")
            .populate("citizen", "firstName lastName email phone")
            .sort({ createdAt: -1 })
            .select("-__v");
        res.status(200).json(complaints);
    }
    catch (error) {
        console.error("Get sector complaints error:", error);
        res.status(500).json({ message: "Server error fetching complaints" });
    }
});
exports.getSectorComplaints = getSectorComplaints;
// Get complaints for district admin
const getDistrictComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Ensure user is a district admin
        if (req.user.role !== "districtadmin") {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        // Get admin's district
        const admin = yield user_1.default.findById(userId);
        if (!admin || !admin.district) {
            res.status(400).json({ message: "Admin's district not found" });
            return;
        }
        const complaints = yield complaint_1.default.find({
            $or: [
                { district: admin.district, escalationLevel: complaint_1.EscalationLevel.DISTRICT },
                { escalateToDistrict: true }
            ]
        })
            .populate("organization", "name")
            .populate("citizen", "firstName lastName email phone")
            .populate("sector", "name")
            .sort({ createdAt: -1 })
            .select("-__v");
        res.status(200).json(complaints);
    }
    catch (error) {
        console.error("Get district complaints error:", error);
        res.status(500).json({ message: "Server error fetching complaints" });
    }
});
exports.getDistrictComplaints = getDistrictComplaints;
// Get complaints for organization admin
const getOrganizationComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Ensure user is an organization admin
        if (req.user.role !== "org_admin") {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        // Get admin's organization
        const organization = yield organization_1.default.findOne({ admin: userId });
        if (!organization) {
            res.status(400).json({ message: "Admin's organization not found" });
            return;
        }
        const complaints = yield complaint_1.default.find({
            $or: [
                { organization: organization._id, escalationLevel: complaint_1.EscalationLevel.ORGANIZATION },
                { escalateToOrg: true }
            ]
        })
            .populate("citizen", "firstName lastName email phone")
            .populate("district", "name province")
            .populate("sector", "name")
            .sort({ createdAt: -1 })
            .select("-__v");
        res.status(200).json(complaints);
    }
    catch (error) {
        console.error("Get organization complaints error:", error);
        res.status(500).json({ message: "Server error fetching complaints" });
    }
});
exports.getOrganizationComplaints = getOrganizationComplaints;
// Get complaint details
const getComplaintDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const complaint = yield complaint_1.default.findById(id)
            .populate("organization", "name")
            .populate("citizen", "firstName lastName email phone")
            .populate("district", "name province")
            .populate("sector", "name")
            .populate("assignedTo", "firstName lastName email")
            .populate("comments.user", "firstName lastName role");
        if (!complaint) {
            res.status(404).json({ message: "Complaint not found" });
            return;
        }
        // Check if user has access to this complaint
        const hasAccess = yield canUserAccessComplaint(userId, userRole, complaint);
        if (!hasAccess) {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        res.status(200).json(complaint);
    }
    catch (error) {
        console.error("Get complaint details error:", error);
        res.status(500).json({ message: "Server error fetching complaint details" });
    }
});
exports.getComplaintDetails = getComplaintDetails;
// Update complaint status
const updateComplaintStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;
        const complaint = yield complaint_1.default.findById(id);
        if (!complaint) {
            res.status(404).json({ message: "Complaint not found" });
            return;
        }
        // Update complaint
        complaint.status = status;
        complaint.comments.push({
            text: `Status updated to ${status}`,
            user: userId,
            role: userRole,
            createdAt: new Date()
        });
        if (status === complaint_1.ComplaintStatus.RESOLVED) {
            complaint.resolvedAt = new Date();
            // complaint.resolution = resolution
        }
        yield complaint.save();
        // Notify relevant users
        res.status(200).json({
            message: "Complaint status updated successfully",
            complaint: {
                id: complaint._id,
                status: complaint.status,
                updatedAt: complaint.updatedAt
            }
        });
    }
    catch (error) {
        console.error("Update complaint status error:", error);
        res.status(500).json({ message: "Server error updating complaint status" });
    }
});
exports.updateComplaintStatus = updateComplaintStatus;
// Add comment to complaint with optional file attachments
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { text, files } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const complaint = yield complaint_1.default.findById(id);
        if (!complaint) {
            res.status(404).json({ message: "Complaint not found" });
            return;
        }
        // Check if user has access to comment on this complaint
        const hasAccess = yield canUserAccessComplaint(userId, userRole, complaint);
        if (!hasAccess) {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        // Add comment with attachments
        const newComment = {
            text,
            user: userId,
            role: userRole,
            createdAt: new Date(),
            //@ts-ignore
            attachments: files.map(file => file.url)
        };
        complaint.comments.push(newComment);
        yield complaint.save();
        res.status(200).json({
            message: "Comment added successfully",
            comment: newComment
        });
    }
    catch (error) {
        console.error("Add comment error:", error);
        res.status(500).json({ message: "Server error adding comment" });
    }
});
exports.addComment = addComment;
// Remove file from complaint
const removeFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { fileUrl } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const complaint = yield complaint_1.default.findById(id);
        if (!complaint) {
            res.status(404).json({ message: "Complaint not found" });
            return;
        }
        // Check if user has access to remove files from this complaint
        const hasAccess = yield canUserAccessComplaint(userId, userRole, complaint);
        if (!hasAccess) {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        // Remove file from attachments array
        complaint.attachments = (complaint.attachments || []).filter(url => url !== fileUrl);
        // Remove file from comments that reference it
        complaint.comments = complaint.comments.map(comment => (Object.assign(Object.assign({}, comment), { attachments: (comment.attachments || []).filter(url => url !== fileUrl) })));
        yield complaint.save();
        res.status(200).json({
            message: "File removed successfully"
        });
    }
    catch (error) {
        console.error("Remove file error:", error);
        res.status(500).json({ message: "Server error removing file" });
    }
});
exports.removeFile = removeFile;
// Escalate complaint
const escalateComplaint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason, escalateTo } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const complaint = yield complaint_1.default.findById(id);
        if (!complaint) {
            res.status(404).json({ message: "Complaint not found" });
            return;
        }
        // Update escalation details
        const newLevel = getNextEscalationLevel(complaint.escalationLevel);
        complaint.escalationLevel = newLevel;
        // Only set originalLocation if both district and sector exist
        const originalLocation = complaint.district && complaint.sector ? {
            district: complaint.district,
            sector: complaint.sector
        } : undefined;
        complaint.escalationDetails = {
            level: newLevel,
            reason,
            requestedBy: userRole,
            timestamp: new Date(),
            originalLocation
        };
        // Set escalation flags
        if (newLevel === complaint_1.EscalationLevel.DISTRICT) {
            complaint.escalateToDistrict = true;
        }
        else if (newLevel === complaint_1.EscalationLevel.ORGANIZATION) {
            complaint.escalateToOrg = true;
        }
        // Add comment about escalation
        complaint.comments.push({
            text: `Complaint escalated to ${newLevel} level. Reason: ${reason}`,
            user: userId,
            role: userRole,
            createdAt: new Date()
        });
        yield complaint.save();
        // Notify relevant users
        res.status(200).json({
            message: "Complaint escalated successfully",
            escalationLevel: newLevel
        });
    }
    catch (error) {
        console.error("Escalate complaint error:", error);
        res.status(500).json({ message: "Server error escalating complaint" });
    }
});
exports.escalateComplaint = escalateComplaint;
// Helper functions
const canUserAccessComplaint = (userId, userRole, complaint) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    // Citizens can only access their own complaints
    if (userRole === "citizen") {
        return complaint.citizen.toString() === userId;
    }
    // Sector admins can access complaints in their sector
    if (userRole === "sector_admin") {
        const admin = yield user_1.default.findById(userId);
        return ((_a = admin === null || admin === void 0 ? void 0 : admin.sector) === null || _a === void 0 ? void 0 : _a.toString()) === ((_b = complaint.sector) === null || _b === void 0 ? void 0 : _b.toString());
    }
    // District admins can access complaints in their district or escalated to district
    if (userRole === "district_admin") {
        const admin = yield user_1.default.findById(userId);
        return ((_c = admin === null || admin === void 0 ? void 0 : admin.district) === null || _c === void 0 ? void 0 : _c.toString()) === ((_d = complaint.district) === null || _d === void 0 ? void 0 : _d.toString()) ||
            complaint.escalateToDistrict;
    }
    // Organization admins can access complaints for their organization or escalated to org
    if (userRole === "org_admin") {
        const org = yield organization_1.default.findOne({ admin: userId }).exec();
        return ((_e = org === null || org === void 0 ? void 0 : org._id) === null || _e === void 0 ? void 0 : _e.toString()) === complaint.organization.toString() ||
            complaint.escalateToOrg;
    }
    return false;
});
const getNextEscalationLevel = (currentLevel) => {
    const escalationFlow = {
        [complaint_1.EscalationLevel.SECTOR]: complaint_1.EscalationLevel.DISTRICT,
        [complaint_1.EscalationLevel.DISTRICT]: complaint_1.EscalationLevel.ORGANIZATION,
        [complaint_1.EscalationLevel.ORGANIZATION]: complaint_1.EscalationLevel.ORGANIZATION // Can't escalate further
    };
    return escalationFlow[currentLevel];
};
exports.default = {
    createComplaint: exports.createComplaint,
    getCitizenComplaints: exports.getCitizenComplaints,
    getSectorComplaints: exports.getSectorComplaints,
    getDistrictComplaints: exports.getDistrictComplaints,
    getOrganizationComplaints: exports.getOrganizationComplaints,
    getComplaintDetails: exports.getComplaintDetails,
    updateComplaintStatus: exports.updateComplaintStatus,
    addComment: exports.addComment,
    removeFile: exports.removeFile,
    escalateComplaint: exports.escalateComplaint
};
