import mongoose, { type Document, Schema } from "mongoose"

// Enum for complaint status
export enum ComplaintStatus {
  RECEIVED = 'received',
  IN_PROGRESS = 'in_progress',
  NEEDS_INFO = 'needs_info',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated'
}

// Enum for escalation level
export enum EscalationLevel {
  SECTOR = 'sector',
  DISTRICT = 'district',
  ORGANIZATION = 'organization'
}

// Interface for escalation details
interface EscalationDetails {
  level: EscalationLevel
  reason: string
  requestedBy: string // 'citizen' | 'sector_admin' | 'district_admin'
  timestamp: Date
  originalLocation?: {
    district: mongoose.Types.ObjectId
    sector: mongoose.Types.ObjectId
  }
  handledBy?: mongoose.Types.ObjectId // ID of admin who handled the escalation
  resolution?: string
}

// Interface for comment
interface IComment {
  text: string
  user: mongoose.Types.ObjectId
  role: string // 'citizen' | 'sector_admin' | 'district_admin' | 'org_admin'
  createdAt: Date
  attachments?: string[] // URLs to attached files
}

export interface IComplaint extends Document {
  title: string,
  complaintId:string
  description: string
  service: string // Service from organization
  organization: mongoose.Types.ObjectId
  district?: mongoose.Types.ObjectId // Optional because of org-level escalation
  sector?: mongoose.Types.ObjectId   // Optional because of district/org-level escalation
  citizen: mongoose.Types.ObjectId   // Reference to the citizen who submitted
  status: ComplaintStatus
  createdAt: Date
  updatedAt: Date

  // Escalation related fields
  escalateToDistrict: boolean
  escalateToOrg: boolean
  escalationLevel: EscalationLevel
  escalationDetails?: EscalationDetails

  // Tracking fields
  assignedTo?: mongoose.Types.ObjectId // Admin assigned to handle the complaint
  assignedAt?: Date
  resolvedAt?: Date
  resolution?: string

  // Additional metadata
  attachments?: string[] // URLs to attached files
  comments: IComment[]
}

const complaintSchema = new Schema<IComplaint>(
  {
    complaintId: {
      type: String,
      unique: true,
      required: true, // if it's always needed
    },    
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    district: {
      type: Schema.Types.ObjectId,
      ref: "District",
    },
    sector: {
      type: Schema.Types.ObjectId,
      ref: "Sector",
    },
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ComplaintStatus),
      default: ComplaintStatus.RECEIVED,
    },

    // Escalation fields
    escalateToDistrict: {
      type: Boolean,
      default: false,
    },
    escalateToOrg: {
      type: Boolean,
      default: false,
    },
    escalationLevel: {
      type: String,
      enum: Object.values(EscalationLevel),
      required: true,
    },
    escalationDetails: {
      level: {
        type: String,
        enum: Object.values(EscalationLevel),
      },
      reason: String,
      requestedBy: String,
      timestamp: Date,
      originalLocation: {
        district: {
          type: Schema.Types.ObjectId,
          ref: "District",
        },
        sector: {
          type: Schema.Types.ObjectId,
          ref: "Sector",
        },
      },
      handledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      resolution: String,
    },

    // Tracking fields
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: Date,
    resolvedAt: Date,
    resolution: String,

    // Additional metadata
    attachments: [String],
    comments: [{
      text: {
        type: String,
        required: true,
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["citizen", "sectoradmin", "districtadmin", "orgadmin"],
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      attachments: [String] // URLs to attached files
    }],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  },
)

// Indexes for better query performance
complaintSchema.index({ organization: 1, status: 1 })
complaintSchema.index({ district: 1, status: 1 })
complaintSchema.index({ sector: 1, status: 1 })
complaintSchema.index({ citizen: 1, createdAt: -1 })
complaintSchema.index({ assignedTo: 1, status: 1 })

const Complaint = mongoose.model<IComplaint>("Complaint", complaintSchema)

export default Complaint
