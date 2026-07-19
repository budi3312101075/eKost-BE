const dayjs = require("dayjs");
const crypto = require("crypto");

const dateValue = () => {
  return dayjs().format("YYYY-MM-DD HH:mm:ss");
};

const uuid = () => {
  return crypto.randomUUID();
};

const STATUS_PEMBAYARAN = {
  LUNAS: "lunas",
  MENUNGGU_KONFIRMASI: "menunggu_konfirmasi",
  BELUM_BAYAR: "belum_bayar",
  DIBAYAR_DIMUKA: "dibayar_dimuka",
  DITOLAK: "ditolak",
  NUNGGAK: "nunggak",
};

const mapStatusAdmin = (statusAdmin) => {
  const s = (statusAdmin || "").toLowerCase().trim();
  if (s === "lunas") return STATUS_PEMBAYARAN.LUNAS;
  if (s === "ditolak") return STATUS_PEMBAYARAN.DITOLAK;
  return STATUS_PEMBAYARAN.MENUNGGU_KONFIRMASI;
};

module.exports = {
  dateValue,
  uuid,
  STATUS_PEMBAYARAN,
  mapStatusAdmin,
};
