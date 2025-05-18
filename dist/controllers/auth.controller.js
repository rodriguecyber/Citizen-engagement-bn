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
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getCurrentUser = exports.createAdmin = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const organization_1 = __importDefault(require("../models/organization"));
// Hardcoded JWT secret (for development only)
const JWT_SECRET = process.env.JWT_SECRET;
// Generate JWT token
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
        email: user.email,
        role: user.role,
    }, JWT_SECRET, { expiresIn: "24h" });
};
// Register a new citizen user
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, password, phone, province, district, sector, cell, village } = req.body;
        // Check if user already exists
        const userExists = yield user_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: "User already exists with this email" });
            return;
        }
        // Create new user
        const user = new user_1.default({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: "citizen",
            location: {
                province,
                district,
                sector,
                cell,
                village,
            },
        });
        yield user.save();
        // Generate token
        const token = generateToken(user);
        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});
exports.register = register;
// Login user
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield user_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify password
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        // Generate token
        const token = generateToken(user);
        // Return user info based on role
        const userData = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
        };
        // Add additional info for admins
        if (user.role === "orgadmin") {
            const organization = yield organization_1.default.findOne({ admin: user._id });
            if (organization) {
                userData.organization = {
                    id: organization._id,
                    name: organization.name,
                };
            }
        }
        res.status(200).json({
            message: "Login successful",
            token,
            user: userData,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
});
exports.login = login;
// Create admin user (for superadmin to create org admin)
const createAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, phone, role, organizationId } = req.body;
        // Generate default password
        const defaultPassword = "ChangeMe123!";
        // Create admin user
        const user = new user_1.default({
            firstName,
            lastName,
            email,
            password: defaultPassword,
            phone,
            role,
            organization: organizationId,
        });
        yield user.save();
        // If this is an org admin, update the organization
        if (role === "orgadmin" && organizationId) {
            yield organization_1.default.findByIdAndUpdate(organizationId, { admin: user._id });
        }
        res.status(201).json({
            message: "Admin user created successfully",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Create admin error:", error);
        res.status(500).json({ message: "Server error during admin creation" });
    }
});
exports.createAdmin = createAdmin;
// Additional methods for auth.controller.ts
// Get current user
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_1.default.findById(req.user.id)
            .select("-password -__v")
            .populate("organization", "name")
            .populate("district", "name")
            .populate("sector", "name");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({ message: "Server error fetching user profile" });
    }
});
exports.getCurrentUser = getCurrentUser;
// Change password
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: "Current password and new password are required" });
            return;
        }
        const user = yield user_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify current password
        const isMatch = yield user.comparePassword(currentPassword);
        if (!isMatch) {
            res.status(401).json({ message: "Current password is incorrect" });
            return;
        }
        // Update password
        user.password = newPassword;
        yield user.save();
        res.status(200).json({ message: "Password changed successfully" });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Server error changing password" });
    }
});
exports.changePassword = changePassword;
// Forgot password
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required" });
            return;
        }
        const user = yield user_1.default.findOne({ email });
        // For security reasons, i don't reveal that the user doesn't exist
        if (!user) {
            res.status(200).json({ message: "If your email is registered, you will receive a password reset link" });
            return;
        }
        // Generate reset token (in a real app, you would store this securely)
        const resetToken = Math.random().toString(36).substring(2, 15);
        // For this example, we'll just simulate success
        res.status(200).json({ message: "If your email is registered, you will receive a password reset link" });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Server error processing password reset request" });
    }
});
exports.forgotPassword = forgotPassword;
// Reset password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ message: "Token and new password are required" });
            return;
        }
        // For this example, we'll just simulate success
        res.status(200).json({ message: "Password has been reset successfully" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error resetting password" });
    }
});
exports.resetPassword = resetPassword;
