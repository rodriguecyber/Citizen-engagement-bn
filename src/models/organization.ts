import mongoose, { type Document, Schema } from "mongoose"

export interface IOrganization extends Document {
  name: string
  services: string[]
  location: string
  email: string
  tel: string
  admin: mongoose.Types.ObjectId
  districts: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    services: {
      type: [String],
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tel: {
      type: String,
      required: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    districts: [
      {
        type: Schema.Types.ObjectId,
        ref: "District",
      },
    ],
  },
  {
    timestamps: true,
  },
)

const Organization = mongoose.model<IOrganization>("Organization", organizationSchema)

export default Organization
