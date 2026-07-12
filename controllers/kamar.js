import { query } from "../utils/query.js";
import { uuid } from "../utils/tools.cjs";

export const addKamar = async (req, res) => {
  const idKost = req.params.id;
  const { name, harga, jatuhTempo } = req.body;
  try {
    if (!name || !harga || !jatuhTempo || !idKost) {
      return res.status(400).json({
        status: 400,
        message: "Semua field wajib diisi",
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
    console.log(error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};

export const updateKamar = async (req, res) => {
  const { id } = req.params;
  const { name, harga, jatuhTempo } = req.body;
  try {
    if (!name || !harga || !jatuhTempo || !id) {
      return res.status(400).json({
        status: 400,
        message: "Semua field wajib diisi",
      });
    }

    const cekData = await query(
      "SELECT id, id_kost FROM kamar WHERE is_deleted = ? AND id = ?",
      [0, id],
    );

    if (!cekData.length) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Data kamar tidak ditemukan",
      });
    }

    const exist = await query(
      "SELECT id FROM kamar WHERE is_deleted = ? AND id_kost = ? AND name = ? AND id != ?",
      [0, cekData[0].id_kost, name, id],
    );

    if (exist.length) {
      return res.status(409).json({
        status: 409,
        success: false,
        message: "Nama kamar sudah ada",
      });
    }

    await query(
      `UPDATE kamar SET name = ?, harga = ?, jatuh_tempo = ? WHERE id = ?`,
      [name, harga, jatuhTempo, id],
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data kamar berhasil diupdate",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};

export const deleteKamar = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Semua field wajib diisi",
      });
    }

    const exist = await query(
      "SELECT id FROM kamar WHERE id = ? AND is_deleted = ?",
      [id, 0],
    );

    if (!exist.length) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Data kamar tidak ditemukan",
      });
    }

    await query("UPDATE kamar SET is_deleted = ? WHERE id = ?", [1, id]);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data kamar berhasil dihapus",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};
