import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { bloodTests } from "@/server/db/schema";
import { storage } from "@/server/services/storage";
import { queueOcrJob } from "@/server/jobs/queue";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const householdMemberId = formData.get("householdMemberId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const storedPath = await storage.upload(buffer, file.name);

    // Create blood test record
    const testDate = new Date().toISOString().split("T")[0]; // Default to today, will be updated by LLM
    const [bloodTest] = await db
      .insert(bloodTests)
      .values({
        userId: session.user.id,
        householdMemberId: householdMemberId || undefined,
        testDate,
        originalFilePath: storedPath,
        status: "pending",
      })
      .returning();

    // Queue OCR processing job
    await queueOcrJob({
      bloodTestId: bloodTest.id,
      filePath: storedPath,
    });

    return NextResponse.json({
      success: true,
      bloodTestId: bloodTest.id,
      message: "File uploaded and processing started",
    });

  } catch {
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
