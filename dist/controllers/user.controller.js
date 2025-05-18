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
exports.userController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const email_service_1 = require("../services/email.service");
const user_1 = __importDefault(require("../models/user"));
const complaint_1 = __importDefault(require("../models/complaint"));
const notification_1 = __importDefault(require("../models/notification"));
exports.userController = {
    // Get all users with pagination and filtering
    getAllUsers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, role, district, sector, search, sortBy = "createdAt", sortOrder = "desc", } = req.query;
            const pageNum = Number.parseInt(page);
            const limitNum = Number.parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build filter object
            const filter = {};
            if (role)
                filter.role = role;
            if (district)
                filter.district = district;
            if (sector)
                filter.sector = sector;
            // Add search functionality
            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                ];
            }
            // Determine sort direction
            const sortDirection = sortOrder === "asc" ? 1 : -1;
            const users = yield user_1.default.find(filter)
                .select("-password")
                .populate("district", "name")
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
            console.error("Error getting users:", error);
            res.status(500).json({ message: "Failed to get users", error: error.message });
        }
    }),
    // Get user by ID
    getUserById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid user ID" });
                return;
            }
            const user = yield user_1.default.findById(id).select("-password").populate("district", "name").populate("sector", "name");
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.status(200).json(user);
        }
        catch (error) {
            console.error("Error getting user:", error);
            res.status(500).json({ message: "Failed to get user", error: error.message });
        }
    }),
    // Create a new user (admin function)
    createUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { firstName, lastName, email, password, phone, role, district, sector, address } = req.body;
            // Check if user already exists
            const existingUser = yield user_1.default.findOne({ email });
            if (existingUser) {
                res.status(400).json({ message: "User with this email already exists" });
                return;
            }
            // Hash password
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
            // Create new user
            const newUser = new user_1.default({
                firstName,
                lastName,
                email,
                password: hashedPassword,
                phone,
                role,
                district: district || null,
                sector: sector || null,
                address: address || {},
                isActive: true,
            });
            yield newUser.save();
            // Send welcome email
            yield (0, email_service_1.sendEmail)(email, "Welcome to Citizen Engagement Platform", `Hello ${firstName},\n\nYour account has been created successfully. Your temporary password is: ${password}\n\nPlease login and change your password immediately.\n\nRegards,\nCitizen Engagement Platform Team`);
            res.status(201).json({
                message: "User created successfully",
                user: Object.assign(Object.assign({}, newUser.toObject()), { password: undefined }),
            });
        }
        catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ message: "Failed to create user", error: error.message });
        }
    }),
    // Update user
    updateUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { firstName, lastName, email, phone, role, district, sector, address, isActive } = req.body;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid user ID" });
                return;
            }
            // Check if user exists
            const user = yield user_1.default.findById(id);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Check if email is being changed and if it's already in use
            if (email && email !== user.email) {
                const existingUser = yield user_1.default.findOne({ email });
                if (existingUser) {
                    res.status(400).json({ message: "Email is already in use" });
                    return;
                }
            }
            // Update user
            const updatedUser = yield user_1.default.findByIdAndUpdate(id, {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                email: email || user.email,
                phone: phone || user.phone,
                role: role || user.role,
                district: district || user.district,
                sector: sector || user.sector,
                //@ts-ignore
                address: address || user.address,
                //@ts-ignore
                isActive: isActive !== undefined ? isActive : user.isActive,
                updatedAt: new Date(),
            }, { new: true }).select("-password");
            res.status(200).json({
                message: "User updated successfully",
                user: updatedUser,
            });
        }
        catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ message: "Failed to update user", error: error.message });
        }
    }),
    // Delete user
    deleteUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid user ID" });
                return;
            }
            // Check if user exists
            const user = yield user_1.default.findById(id);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Check if user has complaints
            const complaintsCount = yield complaint_1.default.countDocuments({ submittedBy: id });
            if (complaintsCount > 0) {
                // Soft delete - deactivate user instead of deleting
                yield user_1.default.findByIdAndUpdate(id, { isActive: false });
                res.status(200).json({ message: "User has been deactivated because they have associated complaints" });
                return;
            }
            // Hard delete if no complaints
            yield user_1.default.findByIdAndDelete(id);
            // Delete user's notifications
            yield notification_1.default.deleteMany({ user: id });
            res.status(200).json({ message: "User deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ message: "Failed to delete user", error: error.message });
        }
    }),
    // Change user password
    changePassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { currentPassword, newPassword } = req.body;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid user ID" });
                return;
            }
            // Check if user exists
            const user = yield user_1.default.findById(id);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Verify current password
            const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(400).json({ message: "Current password is incorrect" });
                return;
            }
            // Hash new password
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
            // Update password
            user.password = hashedPassword;
            user.updatedAt = new Date();
            yield user.save();
            res.status(200).json({ message: "Password changed successfully" });
        }
        catch (error) {
            console.error("Error changing password:", error);
            res.status(500).json({ message: "Failed to change password", error: error.message });
        }
    }),
    // Reset user password (admin function)
    resetPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid user ID" });
                return;
            }
            // Check if user exists
            const user = yield user_1.default.findById(id);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Generate random password
            const tempPassword = Math.random().toString(36).slice(-8);
            // Hash new password
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(tempPassword, salt);
            // Update password
            user.password = hashedPassword;
            user.updatedAt = new Date();
            yield user.save();
            // Send email with new password
            yield (0, email_service_1.sendEmail)(user.email, "Password Reset - Citizen Engagement Platform", `Hello ${user.firstName},\n\nYour password has been reset. Your new temporary password is: ${tempPassword}\n\nPlease login and change your password immediately.\n\nRegards,\nCitizen Engagement Platform Team`);
            res
                .status(200)
                .json({ message: "Password reset successfully. A temporary password has been sent to the user's email." });
        }
        catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({ message: "Failed to reset password", error: error.message });
        }
    }),
    // Get user profile (for logged in user)
    getProfile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // @ts-ignore - req.user is set by auth middleware
            const userId = req.user.id;
            const user = yield user_1.default.findById(userId)
                .select("-password")
                .populate("district", "name")
                .populate("sector", "name");
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.status(200).json(user);
        }
        catch (error) {
            console.error("Error getting profile:", error);
            res.status(500).json({ message: "Failed to get profile", error: error.message });
        }
    }),
    // Update user profile (for logged in user)
    updateProfile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // @ts-ignore - req.user is set by auth middleware
            const userId = req.user.id;
            const { firstName, lastName, phone, address } = req.body;
            const user = yield user_1.default.findById(userId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Update user profile
            const updatedUser = yield user_1.default.findByIdAndUpdate(userId, {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                phone: phone || user.phone,
                //@ts-ignore
                address: address || user.address,
                updatedAt: new Date(),
            }, { new: true }).select("-password");
            res.status(200).json({
                message: "Profile updated successfully",
                user: updatedUser,
            });
        }
        catch (error) {
            console.error("Error updating profile:", error);
            res.status(500).json({ message: "Failed to update profile", error: error.message });
        }
    }),
    // Get user statistics
    getUserStats: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Total users count
            const totalUsers = yield user_1.default.countDocuments();
            // Users by role
            const usersByRole = yield user_1.default.aggregate([
                {
                    $group: {
                        _id: "$role",
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        role: "$_id",
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            // Active vs inactive users
            const activeUsers = yield user_1.default.countDocuments({ isActive: true });
            const inactiveUsers = yield user_1.default.countDocuments({ isActive: false });
            // Users registered in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const newUsers = yield user_1.default.countDocuments({
                createdAt: { $gte: thirtyDaysAgo },
            });
            // Users by district
            const usersByDistrict = yield user_1.default.aggregate([
                {
                    $match: {
                        district: { $ne: null },
                    },
                },
                {
                    $group: {
                        _id: "$district",
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "districts",
                        localField: "_id",
                        foreignField: "_id",
                        as: "districtInfo",
                    },
                },
                {
                    $project: {
                        districtId: "$_id",
                        districtName: { $arrayElemAt: ["$districtInfo.name", 0] },
                        count: 1,
                        _id: 0,
                    },
                },
            ]);
            res.status(200).json({
                totalUsers,
                usersByRole,
                activeUsers,
                inactiveUsers,
                newUsers,
                usersByDistrict,
            });
        }
        catch (error) {
            console.error("Error getting user statistics:", error);
            res.status(500).json({ message: "Failed to get user statistics", error: error.message });
        }
    }),
};
