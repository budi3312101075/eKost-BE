import { Router } from "express";
import { register, login, getMe, Logout } from "../../controllers/auth.js";
import { privateRoutes } from "../../middleware/private.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", Logout);
router.get("/getMe", privateRoutes, getMe);

export default router;