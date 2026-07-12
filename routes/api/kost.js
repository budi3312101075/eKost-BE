import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import { getKamarByKost } from "../../controllers/kost.js";

const router = Router();

router.get("/kamarbykost/:id", privateRoutes, getKamarByKost);

export default router;
