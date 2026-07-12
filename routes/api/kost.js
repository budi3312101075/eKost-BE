import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import {
  addKost,
  deleteKost,
  detailKost,
  getKost,
  updateKost,
} from "../../controllers/kost.js";

const router = Router();

router.get("/kost", privateRoutes, getKost);
router.get("/detailKost", privateRoutes, detailKost);
router.post("/kost", privateRoutes, addKost);
router.patch("/kost/:id", privateRoutes, updateKost);
router.delete("/kost/:id", privateRoutes, deleteKost);

export default router;
