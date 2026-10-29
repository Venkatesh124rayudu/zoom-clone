import httpStatus from "http-status";
import { User } from "../models/user.model.js";

// Reads "Authorization: Bearer <token>", finds the matching user and attaches it as req.user.
export const requireToken = async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Please log in" });
    }

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Session expired, please log in again" });
        }
        req.user = user;
        next();
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` });
    }
};
