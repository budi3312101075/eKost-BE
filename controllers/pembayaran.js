import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { query } from "../utils/query.js";
import { dateValue } from "../utils/tools.cjs";

export const addPembayaran = async (req, res) => {
  const { bulan, tahun, commentUsers } = req.body;
  const { id: idUser, idKamar } = req.user;

  try {
    const buktiBayar = req.file;

    if (!buktiBayar) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Bukti bayar harus dikirimkan",
      });
    }

    const cekTagihan = await query(
      "SELECT id FROM pembayaran WHERE id_users = ? AND id_kamar = ? AND bulan = ? AND tahun = ?",
      [idUser, idKamar, bulan, tahun],
    );

    if (cekTagihan.length > 0) {
      fs.unlink(
        path.join(buktiBayar.destination, buktiBayar.filename),
        () => {},
      );

      return res.status(400).json({
        status: 400,
        success: false,
        message: "Bulan ini sudah di ajukan",
      });
    }

    await query(
      `
      INSERT INTO pembayaran
      (id, bulan, tahun, status_users, comment_users, status_admin, comment_admin, 
      tanggal_pembayaran, bukti_pembayaran, id_users, id_kamar) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        bulan,
        tahun,
        "Menunggu Konfirmasi",
        commentUsers,
        "Menunggu Konfirmasi",
        "",
        dateValue(),
        buktiBayar.filename,
        idUser,
        idKamar,
      ],
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Pembayaran Berhasil Di Ajukan",
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

export const riwayatPembayaran = async (req, res) => {
  const { id: idUser, idKamar } = req.user;

  try {
    const pembayaran = await query(
      "SELECT * FROM pembayaran WHERE id_users = ? AND id_kamar = ? ORDER BY tanggal_pembayaran DESC",
      [idUser, idKamar],
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Riwayat pembayaran berhasil di ambil",
      data: pembayaran,
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
