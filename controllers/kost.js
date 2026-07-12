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
                kr.jatuh_tempo AS jatuhTempo,
 
                u.id AS idUser,
                u.fullname,
                u.gender,
 
                pk.tanggal_masuk AS tanggalMasuk,
                pk.tanggal_keluar AS tanggalKeluar,
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

    // Group per kamar (satu kamar bisa punya banyak baris pembayaran)
    const kamarMap = new Map();

    rows.forEach((row) => {
      if (!kamarMap.has(row.idKamar)) {
        kamarMap.set(row.idKamar, {
          id: row.idKamar,
          name: row.namaKamar,
          harga: row.harga,
          jatuhTempo: row.jatuhTempo,
          penghuni: row.idUser
            ? {
                id: row.idUser,
                fullname: row.fullname,
                gender: row.gender,
                tanggalMasuk: row.tanggalMasuk
                  ? dayjs(row.tanggalMasuk).format("YYYY-MM-DD")
                  : "-",
                tanggalKeluar: row.tanggalKeluar
                  ? dayjs(row.tanggalKeluar).format("YYYY-MM-DD")
                  : "-",
                status: row.statusPenghuni,
              }
            : null,
          _pembayaranRows: [], // sementara, dibuang sebelum response final
        });
      }

      if (row.idPembayaran) {
        kamarMap.get(row.idKamar)._pembayaranRows.push({
          idPembayaran: row.idPembayaran,
          // normalisasi ke 2 digit ("6" -> "06") biar konsisten sama
          // format yang dihasilkan getMonthRange(), dan gak keanggep beda bulan
          bulan: String(row.bulan).padStart(2, "0"),
          tahun: String(row.tahun),
          statusUser: row.statusUser,
          statusAdmin: row.statusAdmin,
          tanggalPembayaran: row.tanggalPembayaran,
        });
      }
    });

    const kamar = Array.from(kamarMap.values()).map((k) => {
      const { _pembayaranRows, penghuni, ...rest } = k;

      // Kamar kosong (gak ada penghuni aktif) -> gak ada kewajiban bayar
      if (!penghuni) {
        return { ...rest, penghuni: null, pembayaran: null };
      }

      // TODO: sesuaikan dengan value asli status_admin di DB kamu.
      // Di bawah ini nganggep pembayaran "lunas" kalau status_admin = "approved"/"lunas".
      const isPaid = (statusAdmin) =>
        ["approved", "lunas"].includes((statusAdmin || "").toLowerCase());

      // Bulan yang SEHARUSNYA dibayar: dari bulan masuk s.d bulan berjalan sekarang
      const tanggalMasuk = new Date(penghuni.tanggalMasuk);
      const expectedMonths = getMonthRange(tanggalMasuk, now);

      // Index pembayaran per "bulan-tahun" biar gampang dicocokin
      const paymentByMonth = new Map();
      _pembayaranRows.forEach((p) => {
        paymentByMonth.set(`${p.bulan}-${p.tahun}`, p);
      });

      // Timeline bulan wajib bayar (dari bulan masuk s.d sekarang)
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

      let statusRingkas = "lunas";
      if (totalNunggak > 0) statusRingkas = "nunggak";

      return {
        ...rest,
        penghuni,
        pembayaran: {
          totalBulanSeharusnya,
          totalSudahBayar,
          totalNunggak,
          totalDibayarDimuka,
          statusRingkas, // "lunas" | "nunggak"
          riwayat: [...riwayatWajib, ...riwayatDimuka],
        },
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
