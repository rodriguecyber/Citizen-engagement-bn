import Notification from "../models/notification"
import User from "../models/user"
import Complaint from "../models/complaint"
import { sendEmail } from "./email.service"

// Create notification for a user
export const createNotification = async (
  recipientId: string,
  title: string,
  message: string,
  type: "complaint_update" | "status_change" | "comment" | "escalation" | "resolution" | "system",
  relatedComplaintId?: string,
) => {
  try {
    // Create notification in database
    const notification = new Notification({
      recipient: recipientId,
      title,
      message,
      type,
      relatedComplaint: relatedComplaintId,
    })

    await notification.save()

    // Get user info for email notification
    const user = await User.findById(recipientId)
    if (user && user.email) {
      // Send email notification
      await sendEmail(user.email, title, message)
    }

    return notification
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

// Create complaint update notification
export const createComplaintUpdateNotification = async (
  complaintId: string,
  updateType: "status_change" | "comment" | "escalation" | "resolution",
  message: string,
  updatedBy: string,
) => {
  try {
    const complaint = await Complaint.findById(complaintId)
    if (!complaint) {
      throw new Error("Complaint not found")
    }

    // Get relevant title based on update type
    let title
    switch (updateType) {
      case "status_change":
        title = `Complaint #${complaint.title} status updated`
        break
      case "comment":
        title = `New comment on your complaint #${complaint.title}`
        break
      case "escalation":
        title = `Complaint #${complaint.title} has been escalated`
        break
      case "resolution":
        title = `Complaint #${complaint.title} has been resolved`
        break
      default:
        title = `Update on your complaint #${complaint.title}`
    }

    // Determine who should receive the notification
    // If updated by citizen, notify admin
    // If updated by admin, notify citizen
    if (updatedBy === complaint.citizen.toString()) {
      // Notify sector admin
      const sectorAdmins = await User.find({ sector: complaint.sector, role: "sectoradmin" })
      for (const admin of sectorAdmins) {
        //@ts-ignore
        await createNotification(admin._id.toString(), title, message, updateType, complaintId)
      }
    } else {
      // Notify citizen
      await createNotification(complaint.citizen.toString(), title, message, updateType, complaintId)
    }

    return true
  } catch (error) {
    console.error("Error creating complaint update notification:", error)
    throw error
  }
}

// Send system notification to multiple users
export const sendSystemNotification = async (
  recipientIds: string[],
  title: string,
  message: string,
  relatedComplaintId?: string,
) => {
  try {
    const notifications = []
    for (const recipientId of recipientIds) {
      const notification = await createNotification(recipientId, title, message, "system", relatedComplaintId)
      notifications.push(notification)
    }
    return notifications
  } catch (error) {
    console.error("Error sending system notification:", error)
    throw error
  }
}
