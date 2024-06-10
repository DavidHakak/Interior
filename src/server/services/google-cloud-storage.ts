import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  keyFilename: "src/server/services/keyfile.json",
});

export const uploadImageBase64 = async (base64: string) => {
  try {
    const bucket = storage.bucket("metacreateor_files");

    const fileId = Date.now(); // Generate a unique file ID
    const file = bucket.file(`auctions/${fileId}.jpg`);

    const fileOptions = {
      metadata: {
        contentType: "image/jpeg", // Set the content type to image/jpeg
      },
    };

    if (typeof base64 === "string") {
      const fileBuffer = Buffer.from(base64, "base64"); // Use 'base64' parameter instead of 'base64EncodedString'
      await file.save(fileBuffer, fileOptions);
    } else {
      console.error("Invalid base64 input.");
      throw new Error("Invalid base64 input."); // Throw an error for invalid input
    }

    const publicUrl = `https://storage.googleapis.com/metacreateor_files/auctions/${fileId}.jpg`;
    console.log({ publicUrl });

    return publicUrl;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
