import { readFile, unlink } from "fs/promises";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const hasValidImageSignature = (buffer, mimetype) => {
  if (mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  }
  if (mimetype === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
};

export const storeUploadedFile = async (file, folder = "uploads") => {
  if (!file) {
    const err = new Error("File is required");
    err.statusCode = 400;
    throw err;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    const err = new Error("Image size must be 2MB or less");
    err.statusCode = 400;
    throw err;
  }

  const buffer = file.tempFilePath
    ? await readFile(file.tempFilePath)
    : file.data;

  if (!buffer || buffer.length === 0) {
    const err = new Error("Uploaded file is empty");
    err.statusCode = 400;
    throw err;
  }

  if (!hasValidImageSignature(buffer, file.mimetype)) {
    const err = new Error("Uploaded file content does not match an allowed image format");
    err.statusCode = 400;
    throw err;
  }

  if (file.tempFilePath) {
    await unlink(file.tempFilePath).catch(() => {});
  }

  const safeName = String(file.name || "upload")
    .replace(/[^a-z0-9._-]/gi, "-")
    .replace(/\.\.+/g, ".")
    .replace(/^[.-]+/, "")
    .replace(/-+/g, "-")
    .slice(0, 80) || "upload";

  return {
    public_id: `${folder}/${Date.now()}-${safeName}`,
    url: `data:${file.mimetype};base64,${buffer.toString("base64")}`,
  };
};
