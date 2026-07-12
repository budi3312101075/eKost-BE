import { query } from "../utils/query.js";
import { uuid } from "../utils/tools.cjs";

export const addKamar = async (req, res) => {
  const { name, harga, jatuhTempo, idKost } = req.body;
  try {
    if (!name || !harga || !jatuhTempo || !idKost) {
      return res.status(400).json({
        status: 400,
        message: "Bad request",
      });
    }

    const exist = await query(
      "SELECT id FROM kamar WHERE name = ? AND id_kost = ? AND is_deleted = ?",
      [name, idKost, 0],
    );

    if (exist.length) {
      return res.status(409).json({
        status: 409,
        success: false,
        message: "Nama kamar sudah ada",
      });
    }

    await query(
      `INSERT INTO kamar 
        (id, name, harga, jatuh_tempo, id_kost) 
        VALUES (?, ?, ?, ?, ?)`,
      [uuid(), name, harga, jatuhTempo, idKost],
    );

    return res.status(201).json({
      status: 201,
      success: true,
      message: "Data kamar berhasil ditambahkan",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};
