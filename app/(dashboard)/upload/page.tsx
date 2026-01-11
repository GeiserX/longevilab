"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Upload02Icon,
  File01Icon,
  Cancel01Icon,
  UserIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { trpc } from "@/lib/trpc";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const { data: members } = trpc.household.getMembers.useQuery();

  // Set default to primary member when data loads
  useEffect(() => {
    if (members && members.length > 0 && !selectedMemberId) {
      const primaryMember = members.find((m) => m.isPrimary);
      if (primaryMember) {
        setSelectedMemberId(primaryMember.id);
      } else {
        setSelectedMemberId(members[0].id);
      }
    }
  }, [members, selectedMemberId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        setError("Please upload a PDF file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        setError("Please upload a PDF file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedMemberId) {
        formData.append("householdMemberId", selectedMemberId);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Redirect to the history page where user can see processing status
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Blood Test</h1>
        <p className="text-muted-foreground">
          Upload a PDF of your blood test results for analysis
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Member Selector */}
        {members && members.length > 1 && (
          <div className="mb-6">
            <Label htmlFor="member-select" className="flex items-center gap-2 mb-2">
              <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-muted-foreground" />
              Uploading for
            </Label>
            <div className="relative">
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.isPrimary ? "(You)" : ""}
                  </option>
                ))}
              </select>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
        )}

        {!file ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <HugeiconsIcon
                  icon={Upload02Icon}
                  className="h-8 w-8 text-primary"
                />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                Drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supported format: PDF (max 10MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="h-5 w-5 text-primary"
                  />
                </div>
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload and Process"}
              </Button>
              <Button variant="outline" onClick={removeFile}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-medium text-foreground mb-2">How it works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Upload your blood test PDF</li>
          <li>Our system extracts text using OCR technology</li>
          <li>AI identifies and extracts biomarker values</li>
          <li>Review and confirm the extracted results</li>
          <li>Track your results over time</li>
        </ol>
      </Card>
    </div>
  );
}
