import express from "express"
import * as notificationController from "../controllers/notification.controller"
import { authenticate } from "../middleware/auth.middleware"

const router = express.Router()

// Get all notifications for the authenticated user
router.get("/", authenticate, notificationController.getUserNotifications)

// Get notification count for the authenticated user
router.get("/count", authenticate, notificationController.getNotificationCount)

// Mark notification as read
router.patch("/:notificationId/read", authenticate, notificationController.markAsRead)

// Mark all notifications as read
router.patch("/read-all", authenticate, notificationController.markAllAsRead)

// Delete a notification
router.delete("/:notificationId", authenticate, notificationController.deleteNotification)

// Create test notification (for development)
router.post("/test", authenticate, notificationController.createTestNotification)

export default router
