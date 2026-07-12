import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import {
  addKost,
  deleteKost,
  detailKost,
  getKost,
  updateKost,
  addKamar,
  deleteKamar,
  updateKamar,
} from "../../controllers/dataKost.js";

const router = Router();

router.get("/kost", privateRoutes, getKost);
router.get("/detailKost", privateRoutes, detailKost);
router.post("/kost", privateRoutes, addKost);
router.patch("/kost/:id", privateRoutes, updateKost);
router.delete("/kost/:id", privateRoutes, deleteKost);
router.post("/kamar/:id", privateRoutes, addKamar);
router.patch("/kamar/:id", privateRoutes, updateKamar);
router.delete("/kamar/:id", privateRoutes, deleteKamar);

export default router;
