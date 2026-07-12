import { Router } from "express";
import { privateRoutes } from "../../middleware/private.js";
import { addKamar, deleteKamar, updateKamar } from "../../controllers/kamar.js";

const router = Router();

router.post("/kamar/:id", privateRoutes, addKamar);
router.patch("/kamar/:id", privateRoutes, updateKamar);
router.delete("/kamar/:id", privateRoutes, deleteKamar);

export default router;
