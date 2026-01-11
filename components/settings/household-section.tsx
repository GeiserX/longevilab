"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
  UserIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";

type Member = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  sex: string | null;
  relationship: string | null;
  isPrimary: boolean | null;
};

const relationshipLabels: Record<string, string> = {
  self: "Yourself",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  other: "Other",
};

export function HouseholdSection() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [relationship, setRelationship] = useState<
    "self" | "spouse" | "child" | "parent" | "sibling" | "other" | ""
  >("");

  const { data: household, isLoading } = trpc.household.getOrCreate.useQuery();
  const utils = trpc.useUtils();

  const addMember = trpc.household.addMember.useMutation({
    onSuccess: () => {
      utils.household.invalidate();
      resetForm();
      setIsAddOpen(false);
    },
  });

  const updateMember = trpc.household.updateMember.useMutation({
    onSuccess: () => {
      utils.household.invalidate();
      resetForm();
      setEditingMember(null);
    },
  });

  const removeMember = trpc.household.removeMember.useMutation({
    onSuccess: () => {
      utils.household.invalidate();
      setDeletingMember(null);
    },
  });

  const resetForm = () => {
    setName("");
    setDateOfBirth("");
    setSex("");
    setRelationship("");
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setDateOfBirth(member.dateOfBirth || "");
    setSex((member.sex as "male" | "female" | "other") || "");
    setRelationship(
      (member.relationship as "spouse" | "child" | "parent" | "sibling" | "other") || ""
    );
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMember.mutate({
      name,
      dateOfBirth: dateOfBirth || undefined,
      sex: sex || undefined,
      relationship: relationship || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    updateMember.mutate({
      id: editingMember.id,
      name,
      dateOfBirth: dateOfBirth || null,
      sex: sex || null,
      relationship: relationship || null,
    });
  };

  const handleDelete = () => {
    if (!deletingMember) return;
    removeMember.mutate({ id: deletingMember.id });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground">Loading household...</div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon icon={Home01Icon} className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-foreground">
                Household Management
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage household members and their health data
              </p>
            </div>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Members list */}
        <div className="space-y-3">
          {household?.members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <HugeiconsIcon
                    icon={UserIcon}
                    className="h-5 w-5 text-muted-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    {member.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                    {member.relationship && (
                      <Badge variant="outline" className="text-xs">
                        {relationshipLabels[member.relationship] || member.relationship}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.dateOfBirth && (
                      <span>Born {format(new Date(member.dateOfBirth), "MMM d, yyyy")}</span>
                    )}
                    {member.sex && member.dateOfBirth && " • "}
                    {member.sex && (
                      <span className="capitalize">{member.sex}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(member)}
                >
                  <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4" />
                </Button>
                {!member.isPrimary && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingMember(member)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {(!household?.members || household.members.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No household members yet. Add your first member to get started.
            </div>
          )}
        </div>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Household Member</DialogTitle>
            <DialogDescription>
              Add a family member or dependent to track their health data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-relationship">Relationship</Label>
                <div className="relative">
                  <select
                    id="add-relationship"
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(
                        e.target.value as "spouse" | "child" | "parent" | "sibling" | "other" | ""
                      )
                    }
                    className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-dob">Date of Birth</Label>
                <Input
                  id="add-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-sex">Biological Sex</Label>
                <div className="relative">
                  <select
                    id="add-sex"
                    value={sex}
                    onChange={(e) =>
                      setSex(e.target.value as "male" | "female" | "other" | "")
                    }
                    className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => {
        if (!open) {
          setEditingMember(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update the information for this household member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              {!editingMember?.isPrimary && (
                <div className="space-y-2">
                  <Label htmlFor="edit-relationship">Relationship</Label>
                  <div className="relative">
                    <select
                      id="edit-relationship"
                      value={relationship}
                      onChange={(e) =>
                        setRelationship(
                          e.target.value as "spouse" | "child" | "parent" | "sibling" | "other" | ""
                        )
                      }
                      className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Select relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="other">Other</option>
                    </select>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sex">Biological Sex</Label>
                <div className="relative">
                  <select
                    id="edit-sex"
                    value={sex}
                    onChange={(e) =>
                      setSex(e.target.value as "male" | "female" | "other" | "")
                    }
                    className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove household member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deletingMember?.name} from your household. Their blood test data will remain but won&apos;t be associated with any household member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
