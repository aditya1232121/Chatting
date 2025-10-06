import multer from "multer";

// ✅ Store files in memory (not disk) for direct Cloudinary upload
const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB max
});

// ✅ Single file upload (for avatar)
export const singleAvatar = multerUpload.single("avatar");

// ✅ Multiple file upload (for chat attachments)
export const attachmentsMulter = multerUpload.array("files", 5);
