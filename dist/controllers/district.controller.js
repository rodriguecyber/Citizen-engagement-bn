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
exports.districtController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const district_1 = __importDefault(require("../models/district"));
const sector_1 = __importDefault(require("../models/sector"));
const user_1 = __importDefault(require("../models/user"));
const complaint_1 = __importDefault(require("../models/complaint"));
const organization_1 = __importDefault(require("../models/organization"));
exports.districtController = {
    // Get all districts with pagination and filtering
    getAllDistricts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search, sortBy = "name", sortOrder = "asc" } = req.query;
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = {};
            // Add search functionality
            if (search) {
                filter.name = { $regex: search, $options: "i" };
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const districts = yield district_1.default.find(filter)
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNum);
            // Get sector counts for each district
            const districtsWithCounts = yield Promise.all(districts.map((district) => __awaiter(void 0, void 0, void 0, function* () {
                const sectorCount = yield sector_1.default.countDocuments({ district: district._id });
                const userCount = yield user_1.default.countDocuments({ district: district._id });
                const complaintCount = yield complaint_1.default.countDocuments({ district: district._id });
                return Object.assign(Object.assign({}, district.toObject()), { sectorCount,
                    userCount,
                    complaintCount });
            })));
            const total = yield district_1.default.countDocuments(filter);
            res.status(200).json({
                districts: districtsWithCounts,
                totalPages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                totalDistricts: total,
            });
        }
        catch (error) {
            console.error("Error getting districts:", error);
            res.status(500).json({ message: "Failed to get districts", error: error.message });
        }
    }),
    // Get district by ID
    getDistrictById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            // Get additional information
            const sectorCount = yield sector_1.default.countDocuments({ district: district._id });
            const userCount = yield user_1.default.countDocuments({ district: district._id });
            const complaintCount = yield complaint_1.default.countDocuments({ district: district._id });
            const districtWithCounts = Object.assign(Object.assign({}, district.toObject()), { sectorCount,
                userCount,
                complaintCount });
            res.status(200).json(districtWithCounts);
        }
        catch (error) {
            console.error("Error getting district:", error);
            res.status(500).json({ message: "Failed to get district", error: error.message });
        }
    }),
    // Create a new district
    createDistrict: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, province } = req.body;
            // Check if district already exists
            const existingDistrict = yield district_1.default.findOne({ name });
            if (existingDistrict) {
                res.status(400).json({ message: "District with this name already exists" });
                return;
            }
            // Create new district
            const newDistrict = new district_1.default({
                name,
                province,
                organization: req.user.organization,
            });
            const organization = yield organization_1.default.findById(newDistrict.organization);
            organization === null || organization === void 0 ? void 0 : organization.districts.push(newDistrict._id);
            yield newDistrict.save();
            res.status(201).json({
                message: "District created successfully",
                district: newDistrict,
            });
        }
        catch (error) {
            console.error("Error creating district:", error);
            res.status(500).json({ message: "Failed to create district", error: error.message });
        }
    }),
    // Update district
    updateDistrict: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { name, description, location, contactInfo } = req.body;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            // Check if name is being changed and if it's already in use
            if (name && name !== district.name) {
                const existingDistrict = yield district_1.default.findOne({ name });
                if (existingDistrict) {
                    res.status(400).json({ message: "District name is already in use" });
                    return;
                }
            }
            // Update district
            const updatedDistrict = yield district_1.default.findByIdAndUpdate(id, {
                name: name || district.name,
                //@ts-ignore
                description: description || district.description,
                //@ts-ignore
                location: location || district.location,
                //@ts-ignore
                contactInfo: contactInfo || district.contactInfo,
                updatedAt: new Date(),
            }, { new: true });
            res.status(200).json({
                message: "District updated successfully",
                district: updatedDistrict,
            });
        }
        catch (error) {
            console.error("Error updating district:", error);
            res.status(500).json({ message: "Failed to update district", error: error.message });
        }
    }),
    // Delete district
    deleteDistrict: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            // Check if district has sectors
            const sectorCount = yield sector_1.default.countDocuments({ district: id });
            if (sectorCount > 0) {
                res.status(400).json({
                    message: "Cannot delete district with associated sectors. Please delete all sectors first.",
                    sectorCount,
                });
                return;
            }
            // Check if district has users
            const userCount = yield user_1.default.countDocuments({ district: id });
            if (userCount > 0) {
                res.status(400).json({
                    message: "Cannot delete district with associated users. Please reassign or delete users first.",
                    userCount,
                });
                return;
            }
            // Check if district has complaints
            const complaintCount = yield complaint_1.default.countDocuments({ district: id });
            if (complaintCount > 0) {
                res.status(400).json({
                    message: "Cannot delete district with associated complaints.",
                    complaintCount,
                });
                return;
            }
            // Delete district
            yield district_1.default.findByIdAndDelete(id);
            res.status(200).json({ message: "District deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting district:", error);
            res.status(500).json({ message: "Failed to delete district", error: error.message });
        }
    }),
    // Get sectors in a district
    getDistrictSectors: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, search, sortBy = "name", sortOrder = "asc" } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = { district: id };
            // Add search functionality
            if (search) {
                filter.name = { $regex: search, $options: "i" };
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const sectors = yield sector_1.default.find(filter)
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNum);
            // Get counts for each sector
            const sectorsWithCounts = yield Promise.all(
            //@ts-ignore
            sectors.map((sector) => __awaiter(void 0, void 0, void 0, function* () {
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
            console.error("Error getting district sectors:", error);
            res.status(500).json({ message: "Failed to get district sectors", error: error.message });
        }
    }),
    // Get complaints in a district
    getDistrictComplaints: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, status, priority, category, sortBy = "createdAt", sortOrder = "desc", startDate, endDate, } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = { district: id };
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
            console.error("Error getting district complaints:", error);
            res.status(500).json({ message: "Failed to get district complaints", error: error.message });
        }
    }),
    // Get district statistics
    getDistrictStats: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            // Basic counts
            const sectorCount = yield sector_1.default.countDocuments({ district: id });
            const userCount = yield user_1.default.countDocuments({ district: id });
            const complaintCount = yield complaint_1.default.countDocuments({ district: id });
            // Complaints by status
            const complaintsByStatus = yield complaint_1.default.aggregate([
                {
                    $match: { district: new mongoose_1.default.Types.ObjectId(id) },
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
                    $match: { district: new mongoose_1.default.Types.ObjectId(id) },
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
                    $match: { district: new mongoose_1.default.Types.ObjectId(id) },
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
                        district: new mongoose_1.default.Types.ObjectId(id),
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
                        district: new mongoose_1.default.Types.ObjectId(id),
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
                districtName: district.name,
                sectorCount,
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
            console.error("Error getting district statistics:", error);
            res.status(500).json({ message: "Failed to get district statistics", error: error.message });
        }
    }),
    // Get district users
    getDistrictUsers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, role, search, sortBy = "lastName", sortOrder = "asc" } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid district ID" });
                return;
            }
            // Check if district exists
            const district = yield district_1.default.findById(id);
            if (!district) {
                res.status(404).json({ message: "District not found" });
                return;
            }
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = { district: id };
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
                .populate("sector", "name")
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
            console.error("Error getting district users:", error);
            res.status(500).json({ message: "Failed to get district users", error: error.message });
        }
    }),
    assignAdminToDistrict: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, phone, email } = req.body;
            const admin = new user_1.default({
                firstName: name.split(' ')[0],
                lastName: name.split(' ').filter((n, index) => index !== 0).join(' ') || ' ',
                phone,
                password: 'ChangeMe123!',
                role: 'districtadmin',
                email,
                district: req.params.id
            });
            yield district_1.default.findOneAndUpdate({ organization: req.user.organization }, {
                active: true,
                admin: admin._id
            });
            yield admin.save();
            res.status(200).json({ message: "distict get admin" });
        }
        catch (error) {
            res.status(500).json({ message: "Failed to assign admin to district", error: error.message });
        }
    })
};
