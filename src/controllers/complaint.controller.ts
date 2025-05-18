import type { Request, Response } from "express"
import { addDays } from "date-fns"
import Complaint, { ComplaintStatus, EscalationLevel, type IComplaint } from "../models/complaint"
import User from "../models/user"
import Organization, { type IOrganization } from "../models/organization"
import Sector from "../models/sector"
import mongoose, { type Types } from "mongoose"
import { createComplaintUpdateNotification } from "../services/notification.service"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from 'uuid';

// Configure file upload
const uploadDir = path.join(process.cwd(), "uploads", "complaints")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}


// Function to calculate due date based on organization's max service days
const calculateDueDate = async (organizationId: string) => {
  try {
    const organization = await Organization.findById(organizationId)
    return addDays(new Date(), 7) // Default to 7 days
  } catch (error) {
    console.error("Error calculating due date:", error)
    return addDays(new Date(), 7) // Default to 7 days if there's an error
  }
}

// Function to generate complaint ID
const generateComplaintId = async () => {
  const year = new Date().getFullYear()
  const count = await Complaint.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${year + 1}-01-01`),
    },
  })
  return `CM-${year}-${(count + 1).toString().padStart(3, "0")}`
}

// Create a new complaint
export const createComplaint = async (req: Request, res: Response) => {
  try {
    const { title, description, organization, service } = req.body
    const userId = req.user.id

    // Get user details
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    // Ensure user is a citizen
    if (user.role !== "citizen") {
      res.status(403).json({ message: "Only citizens can create complaints" })
      return
    }

    // Get user's sector
    if (!user.location?.sector) {
      res.status(400).json({ message: "User's sector is required to create a complaint" })
      return
    }

    // Get organization details
    const org = await Organization.findById(organization)
    if (!org) {
      res.status(404).json({ message: "Organization not found" })
      return
    }

    // Find sector admin to assign the complaint
    const userSector = await Sector.findOne({ name: user.location.sector })
    let sectorId = userSector?._id
    let districtId

    if (!sectorId) {
      // If sector not found, create a placeholder
      console.warn(`Sector ${user.location.sector} not found in database`)
      sectorId = new mongoose.Types.ObjectId()
    } else {
      districtId = userSector?.district
    }

    // Create new complaint
    const complaint = new Complaint({
      complaintId:uuidv4(),
      title,
      description,
      service,
      organization,
      citizen: userId,
      sector: sectorId,
      district: districtId,
      attachments: req.body['documents'].map((att: any) => att.url),
      status: ComplaintStatus.RECEIVED,
      escalationLevel: EscalationLevel.SECTOR,
      comments: [{
        text: "Complaint submitted",
        user: userId,
        role: "citizen",
        createdAt: new Date()
      }]
    })

    await complaint.save()

    // Notify sector admin (implementation depends on your notification system)
    const sectorAdmin = await User.findOne({ role: 'sector_admin', sector: sectorId })
    if (sectorAdmin) {
      await createComplaintUpdateNotification(complaint._id as string, 'status_change','new complaints',sectorAdmin._id as string)
    }

    res.status(201).json({
      message: "Complaint created successfully",
      complaint: {
        id: complaint._id,
        title: complaint.title,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    })
  } catch (error) {
    console.error("Create complaint error:", error)
    res.status(500).json({ message: "Server error during complaint creation" })
  }
}

// Get all complaints for a citizen
export const getCitizenComplaints = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id

    const complaints = await Complaint.find({ citizen: userId })
      .populate("organization", "name")
      .populate({
        path: 'comments.user',
        select: 'firstName lastName role'
      })
      .sort({ createdAt: -1 })
      .select("-__v")

    res.status(200).json(complaints)
  } catch (error) {
    console.error("Get citizen complaints error:", error)
    res.status(500).json({ message: "Server error fetching complaints" })
  }
}

// Get complaints for sector admin
export const getSectorComplaints = async (req: Request, res: Response) => {
  try {
    const admin = req.user

    // Ensure user is a sector admin
    if (req.user.role !== "sectoradmin") {
      res.status(403).json({ message: "Access denied" })
      return
    }

    // Get admin's sector

    if (!admin || !admin.sector) {
      res.status(400).json({ message: "Admin's sector not found" })
      return
    }

  console.log(admin)
    const complaints = await Complaint.find({
      sector: admin.sector,
      escalationLevel: EscalationLevel.SECTOR
    })
      .populate("organization", "name")
      .populate("citizen", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .select("-__v")

    res.status(200).json(complaints)
  } catch (error) {
    console.error("Get sector complaints error:", error)
    res.status(500).json({ message: "Server error fetching complaints" })
  }
}

// Get complaints for district admin
export const getDistrictComplaints = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id

    // Ensure user is a district admin
    if (req.user.role !== "districtadmin") {
      res.status(403).json({ message: "Access denied" })
      return
    }

    // Get admin's district
    const admin = await User.findById(userId)
    if (!admin || !admin.district) {
      res.status(400).json({ message: "Admin's district not found" })
      return
    }

    const complaints = await Complaint.find({
      $or: [
        { district: admin.district, escalationLevel: EscalationLevel.DISTRICT },
        { escalateToDistrict: true }
      ]
    })
      .populate("organization", "name")
      .populate("citizen", "firstName lastName email phone")
      .populate("sector", "name")
      .sort({ createdAt: -1 })
      .select("-__v")

    res.status(200).json(complaints)
  } catch (error) {
    console.error("Get district complaints error:", error)
    res.status(500).json({ message: "Server error fetching complaints" })
  }
}

// Get complaints for organization admin
export const getOrganizationComplaints = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id

    // Ensure user is an organization admin
    if (req.user.role !== "org_admin") {
      res.status(403).json({ message: "Access denied" })
      return
    }

    // Get admin's organization
    const organization = await Organization.findOne({ admin: userId })
    if (!organization) {
      res.status(400).json({ message: "Admin's organization not found" })
      return
    }

    const complaints = await Complaint.find({
      $or: [
        { organization: organization._id, escalationLevel: EscalationLevel.ORGANIZATION },
        { escalateToOrg: true }
      ]
    })
      .populate("citizen", "firstName lastName email phone")
      .populate("district", "name province")
      .populate("sector", "name")
      .sort({ createdAt: -1 })
      .select("-__v")

    res.status(200).json(complaints)
  } catch (error) {
    console.error("Get organization complaints error:", error)
    res.status(500).json({ message: "Server error fetching complaints" })
  }
}

// Get complaint details
export const getComplaintDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const complaint = await Complaint.findById(id)
      .populate("organization", "name")
      .populate("citizen", "firstName lastName email phone")
      .populate("district", "name province")
      .populate("sector", "name")
      .populate("assignedTo", "firstName lastName email")
      .populate("comments.user", "firstName lastName role")

    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" })
      return
    }

    // Check if user has access to this complaint
    const hasAccess = await canUserAccessComplaint(userId, userRole, complaint)
    if (!hasAccess) {
      res.status(403).json({ message: "Access denied" })
      return
    }

    res.status(200).json(complaint)
  } catch (error) {
    console.error("Get complaint details error:", error)
    res.status(500).json({ message: "Server error fetching complaint details" })
  }
}

// Update complaint status
export const updateComplaintStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, resolution } = req.body
    const userId = req.user._id
    const userRole = req.user.role

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" })
      return
    }



    // // Validate status transition
    // if (!isValidStatusTransition(complaint.status, status as ComplaintStatus, userRole)) {
    //   res.status(400).json({ message: "Invalid status transition" })
    //   return
    // }

    // Update complaint
    complaint.status = status as ComplaintStatus
    complaint.comments.push({
      text: `Status updated to ${status}`,
      user: userId,
      role: userRole,
      createdAt: new Date()
    })

    if (status === ComplaintStatus.RESOLVED) {
      complaint.resolvedAt = new Date()
      // complaint.resolution = resolution
    }

    await complaint.save()

    // Notify relevant users
    await notifyStatusUpdate(complaint, status as ComplaintStatus, userRole)

    res.status(200).json({
      message: "Complaint status updated successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    })
  } catch (error) {
    console.error("Update complaint status error:", error)
    res.status(500).json({ message: "Server error updating complaint status" })
  }
}

// Add comment to complaint with optional file attachments
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { text, files } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" })
      return
    }

    // Check if user has access to comment on this complaint
    const hasAccess = await canUserAccessComplaint(userId, userRole, complaint)
    if (!hasAccess) {
      res.status(403).json({ message: "Access denied" })
      return
    }

    // Handle file uploads if any


    // Add comment with attachments
    const newComment = {
      text,
      user: userId,
      role: userRole,
      createdAt: new Date(),
      //@ts-ignore
      attachments: files.map(file => file.url)
    }
    complaint.comments.push(newComment)

    // Update complaint attachments if files were uploaded

    await complaint.save()

    // Notify relevant users
    await notifyNewComment(complaint, userId, userRole)

    res.status(200).json({
      message: "Comment added successfully",
      comment: newComment
    })
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ message: "Server error adding comment" })
  }
}

// Add files to complaint
// export const addFiles = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params
//     const userId = req.user.id
//     const userRole = req.user.role

//     const complaint = await Complaint.findById(id)
//     if (!complaint) {
//       res.status(404).json({ message: "Complaint not found" })
//       return
//     }

//     // Check if user has access to add files to this complaint
//     const hasAccess = await canUserAccessComplaint(userId, userRole, complaint)
//     if (!hasAccess) {
//       res.status(403).json({ message: "Access denied" })
//       return
//     }

//     if (!req..body.files || Object.keys(req.body.files).length === 0) {
//       res.status(400).json({ message: "No files were uploaded" })
//       return
//     }

//     try {
//       const uploadResult = await fileUpload.handleFiles(req)
//       const uploadedFiles = uploadResult.files.map(file => `/uploads/complaints/${file.fileName}`)

//       // Update complaint attachments
//       complaint.attachments = [...(complaint.attachments || []), ...uploadedFiles]

//       // Add a comment about the file upload
//       complaint.comments.push({
//         text: `Files uploaded: ${uploadResult.files.map(f => f.originalName).join(", ")}`,
//         user: userId,
//         role: userRole,
//         createdAt: new Date(),
//         attachments: uploadedFiles
//       })

//       await complaint.save()

//       res.status(200).json({
//         message: "Files uploaded successfully",
//         files: uploadedFiles
//       })
//     } catch (error) {
//       console.error("File upload error:", error)
//       res.status(400).json({
//         message: "Error uploading files",
//         error: error instanceof Error ? error.message : "Unknown error"
//       })
//     }
//   } catch (error) {
//     console.error("Add files error:", error)
//     res.status(500).json({ message: "Server error adding files" })
//   }
// }

// Remove file from complaint
export const removeFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { fileUrl } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" })
      return
    }

    // Check if user has access to remove files from this complaint
    const hasAccess = await canUserAccessComplaint(userId, userRole, complaint)
    if (!hasAccess) {
      res.status(403).json({ message: "Access denied" })
      return
    }

    // Remove file from attachments array
    complaint.attachments = (complaint.attachments || []).filter(url => url !== fileUrl)

    // Remove file from comments that reference it
    complaint.comments = complaint.comments.map(comment => ({
      ...comment,
      attachments: (comment.attachments || []).filter(url => url !== fileUrl)
    }))

    // Delete the actual file
    const fileName = path.basename(fileUrl)
    const filePath = path.join(uploadDir, fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await complaint.save()

    res.status(200).json({
      message: "File removed successfully"
    })
  } catch (error) {
    console.error("Remove file error:", error)
    res.status(500).json({ message: "Server error removing file" })
  }
}

// Escalate complaint
export const escalateComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason, escalateTo } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" })
      return
    }

    // Check if user has permission to escalate
    // if (!canEscalateComplaint(userRole, complaint.escalationLevel)) {
    //   res.status(403).json({ message: "You don't have permission to escalate this complaint" })
    //   return
    // }

    // Update escalation details
    const newLevel = getNextEscalationLevel(complaint.escalationLevel)
    complaint.escalationLevel = newLevel

    // Only set originalLocation if both district and sector exist
    const originalLocation = complaint.district && complaint.sector ? {
      district: complaint.district as Types.ObjectId,
      sector: complaint.sector as Types.ObjectId
    } : undefined

    complaint.escalationDetails = {
      level: newLevel,
      reason,
      requestedBy: userRole,
      timestamp: new Date(),
      originalLocation
    }

    // Set escalation flags
    if (newLevel === EscalationLevel.DISTRICT) {
      complaint.escalateToDistrict = true
    } else if (newLevel === EscalationLevel.ORGANIZATION) {
      complaint.escalateToOrg = true
    }

    // Add comment about escalation
    complaint.comments.push({
      text: `Complaint escalated to ${newLevel} level. Reason: ${reason}`,
      user: userId,
      role: userRole,
      createdAt: new Date()
    })

    await complaint.save()

    // Notify relevant users
    await notifyEscalation(complaint, newLevel)

    res.status(200).json({
      message: "Complaint escalated successfully",
      escalationLevel: newLevel
    })
  } catch (error) {
    console.error("Escalate complaint error:", error)
    res.status(500).json({ message: "Server error escalating complaint" })
  }
}

// Helper functions
const canUserAccessComplaint = async (userId: string, userRole: string, complaint: IComplaint) => {
  // Citizens can only access their own complaints
  if (userRole === "citizen") {
    return complaint.citizen.toString() === userId
  }

  // Sector admins can access complaints in their sector
  if (userRole === "sector_admin") {
    const admin = await User.findById(userId)
    return admin?.sector?.toString() === complaint.sector?.toString()
  }

  // District admins can access complaints in their district or escalated to district
  if (userRole === "district_admin") {
    const admin = await User.findById(userId)
    return admin?.district?.toString() === complaint.district?.toString() ||
      complaint.escalateToDistrict
  }

  // Organization admins can access complaints for their organization or escalated to org
  if (userRole === "org_admin") {
    const org = await Organization.findOne({ admin: userId }).exec() as IOrganization | null
    return org?._id?.toString() === complaint.organization.toString() ||
      complaint.escalateToOrg
  }

  return false
}

const isValidStatusTransition = (currentStatus: ComplaintStatus, newStatus: ComplaintStatus, userRole: string) => {
  // Define valid status transitions based on user role
  const validTransitions: Record<string, ComplaintStatus[]> = {
    sector_admin: [
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.NEEDS_INFO,
      ComplaintStatus.RESOLVED,
      ComplaintStatus.REJECTED
    ],
    district_admin: [
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.NEEDS_INFO,
      ComplaintStatus.RESOLVED,
      ComplaintStatus.REJECTED
    ],
    org_admin: [
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.NEEDS_INFO,
      ComplaintStatus.RESOLVED,
      ComplaintStatus.REJECTED
    ],
    citizen: [ComplaintStatus.NEEDS_INFO] // Citizens can only respond to info requests
  }

  return validTransitions[userRole]?.includes(newStatus) || false
}

const canEscalateComplaint = (userRole: string, currentLevel: EscalationLevel) => {
  const escalationPermissions: Record<string, EscalationLevel[]> = {
    sector_admin: [EscalationLevel.SECTOR],
    district_admin: [EscalationLevel.DISTRICT],
    org_admin: [EscalationLevel.ORGANIZATION]
  }

  return escalationPermissions[userRole]?.includes(currentLevel) || false
}

const getNextEscalationLevel = (currentLevel: EscalationLevel): EscalationLevel => {
  const escalationFlow = {
    [EscalationLevel.SECTOR]: EscalationLevel.DISTRICT,
    [EscalationLevel.DISTRICT]: EscalationLevel.ORGANIZATION,
    [EscalationLevel.ORGANIZATION]: EscalationLevel.ORGANIZATION // Can't escalate further
  }
  return escalationFlow[currentLevel]
}

// Notification helper functions
const notifyStatusUpdate = async (complaint: any, status: ComplaintStatus, updatedByRole: string) => {
  // Implementation depends on your notification system
  // Example:
  // await createComplaintUpdateNotification(complaint.citizen, complaint._id, 'status_update')
}

const notifyNewComment = async (complaint: any, commenterId: string, commenterRole: string) => {
  // Implementation depends on your notification system
  // Example:
  // const notifyUserId = commenterRole === 'citizen' ? complaint.assignedTo : complaint.citizen
  // await createComplaintUpdateNotification(notifyUserId, complaint._id, 'new_comment')
}

const notifyEscalation = async (complaint: any, newLevel: EscalationLevel) => {
  // Implementation depends on your notification system
  // Example:
  // const notifyUserId = getAdminIdForLevel(newLevel)
  // await createComplaintUpdateNotification(notifyUserId, complaint._id, 'escalation')
}

export default {
  createComplaint,
  getCitizenComplaints,
  getSectorComplaints,
  getDistrictComplaints,
  getOrganizationComplaints,
  getComplaintDetails,
  updateComplaintStatus,
  addComment,
  // addFiles,
  removeFile,
  escalateComplaint
}
