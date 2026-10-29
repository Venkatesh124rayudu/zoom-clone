import { Router } from "express";
import { login, register, logout, getUserHistory, addToHistory } from "../controllers/user.controller.js";
import { requireToken } from "../middleware/auth.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/logout").post(requireToken, logout);
router.route("/add_to_activity").post(requireToken, addToHistory);
router.route("/get_all_activity").get(requireToken, getUserHistory);

export default router;
