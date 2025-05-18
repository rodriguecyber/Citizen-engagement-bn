import type { Request, Response } from "express"
import mongoose from "mongoose"
import Organization from "../models/organization"
import User from "../models/user"
import District from "../models/district"
import Sector from "../models/sector"

// Create a new organization with admin
export const createOrganization = async (req: Request, res: Response) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { name, services, location, email, tel } = req.body

    // Check if organization already exists
    const organizationExists = await Organization.findOne({ name }).session(session)
    if (organizationExists) {
      await session.abortTransaction()
      session.endSession()
      res.status(400).json({ message: "Organization already exists with this name" })
      return
    }

    // Create organization without admin initially
    const organization = new Organization({
      name,
      services: services.split(",").map((service: string) => service.trim()),
      location,
      email,
      tel,
    })

    await organization.save({ session })

    const adminUser = new User({
      firstName: "Admin",
      lastName: name,
      email: email,
      password: "ChangeMe123!",
      phone: tel,
      role: "orgadmin",
      organization: organization._id,
    })

    await adminUser.save({ session })

    // Update organization with admin reference
    //@ts-ignore
    organization.admin = adminUser._id
    await organization.save({ session })

    await session.commitTransaction()
    session.endSession()

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
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error("Create organization error:", error)
    res.status(500).json({ message: "Server error during organization creation" })
  }
}

// Get all organizations
export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find()
      .populate("admin", "firstName lastName email phone")
      .populate({
        path: "districts",
        populate: {
          path: "sectors",
          model: "Sector",
        },
      })
      .select("-__v");

    res.status(200).json(organizations)
  } catch (error) {
    console.error("Get organizations error:", error)
    res.status(500).json({ message: "Server error fetching organizations" })
  }
}


// Get organization by ID
export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate("admin", "firstName lastName email phone")
      .populate("districts")
      .select("-__v")

    if (!organization) {
      res.status(404).json({ message: "Organization not found" })
      return
    }

    res.status(200).json(organization)
  } catch (error) {
    console.error("Get organization error:", error)
    res.status(500).json({ message: "Server error fetching organization" })
  }
}

// Update organization
export const updateOrganization = async (req: Request, res: Response) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { name, services, location, email, tel } = req.body

    // If name is being updated, check for uniqueness
    if (name) {
      const existingOrg = await Organization.findOne({
        name,
        _id: { $ne: req.params.id }
      }).session(session)

      if (existingOrg) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({ message: "Organization name already exists" })
        return
      }
    }

    const organization = await Organization.findById(req.params.id).session(session)
    if (!organization) {
      await session.abortTransaction()
      session.endSession()
      res.status(404).json({ message: "Organization not found" })
      return
    }

    // Update fields
    if (name) organization.name = name
    if (services) organization.services = services.split(",").map((service: string) => service.trim())
    if (location) organization.location = location
    if (email) organization.email = email
    if (tel) organization.tel = tel

    await organization.save({ session })

    // If email is updated, also update admin user's email
    if (email && organization.admin) {
      await User.findByIdAndUpdate(
        organization.admin,
        { email },
        { session }
      )
    }

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({
      message: "Organization updated successfully",
      organization,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error("Update organization error:", error)
    res.status(500).json({ message: "Server error updating organization" })
  }
}

// Delete organization
export const deleteOrganization = async (req: Request, res: Response) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const organization = await Organization.findById(req.params.id).session(session)
    if (!organization) {
      await session.abortTransaction()
      session.endSession()
      res.status(404).json({ message: "Organization not found" })
      return
    }

    // Delete associated districts and their sectors
    const districts = await District.find({ organization: organization._id }).session(session)

    // Delete all sectors in these districts
    for (const district of districts) {
      await Sector.deleteMany({ district: district._id }).session(session)
    }

    // Delete all districts
    await District.deleteMany({ organization: organization._id }).session(session)

    // Delete associated admin user
    if (organization.admin) {
      await User.findByIdAndDelete(organization.admin).session(session)
    }

    // Delete the organization
    await Organization.findByIdAndDelete(req.params.id).session(session)

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({ message: "Organization and all associated data deleted successfully" })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error("Delete organization error:", error)
    res.status(500).json({ message: "Server error deleting organization" })
  }
}


// Additional methods for organization.controller.ts

// Get organization statistics
export const getOrganizationStatistics = async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id

    const organization = await Organization.findById(organizationId)
    if (!organization) {
      res.status(404).json({ message: "Organization not found" })
      return
    }

    // Count districts
    const districtCount = await District.countDocuments({ organization: organizationId })

    // Count sectors
    const sectors = await Sector.find().populate({
      path: "district",
      match: { organization: organizationId },
    })
    const sectorCount = sectors.filter((sector) => sector.district).length

    // Count admins
    const adminCount = await User.countDocuments({
      $or: [
        { role: "orgadmin", organization: organizationId },
        { role: "districtadmin", organization: organizationId },
        { role: "sectoradmin", organization: organizationId },
      ],
    })

    // Get complaint statistics (if complaint model exists)
    // This is a placeholder - to be implemented later
    const complaintStats = {
      total: 0,
      resolved: 0,
      pending: 0,
      resolutionRate: 0,
    }

    res.status(200).json({
      districtCount,
      sectorCount,
      adminCount,
      complaintStats,
    })
  } catch (error) {
    console.error("Get organization statistics error:", error)
    res.status(500).json({ message: "Server error fetching organization statistics" })
  }
}

// Get organization districts
export const getOrganizationDistricts = async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id

    const organization = await Organization.findById(organizationId)
    if (!organization) {
      res.status(404).json({ message: "Organization not found" })
      return
    }

    const districts = await District.find({ organization: organizationId })
      .populate("admin", "firstName lastName email phone")
      .select("-__v")

    res.status(200).json(districts)
  } catch (error) {
    console.error("Get organization districts error:", error)
    res.status(500).json({ message: "Server error fetching organization districts" })
  }
}
