"use strict";
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
exports.sectorController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const sector_1 = __importDefault(require("../models/sector"));
const user_1 = __importDefault(require("../models/user"));
const complaint_1 = __importDefault(require("../models/complaint"));
const district_1 = __importDefault(require("../models/district"));
exports.sectorController = {
    // Get all sectors with pagination and filtering
    getAllSectors: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, district, search, sortBy = "name", sortOrder = "asc" } = req.query;
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = {};
            if (district)
                filter.district = district;
            // Add search functionality
            if (search) {
                filter.name = { $regex: search, $options: "i" };
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const sectors = yield sector_1.default.find(filter)
                .populate("district", "name")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNum);
            // Get counts for each sector
            const sectorsWithCounts = yield Promise.all(sectors.map((sector) => __awaiter(void 0, void 0, void 0, function* () {
                const userCount = yield user_1.default.countDocuments({ sector: sector._id });
                const complaintCount = yield complaint_1.default.countDocuments({ sector: sector._id });
                return Object.assign(Object.assign({}, sector.toObject()), { userCount,
                    complaintCount });
            })));
            const total = yield sector_1.default.countDocuments(filter);
            res.status(200).json({
                sectors: sectorsWithCounts,
                totalPages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                totalSectors: total,
            });
        }
        catch (error) {
            console.error("Error getting sectors:", error);
            res.status(500).json({ message: "Failed to get sectors", error: error.message });
        }
    }),
    // Get sector by ID
    getSectorById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            const sector = yield sector_1.default.findById(id).populate("district", "name");
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            // Get additional information
            const userCount = yield user_1.default.countDocuments({ sector: sector._id });
            const complaintCount = yield complaint_1.default.countDocuments({ sector: sector._id });
            const sectorWithCounts = Object.assign(Object.assign({}, sector.toObject()), { userCount,
                complaintCount });
            res.status(200).json(sectorWithCounts);
        }
        catch (error) {
            console.error("Error getting sector:", error);
            res.status(500).json({ message: "Failed to get sector", error: error.message });
        }
    }),
    // Create a new sector
    createSector: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, email, phone, district } = req.body;
            // Check if district exists
            if (!mongoose_1.default.Types.ObjectId.isValid(district)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            const districtExists = yield district_1.default.findById(district);
            if (!districtExists) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            // Check if sector already exists in this district
            const existingSector = yield sector_1.default.findOne({ name, district });
            if (existingSector) {
                res.status(400).json({ message: "Sector with this name already exists in this district" });
                return;
            }
            // Create new sector
            const newSector = new sector_1.default({
                name,
                district,
            });
            yield newSector.save();
            // Return with district information
            const sectorWithDistrict = yield sector_1.default.findById(newSector._id).populate("district", "name");
            res.status(201).json({
                message: "Sector created successfully",
                sector: sectorWithDistrict,
            });
        }
        catch (error) {
            console.error("Error creating sector:", error);
            res.status(500).json({ message: "Failed to create sector", error: error.message });
        }
    }),
    // Update sector
    updateSector: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { name, description, district, contactInfo } = req.body;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            // Check if sector exists
            const sector = yield sector_1.default.findById(id);
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            // If district is being changed, check if it exists
            if (district && district !== sector.district.toString()) {
                if (!mongoose_1.default.Types.ObjectId.isValid(district)) {
                    res.status(400).json({ message: "Invalid district ID" });
                    return;
                }
                const districtExists = yield district_1.default.findById(district);
                if (!districtExists) {
                    res.status(404).json({ message: "District not found" });
                    return;
                }
                // Check if sector name already exists in new district
                if (name) {
                    const existingSector = yield sector_1.default.findOne({ name, district });
                    //@ts-ignore
                    if (existingSector && existingSector._id.toString() !== id) {
                        res.status(400).json({ message: "Sector with this name already exists in the selected district" });
                        return;
                    }
                }
            }
            else if (name && name !== sector.name) {
                // Check if sector name already exists in same district
                const existingSector = yield sector_1.default.findOne({
                    name,
                    district: sector.district,
                });
                //@ts-ignore
                if (existingSector && existingSector._id.toString() !== id) {
                    res.status(400).json({ message: "Sector with this name already exists in this district" });
                    return;
                }
            }
            // Update sector
            const updatedSector = yield sector_1.default.findByIdAndUpdate(id, {
                name: name || sector.name,
                //@ts-ignore
                description: description || sector.description,
                district: district || sector.district,
                //@ts-ignore
                contactInfo: contactInfo || sector.contactInfo,
                updatedAt: new Date(),
            }, { new: true }).populate("district", "name");
            res.status(200).json({
                message: "Sector updated successfully",
                sector: updatedSector,
            });
        }
        catch (error) {
            console.error("Error updating sector:", error);
            res.status(500).json({ message: "Failed to update sector", error: error.message });
        }
    }),
    // Delete sector
    deleteSector: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            // Check if sector exists
            const sector = yield sector_1.default.findById(id);
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            // Check if sector has users
            const userCount = yield user_1.default.countDocuments({ sector: id });
            if (userCount > 0) {
                res.status(400).json({
                    message: "Cannot delete sector with associated users. Please reassign or delete users first.",
                    userCount,
                });
                return;
            }
            // Check if sector has complaints
            const complaintCount = yield complaint_1.default.countDocuments({ sector: id });
            if (complaintCount > 0) {
                res.status(400).json({
                    message: "Cannot delete sector with associated complaints.",
                    complaintCount,
                });
                return;
            }
            // Delete sector
            yield sector_1.default.findByIdAndDelete(id);
            res.status(200).json({ message: "Sector deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting sector:", error);
            res.status(500).json({ message: "Failed to delete sector", error: error.message });
        }
    }),
    // Get complaints in a sector
    getSectorComplaints: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, status, priority, category, sortBy = "createdAt", sortOrder = "desc", startDate, endDate, } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            // Check if sector exists
            const sector = yield sector_1.default.findById(id);
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = { sector: id };
            if (status)
                filter.status = status;
            if (priority)
                filter.priority = priority;
            if (category)
                filter.category = category;
            // Date filtering
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate)
                    filter.createdAt.$gte = new Date(startDate);
                if (endDate)
                    filter.createdAt.$lte = new Date(endDate);
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const complaints = yield complaint_1.default.find(filter)
                .populate("submittedBy", "firstName lastName email")
                .populate("district", "name")
                .populate("sector", "name")
                .populate("assignedTo", "firstName lastName")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNum);
            const total = yield complaint_1.default.countDocuments(filter);
            res.status(200).json({
                complaints,
                totalPages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                totalComplaints: total,
            });
        }
        catch (error) {
            console.error("Error getting sector complaints:", error);
            res.status(500).json({ message: "Failed to get sector complaints", error: error.message });
        }
    }),
    // Get sector statistics
    getSectorStats: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            // Check if sector exists
            const sector = yield sector_1.default.findById(id).populate("district", "name");
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            // Basic counts
            const userCount = yield user_1.default.countDocuments({ sector: id });
            const complaintCount = yield complaint_1.default.countDocuments({ sector: id });
            // Complaints by status
            const complaintsByStatus = yield complaint_1.default.aggregate([
                {
                    $match: { sector: new mongoose_1.default.Types.ObjectId(id) },
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        status: "$_id",
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            // Complaints by priority
            const complaintsByPriority = yield complaint_1.default.aggregate([
                {
                    $match: { sector: new mongoose_1.default.Types.ObjectId(id) },
                },
                {
                    $group: {
                        _id: "$priority",
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        priority: "$_id",
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            // Complaints by category
            const complaintsByCategory = yield complaint_1.default.aggregate([
                {
                    $match: { sector: new mongoose_1.default.Types.ObjectId(id) },
                },
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        category: "$_id",
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            // Complaints over time (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const complaintsOverTime = yield complaint_1.default.aggregate([
                {
                    $match: {
                        sector: new mongoose_1.default.Types.ObjectId(id),
                        createdAt: { $gte: thirtyDaysAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
                {
                    $project: {
                        date: "$_id",
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            // Resolution time statistics
            const resolutionStats = yield complaint_1.default.aggregate([
                {
                    $match: {
                        sector: new mongoose_1.default.Types.ObjectId(id),
                        status: "resolved",
                        resolvedAt: { $exists: true },
                    },
                },
                {
                    $project: {
                        resolutionTime: {
                            $divide: [
                                { $subtract: ["$resolvedAt", "$createdAt"] },
                                1000 * 60 * 60 * 24, // Convert to days
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgResolutionTime: { $avg: "$resolutionTime" },
                        minResolutionTime: { $min: "$resolutionTime" },
                        maxResolutionTime: { $max: "$resolutionTime" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                    },
                },
            ]);
            res.status(200).json({
                sectorName: sector.name,
                //@ts-ignore
                districtName: sector.district.name,
                userCount,
                complaintCount,
                complaintsByStatus,
                complaintsByPriority,
                complaintsByCategory,
                complaintsOverTime,
                resolutionStats: resolutionStats[0] || {
                    avgResolutionTime: 0,
                    minResolutionTime: 0,
                    maxResolutionTime: 0,
                },
            });
        }
        catch (error) {
            console.error("Error getting sector statistics:", error);
            res.status(500).json({ message: "Failed to get sector statistics", error: error.message });
        }
    }),
    // Get sector users
    getSectorUsers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, role, search, sortBy = "lastName", sortOrder = "asc" } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid sector ID" });
                return;
            }
            // Check if sector exists
            const sector = yield sector_1.default.findById(id);
            if (!sector) {
                res.status(404).json({ message: "Sector not found" });
                return;
            }
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = { sector: id };
            if (role)
                filter.role = role;
            // Add search functionality
            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const users = yield user_1.default.find(filter)
                .select("-password")
                .populate("district", "name")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNum);
            const total = yield user_1.default.countDocuments(filter);
            res.status(200).json({
                users,
                totalPages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                totalUsers: total,
            });
        }
        catch (error) {
            console.error("Error getting sector users:", error);
            res.status(500).json({ message: "Failed to get sector users", error: error.message });
        }
    }),
    assignAdminToSector: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { firstName, lastName, phone, email } = req.body;
            const admin = new user_1.default({
                firstName,
                lastName,
                phone,
                password: 'ChangeMe123!',
                role: 'sectoradmin',
                email,
                sector: req.params.id
            });
            yield sector_1.default.findByIdAndUpdate(req.params.id, {
                active: true,
                admin: admin._id
            });
            yield admin.save();
            res.status(200).json({ message: "distict get admin", admin
            });
        }
        catch (error) {
            res.status(500).json({ message: "Failed to assign admin to district", error: error.message });
        }
    })
};
