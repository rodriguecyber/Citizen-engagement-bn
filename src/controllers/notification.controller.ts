import type { Request, Response } from "express"
import Notification from "../models/notification"
import { createNotification } from "../services/notification.service"

// Get all notifications for a user
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 10
    const unreadOnly = req.query.unread === "true"

    const query = { recipient: userId }
    if (unreadOnly) {
      Object.assign(query, { read: false })
    }

    const total = await Notification.countDocuments(query)
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("relatedComplaint", "complaintId title")

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    })

    res.status(200).json({
      notifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get user notifications error:", error)
    res.status(500).json({ message: "Server error fetching notifications" })
  }
}

// Get notification count for a user
export const getNotificationCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    })

    res.status(200).json({
      unreadCount,
    })
  } catch (error) {
    console.error("Get notification count error:", error)
    res.status(500).json({ message: "Server error fetching notification count" })
  }
}

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { notificationId } = req.params

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true },
    )

    if (!notification) {
       res.status(404).json({ message: "Notification not found" })
       return
    }

    res.status(200).json({ message: "Notification marked as read", notification })
  } catch (error) {
    console.error("Mark notification error:", error)
    res.status(500).json({ message: "Server error marking notification as read" })
  }
}

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id

    await Notification.updateMany({ recipient: userId, read: false }, { read: true })

    res.status(200).json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Mark all notifications error:", error)
    res.status(500).json({ message: "Server error marking notifications as read" })
  }
}

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { notificationId } = req.params

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    })

    if (!notification) {
       res.status(404).json({ message: "Notification not found" })
       return
    }

    res.status(200).json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ message: "Server error deleting notification" })
  }
}

// Create a test notification (for development purposes)
export const createTestNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type = "system" } = req.body
    const userId = req.user.id

    const notification = await createNotification(
      userId,
      title,
      message,
      type as "complaint_update" | "status_change" | "comment" | "escalation" | "resolution" | "system",
    )

    res.status(201).json({
      message: "Test notification created successfully",
      notification,
    })
  } catch (error) {
    console.error("Create test notification error:", error)
    res.status(500).json({ message: "Server error creating test notification" })
  }
}
