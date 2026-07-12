import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const validMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  if (!validMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type."), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter }).single("file");

export default upload;
