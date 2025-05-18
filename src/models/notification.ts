import mongoose, { type Document, Schema } from "mongoose"

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId
  title: string
  message: string
  type: "complaint_update" | "status_change" | "comment" | "escalation" | "resolution" | "system"
  read: boolean
  relatedComplaint?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["complaint_update", "status_change", "comment", "escalation", "resolution", "system"],
      default: "system",
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedComplaint: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better query performance
notificationSchema.index({ recipient: 1, read: 1 })
notificationSchema.index({ recipient: 1, createdAt: -1 })

const Notification = mongoose.model<INotification>("Notification", notificationSchema)

export default Notification
