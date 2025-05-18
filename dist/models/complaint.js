"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationLevel = exports.ComplaintStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum for complaint status
var ComplaintStatus;
(function (ComplaintStatus) {
    ComplaintStatus["RECEIVED"] = "received";
    ComplaintStatus["IN_PROGRESS"] = "in_progress";
    ComplaintStatus["NEEDS_INFO"] = "needs_info";
    ComplaintStatus["RESOLVED"] = "resolved";
    ComplaintStatus["REJECTED"] = "rejected";
    ComplaintStatus["ESCALATED"] = "escalated";
})(ComplaintStatus || (exports.ComplaintStatus = ComplaintStatus = {}));
// Enum for escalation level
var EscalationLevel;
(function (EscalationLevel) {
    EscalationLevel["SECTOR"] = "sector";
    EscalationLevel["DISTRICT"] = "district";
    EscalationLevel["ORGANIZATION"] = "organization";
})(EscalationLevel || (exports.EscalationLevel = EscalationLevel = {}));
const complaintSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    district: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "District",
    },
    sector: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Sector",
    },
    citizen: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "District",
            },
            sector: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Sector",
            },
        },
        handledBy: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        },
        resolution: String,
    },
    // Tracking fields
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
});
// Indexes for better query performance
complaintSchema.index({ organization: 1, status: 1 });
complaintSchema.index({ district: 1, status: 1 });
complaintSchema.index({ sector: 1, status: 1 });
complaintSchema.index({ citizen: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
const Complaint = mongoose_1.default.model("Complaint", complaintSchema);
exports.default = Complaint;
