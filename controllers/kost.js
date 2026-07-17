import dayjs from "dayjs";
import { query } from "../utils/query.js";

const getMonthRange = (startDate, endDate) => {
  const result = [];
  let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cur <= end) {
    result.push({
      bulan: String(cur.getMonth() + 1).padStart(2, "0"),
      tahun: String(cur.getFullYear()),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
};

const isPaid = (statusAdmin) =>
  ["lunas"].includes((statusAdmin || "").toLowerCase());

export const getKamarByKost = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
                k.id AS idKost,
                k.name AS namaKost,

                kr.id AS idKamar,
                kr.name AS namaKamar,
                kr.harga,

                u.id AS idUser,
                u.fullname,
                u.gender,

                pk.tanggal_masuk AS tanggalMasuk,
                pk.tanggal_keluar AS tanggalKeluar,
                pk.jatuh_tempo AS jatuhTempo,
                pk.status AS statusPenghuni,

                p.id AS idPembayaran,
                p.bulan,
                p.tahun,
                p.status_users AS statusUser,
                p.status_admin AS statusAdmin,
                p.tanggal_pembayaran AS tanggalPembayaran

            FROM kost k

            LEFT JOIN kamar kr
                ON kr.id_kost = k.id
                AND kr.is_deleted = 0

            -- hanya penghuni AKTIF (status = 0). Penghuni yg sudah keluar
            -- sengaja tidak diikutkan sama sekali (lihat catatan di bawah).
            LEFT JOIN penghuni_kamar pk
                ON pk.id_kamar = kr.id
                AND pk.status = 0

            LEFT JOIN users u
                ON u.id = pk.id_users

            -- TIDAK difilter bulan/tahun lagi, kita butuh SEMUA history pembayaran
            -- penghuni ini di kamar ini, biar bisa dibandingkan dgn bulan seharusnya bayar
            LEFT JOIN pembayaran p
                ON p.id_users = u.id
                AND p.id_kamar = kr.id

            WHERE k.id = ?
            ORDER BY CAST(TRIM(SUBSTRING_INDEX(kr.name, '-', -1)) AS UNSIGNED) ASC,
                     kr.name ASC,
                     u.id ASC,
                     p.tahun ASC,
                     p.bulan ASC
        `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Data kost tidak ditemukan",
      });
    }

    const now = new Date();

    const kamarMap = new Map();

    rows.forEach((row) => {
      if (!kamarMap.has(row.idKamar)) {
        kamarMap.set(row.idKamar, {
          id: row.idKamar,
          name: row.namaKamar,
          harga: row.harga,
          penghuniMap: new Map(),
        });
      }

      if (!row.idUser) return;

      const kamarEntry = kamarMap.get(row.idKamar);

      if (!kamarEntry.penghuniMap.has(row.idUser)) {
        kamarEntry.penghuniMap.set(row.idUser, {
          id: row.idUser,
          fullname: row.fullname,
          gender: row.gender,
          tanggalMasuk: row.tanggalMasuk
            ? dayjs(row.tanggalMasuk).format("YYYY-MM-DD")
            : "-",
          tanggalKeluar: row.tanggalKeluar
            ? dayjs(row.tanggalKeluar).format("YYYY-MM-DD")
            : "-",
          jatuhTempo: row.jatuhTempo,
          status: row.statusPenghuni,
          _pembayaranRows: [],
        });
      }

      if (row.idPembayaran) {
        kamarEntry.penghuniMap.get(row.idUser)._pembayaranRows.push({
          idPembayaran: row.idPembayaran,
          bulan: String(row.bulan).padStart(2, "0"),
          tahun: String(row.tahun),
          statusUser: row.statusUser,
          statusAdmin: row.statusAdmin,
          tanggalPembayaran: row.tanggalPembayaran,
        });
      }
    });

    const hitungPembayaranPenghuni = (penghuni) => {
      const { _pembayaranRows, ...rest } = penghuni;

      const tanggalMasuk = new Date(rest.tanggalMasuk);
      const expectedMonths = getMonthRange(tanggalMasuk, now);

      const paymentByMonth = new Map();
      _pembayaranRows.forEach((p) => {
        paymentByMonth.set(`${p.bulan}-${p.tahun}`, p);
      });

      const riwayatWajib = expectedMonths.map(({ bulan, tahun }) => {
        const payment = paymentByMonth.get(`${bulan}-${tahun}`);
        return {
          bulan,
          tahun,
          idPembayaran: payment?.idPembayaran || null,
          statusAdmin: payment?.statusAdmin || null,
          tanggalPembayaran: payment?.tanggalPembayaran || null,
          status: payment
            ? isPaid(payment.statusAdmin)
              ? "lunas"
              : "menunggu_konfirmasi"
            : "belum_bayar",
        };
      });

      // Pembayaran yang tanggalnya LEBIH MAJU dari bulan sekarang -> dibayar di muka
      const riwayatDimuka = _pembayaranRows
        .filter(
          (p) =>
            !expectedMonths.some(
              (m) => m.bulan === p.bulan && m.tahun === p.tahun,
            ),
        )
        .map((p) => ({
          bulan: p.bulan,
          tahun: p.tahun,
          idPembayaran: p.idPembayaran,
          statusAdmin: p.statusAdmin,
          tanggalPembayaran: p.tanggalPembayaran,
          status: isPaid(p.statusAdmin)
            ? "dibayar_dimuka"
            : "menunggu_konfirmasi",
        }));

      const totalBulanSeharusnya = riwayatWajib.length;
      const totalNunggak = riwayatWajib.filter(
        (r) => r.status === "belum_bayar",
      ).length;
      const totalSudahBayar = riwayatWajib.filter(
        (r) => r.status === "lunas",
      ).length;
      const totalDibayarDimuka = riwayatDimuka.filter(
        (r) => r.status === "dibayar_dimuka",
      ).length;

      const statusRingkas = totalNunggak > 0 ? "nunggak" : "lunas";

      return {
        ...rest,
        pembayaran: {
          totalBulanSeharusnya,
          totalSudahBayar,
          totalNunggak,
          totalDibayarDimuka,
          statusRingkas,
          riwayat: [...riwayatWajib, ...riwayatDimuka],
        },
      };
    };

    const kamar = Array.from(kamarMap.values()).map((k) => {
      const { penghuniMap, ...rest } = k;

      const penghuni = Array.from(penghuniMap.values()).map(
        hitungPembayaranPenghuni,
      );

      const statusRingkasKamar = penghuni.length
        ? penghuni.some((p) => p.pembayaran.statusRingkas === "nunggak")
          ? "nunggak"
          : "lunas"
        : null;

      return {
        ...rest,
        statusRingkasKamar,
        penghuni,
      };
    });

    const kost = {
      id: rows[0].idKost,
      name: rows[0].namaKost,
      kamar,
    };

    return res.status(200).json({
      success: true,
      data: kost,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
