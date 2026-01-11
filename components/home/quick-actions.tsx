"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload02Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { AddJournalEntryModal } from "./add-journal-entry-modal";
import { cn } from "@/lib/utils";

export function QuickActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/upload"
          className={cn(
            buttonVariants({ size: "lg" }),
            "flex-1 flex items-center gap-2"
          )}
        >
          <HugeiconsIcon icon={Upload02Icon} className="size-5" />
          Upload Blood Test
        </Link>
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => setIsModalOpen(true)}
        >
          <HugeiconsIcon icon={Add01Icon} className="size-5" />
          Add Journal Entry
        </Button>
      </div>

      <AddJournalEntryModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
