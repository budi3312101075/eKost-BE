import { query } from "../utils/query.js";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { mapStatusAdmin, STATUS_PEMBAYARAN, uuid } from "../utils/tools.cjs";
import dayjs from "dayjs";

export const register = async (req, res) => {
  const idUser = uuid();
  const {
    username,
    password,
    fullname,
    gender,
    email,
    phone,
    idKamar,
    tanggalMasuk,
    isAdmin,
  } = req.body;
  try {
    if (
      !username ||
      !password ||
      !fullname ||
      !gender ||
      !email ||
      !phone ||
      !idKamar ||
      !tanggalMasuk
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await query(`SELECT * FROM users WHERE username = ?`, [
      username,
    ]);

    if (user.length > 0) {
      return res.status(400).json({ message: "Username sudah terdaftar" });
    }

    const hashPassword = await argon2.hash(password);

    await query(
      `
        INSERT INTO users 
        (id, username, password, fullname, gender, email, phone, is_admin) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idUser, username, hashPassword, fullname, gender, email, phone, isAdmin],
    );

    if (!isAdmin) {
      await query(
        `
                INSERT INTO penghuni_kamar 
                (id, id_users, id_kamar, tanggal_masuk, tanggal_keluar, status) 
                VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), idUser, idKamar, tanggalMasuk, null, 1],
      );
    }

    res.status(201).json({ message: "Registrasi berhasil" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    const users = await query(
      `SELECT u.id, u.username, u.password, u.fullname, u.is_admin AS isAdmin, pk.id_kamar AS idKamar, pk.status
       FROM users u 
       LEFT JOIN penghuni_kamar pk ON u.id = pk.id_users
       WHERE u.username = ?`,
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    if (users[0].status === 1) {
      return res.status(401).json({ message: "Anda tidak aktif" });
    }

    const user = users[0];

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      idKamar: user.idKamar,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });

    const options = {
      httpOnly: true,
      maxAge: 3600000 * 24,
    };

    return res
      .status(200)
      .cookie("token", token, options)
      .json({ success: true, data: token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const Logout = async (req, res) => {
  try {
    return res
      .status(200)
      .clearCookie("token")
      .json({ success: true, msg: "Logout Berhasil!" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  const { id } = req.user;
  try {
    const [user] = await query(
      `
            SELECT
                u.id,
                u.username,
                u.fullname,
                u.gender,
                u.email,
                u.phone,
                u.is_admin AS isAdmin,
                pk.id_kamar AS idKamar,
                k.name AS nameKamar,
                k.harga AS tagihan,
                k.id_kost AS idKost,
                ko.name AS nameKost,
                pk.tanggal_masuk AS tanggalMasuk,
                pk.jatuh_tempo AS jatuhTempo
            FROM users u
            LEFT JOIN penghuni_kamar pk
                ON u.id = pk.id_users
                AND pk.status = 'Aktif'
            LEFT JOIN kamar k
                ON k.id = pk.id_kamar
            LEFT JOIN kost ko
                ON ko.id = k.id_kost
            WHERE u.id = ?
            `,
      [id],
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    let statusPembayaranBulanIni = null;

    if (user.idKamar) {
      const bulanIni = Number(dayjs().format("MM"));
      const tahunIni = Number(dayjs().format("YYYY"));

      const [pembayaranTerakhir] = await query(
        `
                SELECT bulan, tahun, status_admin AS statusAdmin
                FROM pembayaran
                WHERE id_users = ?
                    AND id_kamar = ?
                ORDER BY tahun DESC, bulan DESC
                LIMIT 1
                `,
        [id, user.idKamar],
      );

      if (!pembayaranTerakhir) {
        statusPembayaranBulanIni = STATUS_PEMBAYARAN.BELUM_BAYAR;
      } else {
        const periodeTerakhir =
          Number(pembayaranTerakhir.tahun) * 12 +
          Number(pembayaranTerakhir.bulan);
        const periodeSekarang = tahunIni * 12 + bulanIni;

        if (periodeTerakhir >= periodeSekarang) {
          statusPembayaranBulanIni = mapStatusAdmin(
            pembayaranTerakhir.statusAdmin,
          );
        } else {
          statusPembayaranBulanIni = STATUS_PEMBAYARAN.NUNGGAK;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        statusPembayaranBulanIni,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
