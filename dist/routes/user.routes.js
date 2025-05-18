"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Get all users (admin only)
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("superadmin", "orgadmin", "districtadmin", "sectoradmin"), user_controller_1.userController.getAllUsers);
// Get user by ID
router.get("/:id", auth_middleware_1.authenticate, user_controller_1.userController.getUserById);
// Update user
router.put("/:id", auth_middleware_1.authenticate, user_controller_1.userController.updateUser);
// Delete user (admin only)
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("superadmin", "orgadmin", "districtadmin"), user_controller_1.userController.deleteUser);
exports.default = router;
