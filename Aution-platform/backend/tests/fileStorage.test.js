import assert from "node:assert/strict";
import test from "node:test";
import { storeUploadedFile } from "../utils/fileStorage.js";

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

const jpegBuffer = Buffer.from([0xff, 0xd8, 0x00, 0x01, 0xff, 0xd9]);
const webpBuffer = Buffer.from("RIFFxxxxWEBP", "ascii");

test("stores allowed image data URLs with sanitized names", async () => {
  const stored = await storeUploadedFile({
    name: "../My Image!!.png",
    mimetype: "image/png",
    size: pngBuffer.length,
    data: pngBuffer,
  });

  assert.match(stored.public_id, /^uploads\/\d+-/);
  assert.ok(!stored.public_id.includes(".."));
  assert.match(stored.url, /^data:image\/png;base64,/);
});

test("accepts jpeg and webp signatures", async () => {
  const jpeg = await storeUploadedFile({
    name: "photo.jpg",
    mimetype: "image/jpeg",
    size: jpegBuffer.length,
    data: jpegBuffer,
  });
  const webp = await storeUploadedFile({
    name: "photo.webp",
    mimetype: "image/webp",
    size: webpBuffer.length,
    data: webpBuffer,
  });

  assert.match(jpeg.url, /^data:image\/jpeg;base64,/);
  assert.match(webp.url, /^data:image\/webp;base64,/);
});

test("rejects files whose bytes do not match image mimetype", async () => {
  await assert.rejects(
    () =>
      storeUploadedFile({
        name: "fake.png",
        mimetype: "image/png",
        size: 12,
        data: Buffer.from("not an image"),
      }),
    /does not match/
  );
});
