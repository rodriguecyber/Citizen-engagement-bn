"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const complaints_1 = __importDefault(require("./routes/complaints"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const organization_routes_1 = __importDefault(require("./routes/organization.routes"));
const district_routes_1 = __importDefault(require("./routes/district.routes"));
const sector_routes_1 = __importDefault(require("./routes/sector.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Database connection
mongoose_1.default
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
// Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/organizations", organization_routes_1.default);
app.use("/api/districts", district_routes_1.default);
app.use("/api/sectors", sector_routes_1.default);
app.use("/api/complaints", complaints_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/notifications", notifications_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: "Something went wrong!",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
