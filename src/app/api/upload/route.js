import { NextResponse } from "next/server";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Upload directory configuration
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Generate unique filename
const generateFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const baseName = originalName
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[^a-zA-Z0-9]/g, "-") // Replace non-alphanumeric with dash
    .toLowerCase()
    .substring(0, 50); // Limit length
  return `${baseName}-${timestamp}-${random}.webp`;
};

// Ensure upload directory exists
const ensureUploadDir = async () => {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
};

// Convert image to WebP
const convertToWebP = async (buffer, quality = 75) => {
  return await sharp(buffer)
    .webp({ quality })
    .toBuffer();
};

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Content-Type harus multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files"); // Support multiple files with name "files"
    const file = formData.get("file"); // Support single file with name "file"

    // Collect all files to process
    const filesToProcess = [];
    
    if (file && file instanceof File) {
      filesToProcess.push(file);
    }
    
    if (files && files.length > 0) {
      for (const f of files) {
        if (f instanceof File) {
          filesToProcess.push(f);
        }
      }
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file yang di-upload" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    const uploadedFiles = [];
    const errors = [];

    for (const uploadFile of filesToProcess) {
      try {
        // Validate file type (only images)
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];
        if (!validTypes.includes(uploadFile.type)) {
          errors.push({
            filename: uploadFile.name,
            error: `Tipe file tidak didukung: ${uploadFile.type}. Hanya gambar yang diperbolehkan.`
          });
          continue;
        }

        // Get file buffer
        const arrayBuffer = await uploadFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Convert to WebP
        console.log(`🖼️ [UPLOAD] Converting ${uploadFile.name} to WebP...`);
        const webpBuffer = await convertToWebP(buffer, 75);

        // Generate filename and save
        const filename = generateFilename(uploadFile.name);
        const filePath = path.join(UPLOAD_DIR, filename);

        await writeFile(filePath, webpBuffer);

        const publicUrl = `/uploads/${filename}`;
        
        console.log(`✅ [UPLOAD] Saved: ${filename} (${webpBuffer.length} bytes)`);

        uploadedFiles.push({
          original_name: uploadFile.name,
          filename: filename,
          path: publicUrl,
          size: webpBuffer.length,
          mime_type: "image/webp"
        });
      } catch (fileError) {
        console.error(`❌ [UPLOAD] Error processing ${uploadFile.name}:`, fileError);
        errors.push({
          filename: uploadFile.name,
          error: fileError.message || "Gagal memproses file"
        });
      }
    }

    // Return response
    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Semua file gagal di-upload", 
          errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} file berhasil di-upload`,
      data: uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ [UPLOAD] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat upload" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

