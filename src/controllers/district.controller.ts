import type { Request, Response } from "express"
import mongoose, { Types } from "mongoose"
import District from "../models/district"
import Sector from "../models/sector"
import User from "../models/user"
import Complaint from "../models/complaint"
import Organization from "../models/organization"

export const districtController = {
  // Get all districts with pagination and filtering
  getAllDistricts: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, sortBy = "name", sortOrder = "asc" } = req.query

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = {}

      // Add search functionality
      if (search) {
        filter.name = { $regex: search, $options: "i" }
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const districts = await District.find(filter)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      // Get sector counts for each district
      const districtsWithCounts = await Promise.all(
        districts.map(async (district) => {
          const sectorCount = await Sector.countDocuments({ district: district._id })
          const userCount = await User.countDocuments({ district: district._id })
          const complaintCount = await Complaint.countDocuments({ district: district._id })

          return {
            ...district.toObject(),
            sectorCount,
            userCount,
            complaintCount,
          }
        }),
      )

      const total = await District.countDocuments(filter)

      res.status(200).json({
        districts: districtsWithCounts,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalDistricts: total,
      })
    } catch (error) {
      console.error("Error getting districts:", error)
      res.status(500).json({ message: "Failed to get districts", error: (error as Error).message })
    }
  },

  // Get district by ID
  getDistrictById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      const district = await District.findById(id)

      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      // Get additional information
      const sectorCount = await Sector.countDocuments({ district: district._id })
      const userCount = await User.countDocuments({ district: district._id })
      const complaintCount = await Complaint.countDocuments({ district: district._id })

      const districtWithCounts = {
        ...district.toObject(),
        sectorCount,
        userCount,
        complaintCount,
      }

      res.status(200).json(districtWithCounts)
    } catch (error) {
      console.error("Error getting district:", error)
      res.status(500).json({ message: "Failed to get district", error: (error as Error).message })
    }
  },

  // Create a new district
  createDistrict: async (req: any, res: Response) => {
    try {
      const { name, province } = req.body

      // Check if district already exists
      const existingDistrict = await District.findOne({ name })
      if (existingDistrict) {
        res.status(400).json({ message: "District with this name already exists" })
        return
      }

      // Create new district
      const newDistrict = new District({
        name,
        province,
        organization: req.user.organization,


      })
      const organization= await Organization.findById(newDistrict.organization)
      organization?.districts.push(newDistrict._id as Types.ObjectId)
      await newDistrict.save()

      res.status(201).json({
        message: "District created successfully",
        district: newDistrict,
      })
    } catch (error) {
      console.error("Error creating district:", error)
      res.status(500).json({ message: "Failed to create district", error: (error as Error).message })
    }
  },

  // Update district
  updateDistrict: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { name, description, location, contactInfo } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      // Check if name is being changed and if it's already in use
      if (name && name !== district.name) {
        const existingDistrict = await District.findOne({ name })
        if (existingDistrict) {
          res.status(400).json({ message: "District name is already in use" })
          return
        }
      }

      // Update district
      const updatedDistrict = await District.findByIdAndUpdate(
        id,
        {
          name: name || district.name,
          //@ts-ignore
          description: description || district.description,
          //@ts-ignore
          location: location || district.location,
          //@ts-ignore
          contactInfo: contactInfo || district.contactInfo,
          updatedAt: new Date(),
        },
        { new: true },
      )

      res.status(200).json({
        message: "District updated successfully",
        district: updatedDistrict,
      })
    } catch (error) {
      console.error("Error updating district:", error)
      res.status(500).json({ message: "Failed to update district", error: (error as Error).message })
    }
  },

  // Delete district
  deleteDistrict: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return

      }

      // Check if district has sectors
      const sectorCount = await Sector.countDocuments({ district: id })
      if (sectorCount > 0) {
        res.status(400).json({
          message: "Cannot delete district with associated sectors. Please delete all sectors first.",
          sectorCount,
        })
        return
      }

      // Check if district has users
      const userCount = await User.countDocuments({ district: id })
      if (userCount > 0) {
        res.status(400).json({
          message: "Cannot delete district with associated users. Please reassign or delete users first.",
          userCount,
        })
        return
      }

      // Check if district has complaints
      const complaintCount = await Complaint.countDocuments({ district: id })
      if (complaintCount > 0) {
        res.status(400).json({
          message: "Cannot delete district with associated complaints.",
          complaintCount,
        })
        return
      }

      // Delete district
      await District.findByIdAndDelete(id)

      res.status(200).json({ message: "District deleted successfully" })
    } catch (error) {
      console.error("Error deleting district:", error)
      res.status(500).json({ message: "Failed to delete district", error: (error as Error).message })
    }
  },

  // Get sectors in a district
  getDistrictSectors: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { page = 1, limit = 10, search, sortBy = "name", sortOrder = "asc" } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = { district: id }

      // Add search functionality
      if (search) {
        filter.name = { $regex: search, $options: "i" }
      }

      // Determine sort direction
      const sortDirection = sortOrder === "asc" ? 1 : -1

      const sectors = await Sector.find(filter)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum)

      // Get counts for each sector
      const sectorsWithCounts = await Promise.all(
        //@ts-ignore
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
      console.error("Error getting district sectors:", error)
      res.status(500).json({ message: "Failed to get district sectors", error: (error as Error).message })
    }
  },

  // Get complaints in a district
  getDistrictComplaints: async (req: Request, res: Response) => {
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
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = { district: id }

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
      console.error("Error getting district complaints:", error)
      res.status(500).json({ message: "Failed to get district complaints", error: (error as Error).message })
    }
  },

  // Get district statistics
  getDistrictStats: async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      // Basic counts
      const sectorCount = await Sector.countDocuments({ district: id })
      const userCount = await User.countDocuments({ district: id })
      const complaintCount = await Complaint.countDocuments({ district: id })

      // Complaints by status
      const complaintsByStatus = await Complaint.aggregate([
        {
          $match: { district: new mongoose.Types.ObjectId(id) },
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
          $match: { district: new mongoose.Types.ObjectId(id) },
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
          $match: { district: new mongoose.Types.ObjectId(id) },
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
            district: new mongoose.Types.ObjectId(id),
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
            district: new mongoose.Types.ObjectId(id),
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
        districtName: district.name,
        sectorCount,
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
      console.error("Error getting district statistics:", error)
      res.status(500).json({ message: "Failed to get district statistics", error: (error as Error).message })
    }
  },

  // Get district users
  getDistrictUsers: async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { page = 1, limit = 10, role, search, sortBy = "lastName", sortOrder = "asc" } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      // Check if district exists
      const district = await District.findById(id)
      if (!district) {
        res.status(404).json({ message: "District not found" })
        return
      }

      const pageNum = Number.parseInt(page as string)
      const limitNum = Number.parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build filter object
      const filter: any = { district: id }

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
        .populate("sector", "name")
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
      console.error("Error getting district users:", error)
      res.status(500).json({ message: "Failed to get district users", error: (error as Error).message })
    }
  },
   assignAdminToDistrict: async(req:Request,res:Response)=>{
    try {
    const {name,phone,email}=req.body
    const admin = new User({
      firstName:name.split(' ')[0],
      lastName:name.split(' ').filter((n:any,index:number)=>index!==0).join(' ') ||' ',
      phone,
      password:'ChangeMe123!',
      role:'districtadmin',
      email,
      district:req.params.id
    })
    await District.findOneAndUpdate({organization:req.user.organization},{
      active:true,
      admin:admin._id
    })
    await admin.save()
    res.status(200).json({ message: "distict get admin"})
    } catch (error) {
      res.status(500).json({ message: "Failed to assign admin to district", error: (error as Error).message })
      
    }
    
  }
}
