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
exports.createTestNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotificationCount = exports.getUserNotifications = void 0;
const notification_1 = __importDefault(require("../models/notification"));
const notification_service_1 = require("../services/notification.service");
// Get all notifications for a user
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const page = Number.parseInt(req.query.page) || 1;
        const limit = Number.parseInt(req.query.limit) || 10;
        const unreadOnly = req.query.unread === "true";
        const query = { recipient: userId };
        if (unreadOnly) {
            Object.assign(query, { read: false });
        }
        const total = yield notification_1.default.countDocuments(query);
        const notifications = yield notification_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("relatedComplaint", "complaintId title");
        const unreadCount = yield notification_1.default.countDocuments({
            recipient: userId,
            read: false,
        });
        res.status(200).json({
            notifications,
            meta: {
                total,
                unreadCount,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Get user notifications error:", error);
        res.status(500).json({ message: "Server error fetching notifications" });
    }
});
exports.getUserNotifications = getUserNotifications;
// Get notification count for a user
const getNotificationCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const unreadCount = yield notification_1.default.countDocuments({
            recipient: userId,
            read: false,
        });
        res.status(200).json({
            unreadCount,
        });
    }
    catch (error) {
        console.error("Get notification count error:", error);
        res.status(500).json({ message: "Server error fetching notification count" });
    }
});
exports.getNotificationCount = getNotificationCount;
// Mark notification as read
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;
        const notification = yield notification_1.default.findOneAndUpdate({ _id: notificationId, recipient: userId }, { read: true }, { new: true });
        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        res.status(200).json({ message: "Notification marked as read", notification });
    }
    catch (error) {
        console.error("Mark notification error:", error);
        res.status(500).json({ message: "Server error marking notification as read" });
    }
});
exports.markAsRead = markAsRead;
// Mark all notifications as read
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        yield notification_1.default.updateMany({ recipient: userId, read: false }, { read: true });
        res.status(200).json({ message: "All notifications marked as read" });
    }
    catch (error) {
        console.error("Mark all notifications error:", error);
        res.status(500).json({ message: "Server error marking notifications as read" });
    }
});
exports.markAllAsRead = markAllAsRead;
// Delete a notification
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;
        const notification = yield notification_1.default.findOneAndDelete({
            _id: notificationId,
            recipient: userId,
        });
        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        res.status(200).json({ message: "Notification deleted successfully" });
    }
    catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({ message: "Server error deleting notification" });
    }
});
exports.deleteNotification = deleteNotification;
// Create a test notification (for development purposes)
const createTestNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, message, type = "system" } = req.body;
        const userId = req.user.id;
        const notification = yield (0, notification_service_1.createNotification)(userId, title, message, type);
        res.status(201).json({
            message: "Test notification created successfully",
            notification,
        });
    }
    catch (error) {
        console.error("Create test notification error:", error);
        res.status(500).json({ message: "Server error creating test notification" });
    }
});
exports.createTestNotification = createTestNotification;
