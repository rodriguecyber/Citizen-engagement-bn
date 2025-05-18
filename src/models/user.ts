import mongoose, { type Document, Schema } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  role: "superadmin" | "orgadmin" | "districtadmin" | "sectoradmin" | "citizen"
  organization?: mongoose.Types.ObjectId
  district?: mongoose.Types.ObjectId
  sector?: mongoose.Types.ObjectId
  location?: {
    province?: string
    district?: string
    sector?: string
    cell?: string
    village?: string
  }
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "orgadmin", "districtadmin", "sectoradmin", "citizen"],
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    district: {
      type: Schema.Types.ObjectId,
      ref: "District",
    },
    sector: {
      type: Schema.Types.ObjectId,
      ref: "Sector",
    },
    location: {
      province: String,
      district: String,
      sector: String,
      cell: String,
      village: String,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (this: IUser, next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model<IUser>("User", userSchema)

export default User
