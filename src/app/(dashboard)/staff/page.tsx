// src/app/(dashboard)/staff/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Stethoscope,
  Heart,
  ClipboardList,
  Pill,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  BadgeCheck,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createStaffSchema,
  type CreateStaffInput,
} from "@/schemas/auth.schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  staffProfile: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    department?: string | null;
    qualification?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "DOCTOR", label: "Doctor", icon: Stethoscope },
  { value: "NURSE", label: "Nurse", icon: Heart },
  { value: "RECEPTIONIST", label: "Receptionist", icon: ClipboardList },
  { value: "PHARMACIST", label: "Pharmacist", icon: Pill },
] as const;

const ALL_ROLES = [
  { value: "ADMIN", label: "Admin", icon: Shield },
  ...ROLES,
] as const;

const ROLE_STYLES: Record<
  string,
  {
    badge: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  ADMIN: {
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: Shield,
  },
  DOCTOR: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: Stethoscope,
  },
  NURSE: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: Heart,
  },
  RECEPTIONIST: {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    icon: ClipboardList,
  },
  PHARMACIST: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: Pill,
  },
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.DOCTOR;
  const RoleIcon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold",
        "px-2 py-0.5 rounded-lg border",
        style.badge,
      )}
    >
      <RoleIcon className="h-3 w-3" />
      {role.replace("_", " ")}
    </span>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({
  member,
  onToggleActive,
  onView,
  isUpdating,
}: {
  member: StaffMember;
  onToggleActive: (id: string, active: boolean) => void;
  onView: (member: StaffMember) => void;
  isUpdating: string | null;
}) {
  const fullName = member.staffProfile
    ? `${member.staffProfile.firstName} ${member.staffProfile.lastName}`
    : member.email;

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        !member.isActive && "opacity-60",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <UserAvatar name={fullName} size="md" useImage />
            {/* Active indicator dot */}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full",
                "border-2 border-white",
                member.isActive ? "bg-emerald-500" : "bg-slate-300",
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {fullName}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {member.email}
                </p>
              </div>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                    disabled={isUpdating === member.id}
                  >
                    {isUpdating === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onView(member)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {member.isActive ? (
                    <DropdownMenuItem
                      onClick={() => onToggleActive(member.id, false)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onToggleActive(member.id, true)}
                      className="text-emerald-600 focus:text-emerald-600"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Reactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Role + status row */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <RoleBadge role={member.role} />
              {!member.isActive && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  Inactive
                </span>
              )}
              {member.mustChangePassword && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  Pwd Change Req.
                </span>
              )}
            </div>

            {/* Extra info row */}
            <div className="mt-3 space-y-1">
              {member.staffProfile?.department && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  {member.staffProfile.department}
                </div>
              )}
              {member.staffProfile?.phone && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  {member.staffProfile.phone}
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-[10px] text-slate-400 mt-3">
              Added {format(new Date(member.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Staff Form ────────────────────────────────────────────────────────

function CreateStaffDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPwHint, setShowPwHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: CreateStaffInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Staff account created successfully", {
          description: "A welcome email with login credentials has been sent.",
        });
        reset();
        onSuccess();
        onClose();
      } else {
        setError(result.error ?? "Failed to create staff account");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            Create Staff Account
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Role selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Role <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(({ value, label, icon: RoleIcon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("role", value)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium",
                    "transition-all duration-150 text-left",
                    selectedRole === value
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <RoleIcon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="text-xs text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Aminu"
                className="rounded-xl border-slate-200"
                {...register("firstName")}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Musa"
                className="rounded-xl border-slate-200"
                {...register("lastName")}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                placeholder="staff@hospital.com"
                className="pl-9 rounded-xl border-slate-200"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="tel"
                placeholder="+234 800 000 0000"
                className="pl-9 rounded-xl border-slate-200"
                {...register("phone")}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Department + Qualification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Department
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. Surgery"
                  className="pl-9 rounded-xl border-slate-200"
                  {...register("department")}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Qualification
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. MBBS, RN"
                  className="pl-9 rounded-xl border-slate-200"
                  {...register("qualification")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* License Number */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              License / Registration Number
            </Label>
            <div className="relative">
              <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="e.g. MDCN-12345"
                className="pl-9 rounded-xl border-slate-200"
                {...register("licenseNumber")}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password info hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <button
              type="button"
              onClick={() => setShowPwHint(!showPwHint)}
              className="flex items-center gap-2 text-amber-700 text-xs font-semibold w-full text-left"
            >
              {showPwHint ? (
                <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Eye className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              How does the staff password work?
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 ml-auto transition-transform",
                  showPwHint && "rotate-180",
                )}
              />
            </button>
            {showPwHint && (
              <p className="text-xs text-amber-600 mt-2 leading-relaxed">
                A secure temporary password is automatically generated and sent
                to the staff member&apos;s email. They will be required to
                change it on their first login.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Staff Dialog ────────────────────────────────────────────────────────

function ViewStaffDialog({
  member,
  onClose,
}: {
  member: StaffMember | null;
  onClose: () => void;
}) {
  if (!member) return null;

  const fullName = member.staffProfile
    ? `${member.staffProfile.firstName} ${member.staffProfile.lastName}`
    : member.email;

  const rows: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
  }[] = [
    { icon: Mail, label: "Email", value: member.email },
    { icon: Phone, label: "Phone", value: member.staffProfile?.phone },
    {
      icon: Building2,
      label: "Department",
      value: member.staffProfile?.department,
    },
    {
      icon: GraduationCap,
      label: "Qualification",
      value: member.staffProfile?.qualification,
    },
    {
      icon: BadgeCheck,
      label: "License No.",
      value: member.staffProfile?.licenseNumber,
    },
    {
      icon: Stethoscope,
      label: "Specialization",
      value: member.staffProfile?.specialization,
    },
  ];

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Staff Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header block */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <UserAvatar name={fullName} size="lg" useImage />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-base leading-tight truncate">
                {fullName}
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <RoleBadge role={member.role} />
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-lg border",
                    member.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200",
                  )}
                >
                  {member.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Joined {format(new Date(member.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            {rows.map(({ icon: Icon, label, value }) =>
              value ? (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm text-slate-700 font-medium mt-0.5">
                      {value}
                    </p>
                  </div>
                </div>
              ) : null,
            )}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {member.isEmailVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                <BadgeCheck className="h-3 w-3" />
                Email Verified
              </span>
            )}
            {member.mustChangePassword && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                <AlertCircle className="h-3 w-3" />
                Password Change Required
              </span>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [viewMember, setViewMember] = useState<StaffMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] =
    useState<StaffMember | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // ── Fetch staff ──────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const response = await fetch(`/api/staff?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setStaff(data.staff ?? []);
      } else {
        toast.error("Failed to load staff");
      }
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchStaff, 300);
    return () => clearTimeout(timer);
  }, [fetchStaff]);

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = async (id: string, makeActive: boolean) => {
    if (!makeActive) {
      const member = staff.find((s) => s.id === id);
      if (member) {
        setConfirmDeactivate(member);
        return;
      }
    }
    await doToggle(id, makeActive);
  };

  const doToggle = async (id: string, makeActive: boolean) => {
    setIsUpdating(id);
    try {
      const response = await fetch(
        makeActive ? `/api/staff/${id}` : `/api/staff/${id}`,
        {
          method: makeActive ? "PUT" : "DELETE",
          headers: { "Content-Type": "application/json" },
          ...(makeActive && { body: JSON.stringify({ isActive: true }) }),
        },
      );

      if (response.ok) {
        toast.success(
          makeActive
            ? "Staff account reactivated"
            : "Staff account deactivated",
        );
        await fetchStaff();
      } else {
        const data = await response.json();
        toast.error(data.error ?? "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(null);
      setConfirmDeactivate(null);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const activeCount = staff.filter((s) => s.isActive).length;
  const inactiveCount = staff.filter((s) => !s.isActive).length;

  const roleCounts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r.value] = staff.filter((s) => s.role === r.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage system users and staff accounts for Muslim Specialist Hospital, Zaria"
        action={
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      {/* ── Summary Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Staff</p>
          </CardContent>
        </Card>

        {/* Active */}
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Active</p>
          </CardContent>
        </Card>

        {/* Per role */}
        {ROLES.map(({ value, label, icon: RoleIcon }) => (
          <Card
            key={value}
            className="col-span-1 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setRoleFilter(roleFilter === value ? "ALL" : value)}
          >
            <CardContent className="p-4 text-center">
              <RoleIcon
                className={cn(
                  "h-4 w-4 mx-auto mb-1",
                  roleFilter === value ? "text-blue-600" : "text-slate-400",
                )}
              />
              <p className="text-xl font-bold text-slate-800">
                {roleCounts[value] ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{label}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {ALL_ROLES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-xl text-xs",
              roleFilter === "ALL" && !search
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "",
            )}
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
            }}
          >
            All ({staff.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs text-emerald-600 border-emerald-200"
          >
            Active ({activeCount})
          </Button>
          {inactiveCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs text-slate-500"
            >
              Inactive ({inactiveCount})
            </Button>
          )}
        </div>
      </div>

      {/* ── Staff Grid ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-5 bg-slate-100 rounded-lg w-24 mt-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          illustration="patients"
          title={
            search || roleFilter !== "ALL"
              ? "No staff match your filters"
              : "No staff accounts yet"
          }
          description={
            search || roleFilter !== "ALL"
              ? "Try clearing your search or adjusting the role filter."
              : "Create the first staff account to get started."
          }
          actionLabel={
            search || roleFilter !== "ALL"
              ? undefined
              : "Add First Staff Member"
          }
          onAction={
            search || roleFilter !== "ALL"
              ? undefined
              : () => setShowCreate(true)
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onToggleActive={handleToggleActive}
              onView={setViewMember}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <CreateStaffDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchStaff}
      />

      <ViewStaffDialog
        member={viewMember}
        onClose={() => setViewMember(null)}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Deactivate Staff Account"
        description={
          confirmDeactivate?.staffProfile
            ? `Are you sure you want to deactivate ${confirmDeactivate.staffProfile.firstName} ${confirmDeactivate.staffProfile.lastName}'s account? They will no longer be able to log in.`
            : "Are you sure you want to deactivate this account?"
        }
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeactivate) {
            doToggle(confirmDeactivate.id, false);
          }
        }}
      />
    </div>
  );
}
