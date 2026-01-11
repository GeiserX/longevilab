import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { healthDataImports } from "@/server/db/schema";
import { storage } from "@/server/services/storage";
import { queueHealthExportJob } from "@/server/jobs/queue";

// 100MB max file size for health exports
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types for ZIP files
const ALLOWED_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
];

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload a ZIP file exported from the iPhone Health app.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const storedPath = await storage.upload(buffer, file.name);
    console.log(`[HealthExportUpload] File stored at: ${storedPath}`);

    // Calculate date range (last 1 year)
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Create import tracking record
    const [importRecord] = await db
      .insert(healthDataImports)
      .values({
        userId: session.user.id,
        originalFileName: file.name,
        storedFilePath: storedPath,
        fileSizeBytes: file.size,
        status: "pending",
        importFromDate: oneYearAgo,
        importToDate: now,
      })
      .returning();

    console.log(`[HealthExportUpload] Created import record: ${importRecord.id}`);

    // Queue processing job
    await queueHealthExportJob({
      importId: importRecord.id,
      filePath: storedPath,
      userId: session.user.id,
      importFromDate: oneYearAgo.toISOString(),
    });

    console.log(
      `[HealthExportUpload] Queued processing job for import: ${importRecord.id}`
    );

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      message: "File uploaded and processing started",
    });
  } catch (error) {
    console.error("[HealthExportUpload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
