import mongoose, { type Document, Schema } from "mongoose"

export interface IDistrict extends Document {
  name: string
  province: string
  organization: mongoose.Types.ObjectId
  admin: mongoose.Types.ObjectId
  sectors: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date,
  active:boolean
}

const districtSchema = new Schema<IDistrict>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    active:{type:Boolean,default:false},
    sectors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Sector",
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Create a compound index for organization and name
districtSchema.index({ organization: 1, name: 1 }, { unique: true })

const District = mongoose.model<IDistrict>("District", districtSchema)

export default District
