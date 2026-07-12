import { query } from "../utils/query.js";
import { uuid } from "../utils/tools.cjs";

export const getKost = async (req, res) => {
  try {
    const data = await query(
      `SELECT id, name, lokasi, 
            jumlah_kamar AS jumlahKamar 
            FROM kost 
            WHERE is_deleted = ?`,
      [0],
    );

    res.status(200).json({
      status: 200,
      message: "get data berhasil",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

export const detailKost = async (req, res) => {
  try {
    const rows = await query(
      `SELECT k.id, k.name, k.lokasi, k.jumlah_kamar AS jumlahKamar,
              kr.id AS idKamar, kr.name AS nameKamar, kr.harga, kr.jatuh_tempo AS jatuhTempo
              FROM kost k
              INNER JOIN kamar kr ON k.id = kr.id_kost
              WHERE k.is_deleted = 0 AND kr.is_deleted = 0
              ORDER BY k.name ASC`,
    );

    const kostMap = new Map();
    for (const row of rows) {
      if (!kostMap.has(row.id)) {
        kostMap.set(row.id, {
          id: row.id,
          name: row.name,
          lokasi: row.lokasi,
          jumlahKamar: row.jumlahKamar,
          kamar: [],
        });
      }
      kostMap.get(row.id).kamar.push({
        id: row.idKamar,
        name: row.nameKamar,
        harga: row.harga,
        jatuhTempo: row.jatuhTempo,
      });
    }

    const data = Array.from(kostMap.values()).map((kost) => ({
      ...kost,
      kamar: kost.kamar.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    }));

    res.status(200).json({
      status: 200,
      message: "get data berhasil",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

export const addKost = async (req, res) => {
  const idKost = uuid();
  const { name, lokasi, jumlahKamar } = req.body;
  try {
    if (!name?.trim() || !lokasi?.trim() || jumlahKamar == null) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    if (Number(jumlahKamar) <= 0) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Jumlah kamar harus lebih dari 0",
      });
    }

    const exist = await query(
      "SELECT id FROM kost WHERE name = ? AND is_deleted = ?",
      [name, 0],
    );

    if (exist.length) {
      return res.status(409).json({
        status: 409,
        success: false,
        message: "Nama kost sudah ada",
      });
    }

    await query(
      `
        INSERT INTO kost (id, name, lokasi, jumlah_kamar, is_deleted)
        VALUES (?, ?, ?, ?, ?)`,
      [idKost, name, lokasi, jumlahKamar, 0],
    );

    for (let i = 1; i <= jumlahKamar; i++) {
      await query(
        `
                INSERT INTO kamar 
                (id, name, harga, jatuh_tempo, id_kost) 
                VALUES (?, ?, ?, ?, ?)`,
        [uuid(), `Kamar ${i}`, 0, 1, idKost],
      );
    }

    return res.status(201).json({
      status: 201,
      success: true,
      message: "Data kost berhasil ditambahkan",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateKost = async (req, res) => {
  const { id } = req.params;
  const { name, lokasi, jumlahKamar } = req.body;
  try {
    if (!name?.trim() || !lokasi?.trim() || jumlahKamar == null) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    const [kost] = await query(
      "SELECT id FROM kost WHERE id=? AND is_deleted = ?",
      [id, 0],
    );

    if (!kost) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    const duplicate = await query(
      "SELECT id FROM kost WHERE name=? AND id <> ? AND is_deleted = ?",
      [name, id, 0],
    );

    if (duplicate.length) {
      return res.status(409).json({
        status: 4090,
        success: false,
        message: "Nama kost sudah digunakan",
      });
    }

    await query(
      `
        UPDATE kost SET name = ?, lokasi = ?, jumlah_kamar = ?
        WHERE id = ?`,
      [name, lokasi, jumlahKamar, id],
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data berhasil diupdate",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteKost = async (req, res) => {
  const { id } = req.params;
  try {
    const [kost] = await query(
      "SELECT id FROM kost WHERE id=? AND is_deleted = ?",
      [id, 0],
    );

    if (!kost) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    await query("UPDATE kost SET is_deleted = ? WHERE id = ?", [1, id]);

    await query("UPDATE kamar SET is_deleted = ? WHERE id_kost = ?", [1, id]);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data berhasil dihapus",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
    });
  }
};
