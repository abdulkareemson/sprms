// src/components/billing/InvoiceForm.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  User,
  Calendar,
  FileText,
  Calculator,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  createInvoiceSchema,
  type CreateInvoiceInput,
} from "@/schemas/invoice.schema";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ControllerRenderProps } from "react-hook-form";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientOption {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

interface AppointmentOption {
  id: string;
  scheduledAt: string;
  type: string;
  doctor: {
    staffProfile: {
      firstName: string;
      lastName: string;
    } | null;
  };
}

// ─── Appointment type labels ──────────────────────────────────────────────────

const appointmentTypeLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

// ─── Quick-add service presets ────────────────────────────────────────────────

const SERVICE_PRESETS = [
  { description: "Consultation Fee", unitPrice: 5000 },
  { description: "Registration Fee", unitPrice: 2000 },
  { description: "Lab Test - Full Blood Count", unitPrice: 3500 },
  { description: "X-Ray", unitPrice: 8000 },
  { description: "Ultrasound Scan", unitPrice: 15000 },
  { description: "Nursing Care", unitPrice: 2500 },
  { description: "Medication Administration", unitPrice: 1500 },
  { description: "Wound Dressing", unitPrice: 3000 },
];

// ─── Single line item row ─────────────────────────────────────────────────────

function LineItemRow({
  index,
  onRemove,
  canRemove,
  form,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  form: ReturnType<typeof useForm<CreateInvoiceInput>>;
}) {
  // Watch quantity + unitPrice → auto-compute amount
  const quantity = form.watch(`items.${index}.quantity`);
  const unitPrice = form.watch(`items.${index}.unitPrice`);

  useEffect(() => {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const total = parseFloat((qty * price).toFixed(2));
    form.setValue(`items.${index}.amount`, total, { shouldValidate: false });
  }, [quantity, unitPrice, index, form]);

  return (
    <div className="group relative grid grid-cols-12 gap-2 items-start p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors duration-150">
      {/* Description — 5 cols */}
      <div className="col-span-12 sm:col-span-5">
        <FormField
          control={form.control}
          name={`items.${index}.description`}
          render={({
            field,
          }: {
            field: ControllerRenderProps<
              CreateInvoiceInput,
              `items.${number}.description`
            >;
          }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground sr-only sm:not-sr-only">
                Description
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Service description"
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Quantity — 2 cols */}
      <div className="col-span-4 sm:col-span-2">
        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({
            field,
          }: {
            field: ControllerRenderProps<
              CreateInvoiceInput,
              `items.${number}.quantity`
            >;
          }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">
                Qty
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={1}
                  placeholder="1"
                  className="h-9 text-sm"
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value, 10) || 1)
                  }
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Unit Price — 3 cols */}
      <div className="col-span-4 sm:col-span-3">
        <FormField
          control={form.control}
          name={`items.${index}.unitPrice`}
          render={({
            field,
          }: {
            field: ControllerRenderProps<
              CreateInvoiceInput,
              `items.${number}.unitPrice`
            >;
          }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">
                Unit Price (₦)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  className="h-9 text-sm"
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Amount — 2 cols (read-only) */}
      <div className="col-span-3 sm:col-span-2">
        <FormField
          control={form.control}
          name={`items.${index}.amount`}
          render={({
            field,
          }: {
            field: ControllerRenderProps<
              CreateInvoiceInput,
              `items.${number}.amount`
            >;
          }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">
                Amount (₦)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  readOnly
                  tabIndex={-1}
                  className="h-9 text-sm bg-muted/50 font-medium cursor-default"
                  value={
                    field.value
                      ? field.value.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })
                      : "0.00"
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-sm hover:scale-110"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceForm() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null,
  );
  const [patientOpen, setPatientOpen] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const [presetOpen, setPresetOpen] = useState(false);

  const debouncedSearch = useDebounce(patientSearch, 350);

  // ── Form setup ─────────────────────────────────────────────────────────────
  const form = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      patientId: "",
      appointmentId: null,
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // ── Watch items for running total ──────────────────────────────────────────
  const watchedItems = form.watch("items");
  const grandTotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  // ── Search patients ────────────────────────────────────────────────────────
  const searchPatients = useCallback(async (query: string) => {
    setIsLoadingPatients(true);
    try {
      const params = new URLSearchParams({ limit: "8" });
      if (query) params.set("search", query);

      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      setPatients(data.patients ?? []);
    } catch {
      setPatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (patientOpen) {
      searchPatients(debouncedSearch);
    }
  }, [debouncedSearch, patientOpen, searchPatients]);

  // ── Fetch appointments for selected patient ────────────────────────────────
  const fetchPatientAppointments = useCallback(async (patientId: string) => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch(
        `/api/appointments?patientId=${patientId}&status=COMPLETED&limit=20`,
      );
      if (!res.ok) throw new Error();

      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  // When patient changes, fetch their appointments
  const handleSelectPatient = (patient: PatientOption) => {
    setSelectedPatient(patient);
    form.setValue("patientId", patient.id, { shouldValidate: true });
    form.setValue("appointmentId", null);
    setPatientOpen(false);
    fetchPatientAppointments(patient.id);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    form.setValue("patientId", "");
    form.setValue("appointmentId", null);
    setAppointments([]);
  };

  // ── Add preset item ────────────────────────────────────────────────────────
  const addPreset = (preset: (typeof SERVICE_PRESETS)[number]) => {
    append({
      description: preset.description,
      quantity: 1,
      unitPrice: preset.unitPrice,
      amount: preset.unitPrice,
    });
    setPresetOpen(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CreateInvoiceInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create invoice");
      }

      toast.success(
        `Invoice ${json.invoice.invoiceNumber} created successfully`,
      );
      router.push(`/billing/${json.invoice.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Patient Selection */}
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Patient
                </CardTitle>
                <CardDescription className="text-xs">
                  Search and select the patient for this invoice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Patient combobox */}
                <FormField
                  control={form.control}
                  name="patientId"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Select Patient{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div>
                          {selectedPatient ? (
                            /* Selected patient chip */
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {selectedPatient.firstName[0]}
                                  {selectedPatient.lastName[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground">
                                  {selectedPatient.firstName}{" "}
                                  {selectedPatient.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedPatient.patientNumber}
                                  {selectedPatient.phone &&
                                    ` • ${selectedPatient.phone}`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={handleClearPatient}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Popover
                              open={patientOpen}
                              onOpenChange={setPatientOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-10 text-sm font-normal"
                                >
                                  <span className="text-muted-foreground flex items-center gap-2">
                                    <Search className="h-4 w-4" />
                                    Search patient by name or ID...
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[400px] p-0"
                                align="start"
                              >
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Type name or patient number..."
                                    value={patientSearch}
                                    onValueChange={setPatientSearch}
                                  />
                                  <CommandList>
                                    {isLoadingPatients ? (
                                      <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      </div>
                                    ) : patients.length === 0 ? (
                                      <CommandEmpty>
                                        No patients found
                                      </CommandEmpty>
                                    ) : (
                                      <CommandGroup heading="Patients">
                                        {patients.map((patient) => (
                                          <CommandItem
                                            key={patient.id}
                                            value={patient.id}
                                            onSelect={() =>
                                              handleSelectPatient(patient)
                                            }
                                            className="cursor-pointer py-2.5"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                                  {patient.firstName[0]}
                                                  {patient.lastName[0]}
                                                </span>
                                              </div>
                                              <div>
                                                <p className="font-medium text-sm">
                                                  {patient.firstName}{" "}
                                                  {patient.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {patient.patientNumber}
                                                  {patient.phone &&
                                                    ` • ${patient.phone}`}
                                                </p>
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Appointment link */}
                {selectedPatient && (
                  <FormField
                    control={form.control}
                    name="appointmentId"
                    render={({
                      field,
                    }: {
                      field: ControllerRenderProps<
                        CreateInvoiceInput,
                        "appointmentId"
                      >;
                    }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Link to Appointment{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </FormLabel>
                        <Select
                          value={field.value ?? "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? null : v)
                          }
                          disabled={isLoadingAppointments}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm">
                              {isLoadingAppointments ? (
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading appointments...
                                </span>
                              ) : (
                                <SelectValue placeholder="No appointment linked" />
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              No appointment linked
                            </SelectItem>
                            {appointments.map((apt) => (
                              <SelectItem key={apt.id} value={apt.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {appointmentTypeLabels[apt.type] ??
                                      apt.type}
                                    {" — "}
                                    {format(
                                      new Date(apt.scheduledAt),
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                  {apt.doctor?.staffProfile && (
                                    <span className="text-xs text-muted-foreground">
                                      Dr. {apt.doctor.staffProfile.firstName}{" "}
                                      {apt.doctor.staffProfile.lastName}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {appointments.length === 0 &&
                          !isLoadingAppointments && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              No completed appointments found for this patient
                            </p>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                        <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Invoice Items
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Add services, procedures, and medications
                    </CardDescription>
                  </div>

                  {/* Preset picker */}
                  <Popover open={presetOpen} onOpenChange={setPresetOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                      >
                        <Search className="h-3 w-3" />
                        Quick Add
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-1" align="end">
                      <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                        Common Services
                      </p>
                      {SERVICE_PRESETS.map((preset) => (
                        <button
                          key={preset.description}
                          type="button"
                          onClick={() => addPreset(preset)}
                          className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted text-left transition-colors"
                        >
                          <span className="text-sm text-foreground">
                            {preset.description}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            ₦{preset.unitPrice.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Column headers — desktop only */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3">
                  <span className="col-span-5 text-xs font-medium text-muted-foreground">
                    Description
                  </span>
                  <span className="col-span-2 text-xs font-medium text-muted-foreground">
                    Qty
                  </span>
                  <span className="col-span-3 text-xs font-medium text-muted-foreground">
                    Unit Price
                  </span>
                  <span className="col-span-2 text-xs font-medium text-muted-foreground">
                    Amount
                  </span>
                </div>

                {/* Line item rows */}
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <LineItemRow
                      key={field.id}
                      index={index}
                      form={form}
                      canRemove={fields.length > 1}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>

                {/* Add row button */}
                {fields.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    onClick={() =>
                      append({
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        amount: 0,
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Line Item
                  </Button>
                )}

                {/* Totals section */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex flex-col items-end gap-1 pr-3">
                    <div className="flex items-center gap-8 text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground w-32 text-right">
                        ₦
                        {grandTotal.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <Separator className="w-48 my-1" />

                    <div className="flex items-center gap-8">
                      <span className="text-base font-bold text-foreground">
                        Total
                      </span>
                      <span className="text-xl font-bold text-foreground w-32 text-right">
                        ₦
                        {grandTotal.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Additional Notes
                  <span className="text-muted-foreground font-normal text-xs ml-2">
                    (optional)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({
                    field,
                  }: {
                    field: ControllerRenderProps<CreateInvoiceInput, "notes">;
                  }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Any additional notes about this invoice..."
                          className="resize-none text-sm min-h-[80px]"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (1/3) — Summary ──────────────────────────────── */}
          <div className="space-y-4">
            {/* Invoice Summary */}
            <Card className="border border-border/50 shadow-sm sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Patient */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bill To
                  </p>
                  {selectedPatient ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPatient.patientNumber}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No patient selected
                    </p>
                  )}
                </div>

                <Separator />

                {/* Items summary */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Items ({fields.length})
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {watchedItems.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between text-xs py-0.5",
                          !item.description && "opacity-40",
                        )}
                      >
                        <span className="text-muted-foreground truncate max-w-[130px]">
                          {item.description || `Item ${i + 1}`}
                          {item.quantity > 1 && (
                            <span className="ml-1 text-[10px]">
                              x{item.quantity}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-foreground flex-shrink-0 ml-2">
                          ₦
                          {(item.amount || 0).toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Grand total */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ₦
                    {grandTotal.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-2 text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                  >
                    Status: Pending
                  </Badge>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Invoice date: {format(new Date(), "MMMM d, yyyy")}
                  </span>
                </div>

                <Separator />

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    className="w-full h-10 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                    disabled={
                      isSubmitting || !selectedPatient || grandTotal === 0
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Invoice...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Invoice
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 text-sm"
                    onClick={() => router.push("/billing")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Validation hints */}
                {!selectedPatient && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Select a patient to create the invoice
                  </p>
                )}
                {grandTotal === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Add at least one item with a price
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
