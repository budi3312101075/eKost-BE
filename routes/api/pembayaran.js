import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import {
  addPembayaran,
  getPembayaranAdmin,
  konfirmasiPembayaran,
  riwayatPembayaran,
} from "../../controllers/pembayaran.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post("/pembayaran", privateRoutes, upload, addPembayaran);
router.get("/riwayatPembayaran", privateRoutes, riwayatPembayaran);
router.get("/pembayaranAdmin", privateRoutes, getPembayaranAdmin);
router.patch("/konfirmasiPembayaran", privateRoutes, konfirmasiPembayaran);

export default router;
