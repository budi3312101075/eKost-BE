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

export const getPembayaranAdmin = async (req, res) => {
  try {
    const pembayaran = await query(
      `SELECT
          p.id,
          p.bulan,
          p.tahun,
          p.status_users AS statusUser,
          p.comment_users AS commentUsers,
          p.status_admin AS statusAdmin,
          p.comment_admin AS commentAdmin,
          p.tanggal_pembayaran AS tanggalPembayaran,
          p.bukti_pembayaran AS buktiPembayaran,
          u.id AS idUser,
          u.fullname,
          u.phone,
          k.id AS idKamar,
          k.name AS namaKamar,
          k.harga,
          ko.id AS idKost,
          ko.name AS namaKost
      FROM pembayaran p
      JOIN users u
          ON u.id = p.id_users
      JOIN kamar k
          ON k.id = p.id_kamar
      JOIN kost ko
          ON ko.id = k.id_kost
      WHERE LOWER(TRIM(p.status_admin)) != 'lunas'
      ORDER BY p.tanggal_pembayaran ASC`,
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Pembayaran menunggu konfirmasi berhasil diambil",
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

export const konfirmasiPembayaran = async (req, res) => {
  const { id, statusAdmin, commentAdmin } = req.body;

  try {
    const pembayaran = await query("SELECT id FROM pembayaran WHERE id = ?", [
      id,
    ]);

    if (pembayaran.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Pembayaran tidak ditemukan",
      });
    }

    if (statusAdmin === "Selesai") {
      await query(
        "UPDATE pembayaran SET status_users = ?, status_admin = ?, comment_admin = ? WHERE id = ?",
        ["lunas", "lunas", "lunas", id],
      );
    }

    if (statusAdmin === "Ditolak") {
      await query(
        "UPDATE pembayaran SET status_admin = ?, comment_admin = ? WHERE id = ?",
        [statusAdmin, commentAdmin, id],
      );
    }

    if (statusAdmin === "Nunggak") {
      await query(
        "UPDATE pembayaran SET status_admin = ?, comment_admin = ? WHERE id = ?",
        [statusAdmin, commentAdmin, id],
      );
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Pembayaran berhasil di konfirmasi",
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
