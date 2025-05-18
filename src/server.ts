import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import complaintRoutes from "./routes/complaints"
import notificationRoutes from "./routes/notifications"
import authRoutes from "./routes/auth.routes"
import organizationRoutes from "./routes/organization.routes"
import districtRoutes from "./routes/district.routes"
import sectorRoutes from "./routes/sector.routes"
import userRoutes from "./routes/user.routes"

// Load environment variables
dotenv.config()



const app = express()
const PORT = process.env.PORT 

// Middleware
app.use(cors())
app.use(express.json())

// Database connection
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/organizations", organizationRoutes)
app.use("/api/districts", districtRoutes)
app.use("/api/sectors", sectorRoutes)
app.use("/api/complaints", complaintRoutes)
app.use("/api/users", userRoutes)
app.use("/api/notifications", notificationRoutes)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
