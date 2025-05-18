import mongoose, { type Document, Schema } from "mongoose"

export interface ISector extends Document {
  name: string
  district: mongoose.Types.ObjectId
  admin: mongoose.Types.ObjectId
  active:boolean
  cells: string[]
  createdAt: Date
  updatedAt: Date
}

const sectorSchema = new Schema<ISector>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: Schema.Types.ObjectId,
      ref: "District",
      required: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    active: {
      type: Boolean,
     default:false
    },
    cells: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Create a compound index for district and name
sectorSchema.index({ district: 1, name: 1 }, { unique: true })

const Sector = mongoose.model<ISector>("Sector", sectorSchema)

export default Sector
