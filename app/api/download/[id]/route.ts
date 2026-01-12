import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { bloodTests } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { stat } from "fs/promises";
import path from "path";
import { storage } from "@/server/services/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate the user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the blood test and verify ownership
    const bloodTest = await db.query.bloodTests.findFirst({
      where: and(
        eq(bloodTests.id, id),
        eq(bloodTests.userId, session.user.id)
      ),
    });

    if (!bloodTest) {
      return NextResponse.json(
        { error: "Blood test not found" },
        { status: 404 }
      );
    }

    if (!bloodTest.originalFilePath) {
      return NextResponse.json(
        { error: "No file available for this blood test" },
        { status: 404 }
      );
    }

    // Get the full path using storage service
    const filePath = storage.getPath(bloodTest.originalFilePath);

    try {
      await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found on server" },
        { status: 404 }
      );
    }

    // Read the file using storage service
    const fileBuffer = await storage.download(bloodTest.originalFilePath);

    // Get the filename for the download
    const filename = path.basename(filePath);
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    }

    // Return the file as a download
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(fileBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
