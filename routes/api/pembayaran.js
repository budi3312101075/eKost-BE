import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import {
  addPembayaran,
  riwayatPembayaran,
} from "../../controllers/pembayaran.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post("/pembayaran", privateRoutes, upload, addPembayaran);
router.get("/riwayatPembayaran", privateRoutes, riwayatPembayaran);

export default router;
