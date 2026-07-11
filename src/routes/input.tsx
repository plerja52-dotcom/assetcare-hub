import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import type {
  Criticality,
  FinalStatus,
  Instrument,
  MaintenanceRecord,
  MaintenanceType,
} from "@/lib/types";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileDown, ChevronLeft, ChevronRight, Save } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth/mammoth.browser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/input")({
  component: InputPage,
});

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUSES: FinalStatus[] = ["Online/Normal", "Calibration Due", "Maintenance Required", "Draft"];
const CRITICALITY: Criticality[] = ["High", "Medium", "Low", "SCE"];

function ManualForm() {
  const { instruments, settings, addInstrument, addMaintenance, addInstrumentType } = useAppStore();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"new" | "existing">("new");

  // Instrument fields
  const [tagNumber, setTagNumber] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("Medium");
  const [commissioningDate, setCommissioningDate] = useState("");

  const [existingId, setExistingId] = useState<string>("");

  // Maintenance fields
  const [addMaint, setAddMaint] = useState(true);
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [mtype, setMtype] = useState<MaintenanceType>("PM");
  const [activity, setActivity] = useState("");
  const [status, setStatus] = useState<FinalStatus>("Online/Normal");
  const [failureMode, setFailureMode] = useState("");
  const [repairHours, setRepairHours] = useState("");
  const [downtime, setDowntime] = useState("");
  const [calBefore, setCalBefore] = useState("");
  const [calAfter, setCalAfter] = useState("");
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");

  const dupeTag = useMemo(
    () => mode === "new" && tagNumber && instruments.some((i) => i.tagNumber.toLowerCase() === tagNumber.toLowerCase()),
    [tagNumber, instruments, mode],
  );

  const canStep1 = mode === "existing"
    ? !!existingId
    : !!(tagNumber && name && location && type && !dupeTag);

  const submit = () => {
    let insId = existingId;
    let insTag = "";
    if (mode === "new") {
      const newIns: Instrument = {
        id: uid(),
        tagNumber, name, location, type, criticality,
        commissioningDate: commissioningDate || undefined,
      };
      addInstrument(newIns);
      if (!settings.instrumentTypes.includes(type)) addInstrumentType(type);
      insId = newIns.id;
      insTag = newIns.tagNumber;
    } else {
      insTag = instruments.find((i) => i.id === existingId)?.tagNumber ?? "";
    }
    if (addMaint) {
      if (!activity || !technician) { toast.error("Activity and technician are required"); return; }
      addMaintenance({
        id: uid(),
        instrumentId: insId,
        tagNumber: insTag,
        dateTime: new Date(dateTime).toISOString(),
        type: mtype,
        activity,
        finalStatus: status,
        failureMode: failureMode || undefined,
        repairTimeHours: repairHours ? +repairHours : undefined,
        downtimeHours: downtime ? +downtime : undefined,
        calibrationBefore: calBefore ? +calBefore : undefined,
        calibrationAfter: calAfter ? +calAfter : undefined,
        technician,
        notes: notes || undefined,
      });
    }
    toast.success("Saved successfully");
    // reset
    setStep(1);
    setTagNumber(""); setName(""); setLocation(""); setType(""); setCommissioningDate("");
    setActivity(""); setFailureMode(""); setRepairHours(""); setDowntime("");
    setCalBefore(""); setCalAfter(""); setTechnician(""); setNotes("");
    setExistingId("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Step {step} of 2</CardTitle>
          <div className="flex gap-1">
            {[1, 2].map((n) => (
              <div key={n} className={cn("h-1.5 w-8 rounded-full", step >= n ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <>
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setMode("new")}
                className={cn("px-3 py-1 text-xs rounded-md font-medium", mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground")}
              >New Instrument</button>
              <button
                onClick={() => setMode("existing")}
                className={cn("px-3 py-1 text-xs rounded-md font-medium", mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground")}
              >Existing Instrument</button>
            </div>

            {mode === "new" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tag Number *</Label>
                  <Input value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} placeholder="e.g. PT-1024" />
                  {dupeTag && <p className="text-xs text-primary mt-1">Tag already exists</p>}
                </div>
                <div>
                  <Label>Instrument Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Location / Unit *</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. CDU" />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {settings.instrumentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Criticality *</Label>
                  <Select value={criticality} onValueChange={(v) => setCriticality(v as Criticality)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRITICALITY.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commissioning Date</Label>
                  <Input type="date" value={commissioningDate} onChange={(e) => setCommissioningDate(e.target.value)} />
                </div>
              </div>
            ) : (
              <div>
                <Label>Select existing instrument</Label>
                <Select value={existingId} onValueChange={setExistingId}>
                  <SelectTrigger><SelectValue placeholder="Choose an instrument" /></SelectTrigger>
                  <SelectContent>
                    {instruments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.tagNumber} — {i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2">
              <input id="addm" type="checkbox" checked={addMaint} onChange={(e) => setAddMaint(e.target.checked)} className="h-4 w-4 accent-primary" />
              <Label htmlFor="addm">Add a maintenance record now</Label>
            </div>
            {addMaint && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Date & Time *</Label>
                  <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={mtype} onValueChange={(v) => setMtype(v as MaintenanceType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PM">Preventive (PM)</SelectItem>
                      <SelectItem value="CM">Corrective (CM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Activity *</Label>
                  <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Calibration, Overhaul, Loop Test..." />
                </div>
                <div>
                  <Label>Final Status *</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as FinalStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {mtype === "CM" && (
                  <div className="md:col-span-2">
                    <Label>Failure Mode / Root Cause</Label>
                    <Input value={failureMode} onChange={(e) => setFailureMode(e.target.value)} placeholder="Calibration Drift, Sensor Failure..." />
                  </div>
                )}
                <div>
                  <Label>Repair Time (hours)</Label>
                  <Input type="number" step="0.1" value={repairHours} onChange={(e) => setRepairHours(e.target.value)} />
                </div>
                <div>
                  <Label>Downtime (hours)</Label>
                  <Input type="number" step="0.1" value={downtime} onChange={(e) => setDowntime(e.target.value)} />
                </div>
                <div>
                  <Label>Calibration Before (%)</Label>
                  <Input type="number" step="0.01" value={calBefore} onChange={(e) => setCalBefore(e.target.value)} />
                </div>
                <div>
                  <Label>Calibration After (%)</Label>
                  <Input type="number" step="0.01" value={calAfter} onChange={(e) => setCalAfter(e.target.value)} />
                </div>
                <div>
                  <Label>Technician *</Label>
                  <Input value={technician} onChange={(e) => setTechnician(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canStep1}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit}><Save className="h-4 w-4 mr-1" />Save</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// -------- Import mode --------

interface PreviewRow {
  data: Partial<Instrument> & { error?: string };
  valid: boolean;
}

function ImportForm() {
  const { instruments, settings, bulkAddInstruments, addInstrumentType } = useAppStore();
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const validate = (r: Partial<Instrument>): PreviewRow => {
    const errors: string[] = [];
    if (!r.tagNumber) errors.push("Tag required");
    if (!r.name) errors.push("Name required");
    if (!r.location) errors.push("Location required");
    if (!r.type) errors.push("Type required");
    if (r.criticality && !CRITICALITY.includes(r.criticality as Criticality)) errors.push("Invalid criticality");
    if (r.tagNumber && instruments.some((i) => i.tagNumber.toLowerCase() === r.tagNumber!.toLowerCase())) errors.push("Duplicate tag");
    return {
      data: { ...r, error: errors.join(", ") || undefined },
      valid: errors.length === 0,
    };
  };

  const parseRows = (raw: Record<string, any>[]) => {
    const norm = (r: Record<string, any>) => {
      const lower: Record<string, any> = {};
      Object.keys(r).forEach((k) => (lower[k.toLowerCase().trim()] = r[k]));
      return {
        tagNumber: String(lower["tag number"] ?? lower["tag"] ?? "").trim(),
        name: String(lower["name"] ?? lower["description"] ?? "").trim(),
        location: String(lower["location"] ?? lower["unit"] ?? "").trim(),
        type: String(lower["type"] ?? "").trim(),
        criticality: (String(lower["criticality"] ?? "Medium").trim() as Criticality),
        commissioningDate: lower["commissioning date"] ? String(lower["commissioning date"]).trim() : undefined,
      } as Partial<Instrument>;
    };
    setRows(raw.map(norm).filter((r) => Object.values(r).some(Boolean)).map(validate));
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => parseRows(res.data as Record<string, any>[]),
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        parseRows(XLSX.utils.sheet_to_json<Record<string, any>>(sheet));
      } else if (ext === "docx") {
        const buf = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        if (!table) { toast.error("No table found in .docx"); return; }
        const rowsEls = Array.from(table.querySelectorAll("tr"));
        const headers = Array.from(rowsEls[0].querySelectorAll("th,td")).map((c) => c.textContent?.trim() ?? "");
        const data = rowsEls.slice(1).map((tr) => {
          const cells = Array.from(tr.querySelectorAll("td,th")).map((c) => c.textContent?.trim() ?? "");
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
          return obj;
        });
        parseRows(data);
      } else {
        toast.error("Unsupported file type");
      }
    } catch (e) {
      toast.error(`Parse failed: ${(e as Error).message}`);
    }
  };

  const downloadTemplate = () => {
    const csv = "Tag Number,Name,Location,Type,Criticality,Commissioning Date\nPT-2001,Sample Transmitter,CDU,Pressure Transmitter,High,2022-05-01\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "instrument-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importNow = () => {
    const valid = rows.filter((r) => r.valid).map((r) => ({
      id: uid(),
      tagNumber: r.data.tagNumber!,
      name: r.data.name!,
      location: r.data.location!,
      type: r.data.type!,
      criticality: (r.data.criticality ?? "Medium") as Criticality,
      commissioningDate: r.data.commissioningDate,
    }));
    valid.forEach((v) => {
      if (!settings.instrumentTypes.includes(v.type)) addInstrumentType(v.type);
    });
    bulkAddInstruments(valid);
    toast.success(`Imported ${valid.length} instrument${valid.length !== 1 ? "s" : ""}`);
    setRows([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Import from File</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <FileDown className="h-4 w-4 mr-1" />Download Template (CSV)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drag & drop a .csv, .xlsx, or .docx file</p>
          <p className="text-xs text-muted-foreground mt-1">or</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>Browse Files</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {rows.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between mb-2">
              <span className="text-sm">
                Preview: {rows.filter((r) => r.valid).length} valid, {rows.filter((r) => !r.valid).length} with errors
              </span>
              <Button onClick={importNow} disabled={rows.every((r) => !r.valid)}>
                Import Now
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={!r.valid ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">{r.data.tagNumber}</TableCell>
                      <TableCell>{r.data.name}</TableCell>
                      <TableCell>{r.data.location}</TableCell>
                      <TableCell>{r.data.type}</TableCell>
                      <TableCell>{r.data.criticality}</TableCell>
                      <TableCell className="text-xs">
                        {r.valid ? <span className="text-success">✓ Valid</span> : <span className="text-primary">{r.data.error}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InputPage() {
  return (
    <AppShell>
      <PageHeader title="Input Data" description="Add new instruments and maintenance records manually or by uploading a file." />
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="import">Import from File</TabsTrigger>
        </TabsList>
        <TabsContent value="manual"><ManualForm /></TabsContent>
        <TabsContent value="import"><ImportForm /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
