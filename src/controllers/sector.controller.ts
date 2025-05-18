import type { Request, Response } from "express"
import mongoose from "mongoose"
import Sector from "../models/sector"
import User from "../models/user"
import Complaint from "../models/complaint"
import District from "../models/district"

export const sectorController = {
  // Get all sectors with pagination and filtering
  getAllSectors: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, district, search, sortBy = "name", sortOrder = "asc" } = req.query

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = {}

      if (district) filter.district = district

      // Add search functionality
      if (search) {
        filter.name = { $regex: search, $options: "i" }
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const sectors = await Sector.find(filter)
        .populate("district", "name")
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      // Get counts for each sector
      const sectorsWithCounts = await Promise.all(
        sectors.map(async (sector) => {
          const userCount = await User.countDocuments({ sector: sector._id })
          const complaintCount = await Complaint.countDocuments({ sector: sector._id })

          return {
            ...sector.toObject(),
            userCount,
            complaintCount,
          }
        }),
      )

      const total = await Sector.countDocuments(filter)

      res.status(200).json({
        sectors: sectorsWithCounts,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalSectors: total,
      })
    } catch (error) {
      console.error("Error getting sectors:", error)
      res.status(500).json({ message: "Failed to get sectors", error: (error as Error).message })
    }
  },

  // Get sector by ID
  getSectorById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      const sector = await Sector.findById(id).populate("district", "name")

      if (!sector) {
         res.status(404).json({ message: "Sector not found" })
         return

      }

      // Get additional information
      const userCount = await User.countDocuments({ sector: sector._id })
      const complaintCount = await Complaint.countDocuments({ sector: sector._id })

      const sectorWithCounts = {
        ...sector.toObject(),
        userCount,
        complaintCount,
      }

      res.status(200).json(sectorWithCounts)
    } catch (error) {
      console.error("Error getting sector:", error)
      res.status(500).json({ message: "Failed to get sector", error: (error as Error).message })
    }
  },

  // Create a new sector
  createSector: async (req: Request, res: Response) => {
    try {
      const { name, email,phone, district } = req.body

      // Check if district exists
      if (!mongoose.Types.ObjectId.isValid(district)) {
         res.status(400).json({ message: "Invalid district ID" })
         return
      }

      const districtExists = await District.findById(district)
      if (!districtExists) {
         res.status(404).json({ message: "District not found" })
         return
      }

      // Check if sector already exists in this district
      const existingSector = await Sector.findOne({ name, district })
      if (existingSector) {
        res.status(400).json({ message: "Sector with this name already exists in this district" })
        return
      }

      // Create new sector
      const newSector = new Sector({
        name,
        district,
      })

      await newSector.save()

      // Return with district information
      const sectorWithDistrict = await Sector.findById(newSector._id).populate("district", "name")

      res.status(201).json({
        message: "Sector created successfully",
        sector: sectorWithDistrict,
      })
    } catch (error) {
      console.error("Error creating sector:", error)
      res.status(500).json({ message: "Failed to create sector", error: (error as Error).message })
    }
  },

  // Update sector
  updateSector: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { name, description, district, contactInfo } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      // Check if sector exists
      const sector = await Sector.findById(id)
      if (!sector) {
         res.status(404).json({ message: "Sector not found" })
         return
      }

      // If district is being changed, check if it exists
      if (district && district !== sector.district.toString()) {
        if (!mongoose.Types.ObjectId.isValid(district)) {
           res.status(400).json({ message: "Invalid district ID" })
           return
        }

        const districtExists = await District.findById(district)
        if (!districtExists) {
           res.status(404).json({ message: "District not found" })

           return
        }

        // Check if sector name already exists in new district
        if (name) {
          const existingSector = await Sector.findOne({ name, district })
          //@ts-ignore
          if (existingSector && existingSector._id.toString() !== id) {
             res.status(400).json({ message: "Sector with this name already exists in the selected district" })
             return
          }
        }
      } else if (name && name !== sector.name) {
        // Check if sector name already exists in same district
        const existingSector = await Sector.findOne({
          name,
          district: sector.district,
        })
          //@ts-ignore

        if (existingSector && existingSector._id.toString() !== id) {
           res.status(400).json({ message: "Sector with this name already exists in this district" })
           return
        }
      }

      // Update sector
      const updatedSector = await Sector.findByIdAndUpdate(
        id,
        {
          name: name || sector.name,
          //@ts-ignore
          description: description || sector.description,
          district: district || sector.district,
          //@ts-ignore
          contactInfo: contactInfo || sector.contactInfo,
          updatedAt: new Date(),
        },
        { new: true },
      ).populate("district", "name")

      res.status(200).json({
        message: "Sector updated successfully",
        sector: updatedSector,
      })
    } catch (error) {
      console.error("Error updating sector:", error)
      res.status(500).json({ message: "Failed to update sector", error: (error as Error).message })
    }
  },

  // Delete sector
  deleteSector: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      // Check if sector exists
      const sector = await Sector.findById(id)
      if (!sector) {
         res.status(404).json({ message: "Sector not found" })
         return
      }

      // Check if sector has users
      const userCount = await User.countDocuments({ sector: id })
      if (userCount > 0) {
         res.status(400).json({
          message: "Cannot delete sector with associated users. Please reassign or delete users first.",
          userCount,
        })
        return
      }

      // Check if sector has complaints
      const complaintCount = await Complaint.countDocuments({ sector: id })
      if (complaintCount > 0) {
         res.status(400).json({
          message: "Cannot delete sector with associated complaints.",
          complaintCount,
        })
        return
      }

      // Delete sector
      await Sector.findByIdAndDelete(id)

      res.status(200).json({ message: "Sector deleted successfully" })
    } catch (error) {
      console.error("Error deleting sector:", error)
      res.status(500).json({ message: "Failed to delete sector", error: (error as Error).message })
    }
  },

  // Get complaints in a sector
  getSectorComplaints: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        category,
        sortBy = "createdAt",
        sortOrder = "desc",
        startDate,
        endDate,
      } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      // Check if sector exists
      const sector = await Sector.findById(id)
      if (!sector) {
         res.status(404).json({ message: "Sector not found" })
         return
      }

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = { sector: id }

      if (status) filter.status = status
      if (priority) filter.priority = priority
      if (category) filter.category = category

      // Date filtering
      if (startDate || endDate) {
        filter.createdAt = {}
        if (startDate) filter.createdAt.$gte = new Date(startDate as string)
        if (endDate) filter.createdAt.$lte = new Date(endDate as string)
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const complaints = await Complaint.find(filter)
        .populate("submittedBy", "firstName lastName email")
        .populate("district", "name")
        .populate("sector", "name")
        .populate("assignedTo", "firstName lastName")
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      const total = await Complaint.countDocuments(filter)

      res.status(200).json({
        complaints,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalComplaints: total,
      })
    } catch (error) {
      console.error("Error getting sector complaints:", error)
      res.status(500).json({ message: "Failed to get sector complaints", error: (error as Error).message })
    }
  },

  // Get sector statistics
  getSectorStats: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      // Check if sector exists
      const sector = await Sector.findById(id).populate("district", "name")
      if (!sector) {
         res.status(404).json({ message: "Sector not found" })

         return
      }

      // Basic counts
      const userCount = await User.countDocuments({ sector: id })
      const complaintCount = await Complaint.countDocuments({ sector: id })

      // Complaints by status
      const complaintsByStatus = await Complaint.aggregate([
        {
          $match: { sector: new mongoose.Types.ObjectId(id) },
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
      ])

      // Complaints by priority
      const complaintsByPriority = await Complaint.aggregate([
        {
          $match: { sector: new mongoose.Types.ObjectId(id) },
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
      ])

      // Complaints by category
      const complaintsByCategory = await Complaint.aggregate([
        {
          $match: { sector: new mongoose.Types.ObjectId(id) },
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
      ])

      // Complaints over time (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const complaintsOverTime = await Complaint.aggregate([
        {
          $match: {
            sector: new mongoose.Types.ObjectId(id),
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
      ])

      // Resolution time statistics
      const resolutionStats = await Complaint.aggregate([
        {
          $match: {
            sector: new mongoose.Types.ObjectId(id),
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
      ])

      res.status(200).json({
        sectorName: sector.name,
        //@ts-ignore
        districtName: sector.district.name,
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
      })
    } catch (error) {
      console.error("Error getting sector statistics:", error)
      res.status(500).json({ message: "Failed to get sector statistics", error: (error as Error).message })
    }
  },

  // Get sector users
  getSectorUsers: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { page = 1, limit = 10, role, search, sortBy = "lastName", sortOrder = "asc" } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ message: "Invalid sector ID" })
         return
      }

      // Check if sector exists
      const sector = await Sector.findById(id)
      if (!sector) {
         res.status(404).json({ message: "Sector not found" })
         return
      }

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = { sector: id }

      if (role) filter.role = role

      // Add search functionality
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const users = await User.find(filter)
        .select("-password")
        .populate("district", "name")
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      const total = await User.countDocuments(filter)

      res.status(200).json({
        users,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalUsers: total,
      })
    } catch (error) {
      console.error("Error getting sector users:", error)
      res.status(500).json({ message: "Failed to get sector users", error: (error as Error).message })
    }
  },
  assignAdminToSector: async(req:Request,res:Response)=>{
    try {
    const {firstName,lastName,phone,email}=req.body
    const admin = new User({
      firstName,
      lastName,
      phone,
      password:'ChangeMe123!',
      role:'sectoradmin',
      email,
      sector:req.params.id
    })
    await Sector.findByIdAndUpdate(req.params.id,{
      active:true,
      admin:admin._id
    })
    await admin.save()
    res.status(200).json({ message: "distict get admin",admin
    
    })
    } catch (error) {
      res.status(500).json({ message: "Failed to assign admin to district", error: (error as Error).message })
      
    }
    
  }
}
