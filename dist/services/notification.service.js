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
exports.sendSystemNotification = exports.createComplaintUpdateNotification = exports.createNotification = void 0;
const notification_1 = __importDefault(require("../models/notification"));
const user_1 = __importDefault(require("../models/user"));
const complaint_1 = __importDefault(require("../models/complaint"));
const email_service_1 = require("./email.service");
// Create notification for a user
const createNotification = (recipientId, title, message, type, relatedComplaintId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Create notification in database
        const notification = new notification_1.default({
            recipient: recipientId,
            title,
            message,
            type,
            relatedComplaint: relatedComplaintId,
        });
        yield notification.save();
        // Get user info for email notification
        const user = yield user_1.default.findById(recipientId);
        if (user && user.email) {
            // Send email notification
            yield (0, email_service_1.sendEmail)(user.email, title, message);
        }
        return notification;
    }
    catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
});
exports.createNotification = createNotification;
// Create complaint update notification
const createComplaintUpdateNotification = (complaintId, updateType, message, updatedBy) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const complaint = yield complaint_1.default.findById(complaintId);
        if (!complaint) {
            throw new Error("Complaint not found");
        }
        // Get relevant title based on update type
        let title;
        switch (updateType) {
            case "status_change":
                title = `Complaint #${complaint.title} status updated`;
                break;
            case "comment":
                title = `New comment on your complaint #${complaint.title}`;
                break;
            case "escalation":
                title = `Complaint #${complaint.title} has been escalated`;
                break;
            case "resolution":
                title = `Complaint #${complaint.title} has been resolved`;
                break;
            default:
                title = `Update on your complaint #${complaint.title}`;
        }
        // If updated by admin, notify citizen
        if (updatedBy === complaint.citizen.toString()) {
            // Notify sector admin
            const sectorAdmins = yield user_1.default.find({ sector: complaint.sector, role: "sectoradmin" });
            for (const admin of sectorAdmins) {
                //@ts-ignore
                yield (0, exports.createNotification)(admin._id.toString(), title, message, updateType, complaintId);
            }
        }
        else {
            // Notify citizen
            yield (0, exports.createNotification)(complaint.citizen.toString(), title, message, updateType, complaintId);
        }
        return true;
    }
    catch (error) {
        console.error("Error creating complaint update notification:", error);
        throw error;
    }
});
exports.createComplaintUpdateNotification = createComplaintUpdateNotification;
// Send system notification to multiple users
const sendSystemNotification = (recipientIds, title, message, relatedComplaintId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = [];
        for (const recipientId of recipientIds) {
            const notification = yield (0, exports.createNotification)(recipientId, title, message, "system", relatedComplaintId);
            notifications.push(notification);
        }
        return notifications;
    }
    catch (error) {
        console.error("Error sending system notification:", error);
        throw error;
    }
});
exports.sendSystemNotification = sendSystemNotification;
