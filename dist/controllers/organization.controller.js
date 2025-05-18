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
exports.getOrganizationDistricts = exports.getOrganizationStatistics = exports.deleteOrganization = exports.updateOrganization = exports.getOrganizationById = exports.getOrganizations = exports.createOrganization = void 0;
const organization_1 = __importDefault(require("../models/organization"));
const user_1 = __importDefault(require("../models/user"));
const district_1 = __importDefault(require("../models/district"));
const sector_1 = __importDefault(require("../models/sector"));
// Create a new organization with admin
const createOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, services, location, email, tel } = req.body;
        // Check if organization already exists
        const organizationExists = yield organization_1.default.findOne({ name });
        if (organizationExists) {
            res.status(400).json({ message: "Organization already exists with this name" });
            return;
        }
        // Create organization without admin initially
        const organization = new organization_1.default({
            name,
            services: services.split(",").map((service) => service.trim()),
            location,
            email,
            tel,
        });
        yield organization.save();
        const adminUser = new user_1.default({
            firstName: "Admin",
            lastName: name,
            email: email,
            password: "ChangeMe123!",
            phone: tel,
            role: "orgadmin",
            organization: organization._id,
        });
        yield adminUser.save();
        // Update organization with admin reference
        //@ts-ignore
        organization.admin = adminUser._id;
        yield organization.save();
        res.status(201).json({
            message: "Organization created successfully with admin account",
            organization: {
                id: organization._id,
                name: organization.name,
                admin: {
                    id: adminUser._id,
                    email: adminUser.email,
                },
            },
        });
    }
    catch (error) {
        console.error("Create organization error:", error);
        res.status(500).json({ message: "Server error during organization creation" });
    }
});
exports.createOrganization = createOrganization;
// Get all organizations
const getOrganizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizations = yield organization_1.default.find()
            .populate("admin", "firstName lastName email phone")
            .populate({
            path: "districts",
            populate: {
                path: "sectors",
                model: "Sector",
            },
        })
            .select("-__v");
        res.status(200).json(organizations);
    }
    catch (error) {
        console.error("Get organizations error:", error);
        res.status(500).json({ message: "Server error fetching organizations" });
    }
});
exports.getOrganizations = getOrganizations;
// Get organization by ID
const getOrganizationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organization = yield organization_1.default.findById(req.params.id)
            .populate("admin", "firstName lastName email phone")
            .populate("districts")
            .select("-__v");
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        res.status(200).json(organization);
    }
    catch (error) {
        console.error("Get organization error:", error);
        res.status(500).json({ message: "Server error fetching organization" });
    }
});
exports.getOrganizationById = getOrganizationById;
// Update organization
const updateOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, services, location, email, tel, maxServiceDays } = req.body;
        const organization = yield organization_1.default.findById(req.params.id);
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        // Update fields
        if (name)
            organization.name = name;
        if (services)
            organization.services = services.split(",").map((service) => service.trim());
        if (location)
            organization.location = location;
        if (email)
            organization.email = email;
        if (tel)
            organization.tel = tel;
        // if (maxServiceDays) organization.maxServiceDays = maxServiceDays
        yield organization.save();
        res.status(200).json({
            message: "Organization updated successfully",
            organization,
        });
    }
    catch (error) {
        console.error("Update organization error:", error);
        res.status(500).json({ message: "Server error updating organization" });
    }
});
exports.updateOrganization = updateOrganization;
// Delete organization
const deleteOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organization = yield organization_1.default.findById(req.params.id);
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        // Delete associated admin user
        if (organization.admin) {
            yield user_1.default.findByIdAndDelete(organization.admin);
        }
        yield organization_1.default.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Organization deleted successfully" });
    }
    catch (error) {
        console.error("Delete organization error:", error);
        res.status(500).json({ message: "Server error deleting organization" });
    }
});
exports.deleteOrganization = deleteOrganization;
// Additional methods for organization.controller.ts
// Get organization statistics
const getOrganizationStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.params.id;
        const organization = yield organization_1.default.findById(organizationId);
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        // Count districts
        const districtCount = yield district_1.default.countDocuments({ organization: organizationId });
        // Count sectors
        const sectors = yield sector_1.default.find().populate({
            path: "district",
            match: { organization: organizationId },
        });
        const sectorCount = sectors.filter((sector) => sector.district).length;
        // Count admins
        const adminCount = yield user_1.default.countDocuments({
            $or: [
                { role: "orgadmin", organization: organizationId },
                { role: "districtadmin", organization: organizationId },
                { role: "sectoradmin", organization: organizationId },
            ],
        });
        // Get complaint statistics (if complaint model exists)
        // This is a placeholder - to be implemented later
        const complaintStats = {
            total: 0,
            resolved: 0,
            pending: 0,
            resolutionRate: 0,
        };
        res.status(200).json({
            districtCount,
            sectorCount,
            adminCount,
            complaintStats,
        });
    }
    catch (error) {
        console.error("Get organization statistics error:", error);
        res.status(500).json({ message: "Server error fetching organization statistics" });
    }
});
exports.getOrganizationStatistics = getOrganizationStatistics;
// Get organization districts
const getOrganizationDistricts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.params.id;
        const organization = yield organization_1.default.findById(organizationId);
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        const districts = yield district_1.default.find({ organization: organizationId })
            .populate("admin", "firstName lastName email phone")
            .select("-__v");
        res.status(200).json(districts);
    }
    catch (error) {
        console.error("Get organization districts error:", error);
        res.status(500).json({ message: "Server error fetching organization districts" });
    }
});
exports.getOrganizationDistricts = getOrganizationDistricts;
