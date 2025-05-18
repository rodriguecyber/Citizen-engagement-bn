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
  createDistrict: async (req: Request, res: Response) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { name, province, organization, email, phone } = req.body

      // Check if organization exists
      if (!mongoose.Types.ObjectId.isValid(organization)) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({ message: "Invalid organization ID" })
        return
      }

      const organizationExists = await Organization.findById(organization).session(session)
      if (!organizationExists) {
        await session.abortTransaction()
        session.endSession()
        res.status(404).json({ message: "Organization not found" })
        return
      }

      // Check if district already exists in this organization
      const existingDistrict = await District.findOne({
        name,
        organization
      }).session(session)

      if (existingDistrict) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({ message: "District with this name already exists in this organization" })
        return
      }

      // Create new district
      const newDistrict = new District({
        name,
        province,
        organization,
        active: false
      })

      await newDistrict.save({ session })

      // Create admin user for the district
      const adminUser = new User({
        firstName: "Admin",
        lastName: name,
        email: email,
        password: "ChangeMe123!",
        phone: phone,
        role: "districtadmin",
        organization: organization,
        district: newDistrict._id
      })

      await adminUser.save({ session })

      //@ts-expect-error err
      newDistrict.admin = adminUser._id
      await newDistrict.save({ session })

      await session.commitTransaction()
      session.endSession()

      res.status(201).json({
        message: "District created successfully with admin account",
        district: {
          ...newDistrict.toObject(),
          admin: {
            id: adminUser._id,
            email: adminUser.email
          }
        }
      })
    } catch (error) {
      await session.abortTransaction()
      session.endSession()
      console.error("Error creating district:", error)
      res.status(500).json({ message: "Failed to create district", error: (error as Error).message })
    }
  },

  // Update district
  updateDistrict: async (req: Request, res: Response) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { id } = req.params
      const { name, province, email, phone, active } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      const district = await District.findById(id).session(session)
      if (!district) {
        await session.abortTransaction()
        session.endSession()
        res.status(404).json({ message: "District not found" })
        return
      }

      // If name is being updated, check for uniqueness within organization
      if (name && name !== district.name) {
        const existingDistrict = await District.findOne({
          name,
          organization: district.organization,
          _id: { $ne: id }
        }).session(session)

        if (existingDistrict) {
          await session.abortTransaction()
          session.endSession()
          res.status(400).json({ message: "District name already exists in this organization" })
          return
        }
      }

      // Update district fields
      if (name) district.name = name
      if (province) district.province = province
      if (active !== undefined) district.active = active

      await district.save({ session })

      // If email is updated, also update admin user's email
      if (email && district.admin) {
        await User.findByIdAndUpdate(
          district.admin,
          { email },
          { session }
        )
      }

      // If phone is updated, also update admin user's phone
      if (phone && district.admin) {
        await User.findByIdAndUpdate(
          district.admin,
          { phone },
          { session }
        )
      }

      await session.commitTransaction()
      session.endSession()

      res.status(200).json({
        message: "District updated successfully",
        district
      })
    } catch (error) {
      await session.abortTransaction()
      session.endSession()
      console.error("Error updating district:", error)
      res.status(500).json({ message: "Failed to update district", error: (error as Error).message })
    }
  },

  // Delete district
  deleteDistrict: async (req: Request, res: Response) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({ message: "Invalid district ID" })
        return
      }

      const district = await District.findById(id).session(session)
      if (!district) {
        await session.abortTransaction()
        session.endSession()
        res.status(404).json({ message: "District not found" })
        return
      }

      // Delete all sectors in this district
      const sectors = await Sector.find({ district: id }).session(session)

      // Delete all users in these sectors
      for (const sector of sectors) {
        await User.deleteMany({ sector: sector._id }).session(session)
        await Complaint.deleteMany({ sector: sector._id }).session(session)
      }

      // Delete all sectors
      await Sector.deleteMany({ district: id }).session(session)

      // Delete district admin user
      if (district.admin) {
        await User.findByIdAndDelete(district.admin).session(session)
      }

      // Delete all users in this district
      await User.deleteMany({ district: id }).session(session)

      // Delete all complaints in this district
      await Complaint.deleteMany({ district: id }).session(session)

      // Delete the district
      await District.findByIdAndDelete(id).session(session)

      await session.commitTransaction()
      session.endSession()

      res.status(200).json({ message: "District and all associated data deleted successfully" })
    } catch (error) {
      await session.abortTransaction()
      session.endSession()
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
  assignAdminToDistrict: async (req: Request, res: Response) => {
    try {
      const { name, phone, email } = req.body
      const admin = new User({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').filter((n: any, index: number) => index !== 0).join(' ') || ' ',
        phone,
        password: 'ChangeMe123!',
        role: 'districtadmin',
        email,
        district: req.params.id
      })
      await District.findOneAndUpdate({ organization: req.user.organization }, {
        active: true,
        admin: admin._id
      })
      await admin.save()
      res.status(200).json({ message: "distict get admin" })
    } catch (error) {
      res.status(500).json({ message: "Failed to assign admin to district", error: (error as Error).message })

    }

  }
}
