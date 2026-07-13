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
import { Upload, FileDown, ChevronLeft, ChevronRight, Save, Sparkles } from "lucide-react";
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
import {
  ALL_FIELDS,
  applyMapping,
  buildMapping,
  detectKind,
  type ColumnMapping,
  type FieldKey,
  type ParsedRow,
  type RecordKind,
} from "@/lib/smart-import";

export const Route = createFileRoute("/input")({
  head: () => ({ meta: [{ title: "Input Data — Pertamina Reliability" }] }),
  component: InputPage,
});

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUSES: FinalStatus[] = ["Online/Normal", "Calibration Due", "Maintenance Required", "Draft"];
const CRITICALITY: Criticality[] = ["High", "Medium", "Low", "SCE"];

function ManualForm() {
  const { instruments, settings, addInstrument, addMaintenance, addInstrumentType } = useAppStore();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"new" | "existing">("new");

  const [tagNumber, setTagNumber] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("Medium");
  const [commissioningDate, setCommissioningDate] = useState("");

  const [existingId, setExistingId] = useState<string>("");

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
    setStep(1);
    setTagNumber(""); setName(""); setLocation(""); setType(""); setCommissioningDate("");
    setActivity(""); setFailureMode(""); setRepairHours(""); setDowntime("");
    setCalBefore(""); setCalAfter(""); setTechnician(""); setNotes("");
    setExistingId("");
  };

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Step {step} of 2</CardTitle>
          <div className="flex gap-1">
            {[1, 2].map((n) => (
              <div key={n} className={cn("h-1.5 w-8 rounded-full transition-all", step >= n ? "bg-primary" : "bg-muted")} />
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
                className={cn("px-3 py-1 text-xs rounded-md font-medium transition-all", mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground")}
              >New Instrument</button>
              <button
                onClick={() => setMode("existing")}
                className={cn("px-3 py-1 text-xs rounded-md font-medium transition-all", mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground")}
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

// -------- Smart Import mode --------

function ImportForm() {
  const { instruments, settings, bulkAddInstruments, bulkAddMaintenance, addInstrumentType } =
    useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [kind, setKind] = useState<RecordKind>("instrument");
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);

  const recompute = (nextMapping: ColumnMapping[], nextKind: RecordKind) => {
    setPreviewRows(applyMapping(rawRows, nextMapping, nextKind));
  };

  const loadFromParsed = (rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      toast.error("No rows found in file");
      return;
    }
    const headers = Object.keys(rows[0] ?? {});
    const m = buildMapping(headers);
    const k = detectKind(m);
    setRawRows(rows);
    setMapping(m);
    setKind(k);
    setPreviewRows(applyMapping(rows, m, k));
    const hit = m.filter((x) => x.field).length;
    toast.success(
      `Detected ${k === "maintenance" ? "maintenance records" : "instruments"} — matched ${hit}/${m.length} columns`,
    );
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => loadFromParsed(res.data as Record<string, unknown>[]),
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        // Prefer the first sheet with data
        for (const name of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]);
          if (rows.length) return loadFromParsed(rows);
        }
        toast.error("No data found in workbook");
      } else if (ext === "docx") {
        const buf = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        if (!table) { toast.error("No table found in .docx"); return; }
        const rowsEls = Array.from(table.querySelectorAll("tr"));
        const headers = Array.from(rowsEls[0].querySelectorAll("th,td")).map(
          (c) => c.textContent?.trim() ?? "",
        );
        const data = rowsEls.slice(1).map((tr) => {
          const cells = Array.from(tr.querySelectorAll("td,th")).map(
            (c) => c.textContent?.trim() ?? "",
          );
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
          return obj;
        });
        loadFromParsed(data);
      } else {
        toast.error("Unsupported file type");
      }
    } catch (e) {
      toast.error(`Parse failed: ${(e as Error).message}`);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "Tag Number,Name,Location,Type,Criticality,Commissioning Date\nPT-2001,Sample Transmitter,CDU,Pressure Transmitter,High,2022-05-01\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "instrument-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const updateMapping = (idx: number, field: FieldKey | null) => {
    const next = mapping.map((m, i) => (i === idx ? { ...m, field } : m));
    setMapping(next);
    recompute(next, kind);
  };

  const changeKind = (k: RecordKind) => {
    setKind(k);
    recompute(mapping, k);
  };

  const importNow = () => {
    const valid = previewRows.filter((r) => r.valid);
    if (!valid.length) return;
    if (kind === "instrument") {
      const items: Instrument[] = valid.map((r) => {
        const d = r.data as Partial<Instrument>;
        return {
          id: uid(),
          tagNumber: d.tagNumber!,
          name: d.name!,
          location: d.location ?? "—",
          type: d.type ?? "Uncategorized",
          criticality: (d.criticality ?? "Medium") as Criticality,
          commissioningDate: d.commissioningDate,
        };
      });
      items.forEach((v) => {
        if (v.type && !settings.instrumentTypes.includes(v.type)) addInstrumentType(v.type);
      });
      bulkAddInstruments(items);
      toast.success(`Imported ${items.length} instrument${items.length !== 1 ? "s" : ""}`);
    } else {
      const byTag = new Map(instruments.map((i) => [i.tagNumber.toLowerCase(), i]));
      let matched = 0;
      const items: MaintenanceRecord[] = [];
      for (const r of valid) {
        const d = r.data as Partial<MaintenanceRecord>;
        const ins = byTag.get((d.tagNumber ?? "").toLowerCase());
        if (!ins) continue;
        matched++;
        items.push({
          id: uid(),
          instrumentId: ins.id,
          tagNumber: ins.tagNumber,
          dateTime: d.dateTime!,
          type: d.type!,
          activity: d.activity ?? "—",
          finalStatus: d.finalStatus ?? "Online/Normal",
          failureMode: d.failureMode,
          repairTimeHours: d.repairTimeHours,
          downtimeHours: d.downtimeHours,
          calibrationBefore: d.calibrationBefore,
          calibrationAfter: d.calibrationAfter,
          technician: d.technician ?? "—",
          notes: d.notes,
        });
      }
      bulkAddMaintenance(items);
      toast.success(
        `Imported ${items.length} maintenance record${items.length !== 1 ? "s" : ""}${
          matched < valid.length
            ? ` (${valid.length - matched} skipped — tag not in Instruments)`
            : ""
        }`,
      );
    }
    setRawRows([]);
    setMapping([]);
    setPreviewRows([]);
  };

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-info" />
              Smart Import
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Drop any CSV, XLSX, or DOCX. Column names are auto-matched and you can
              adjust them before importing.
            </p>
          </div>
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
            "border-2 border-dashed rounded-xl p-8 text-center transition-all",
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border",
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drag &amp; drop a .csv, .xlsx, or .docx file</p>
          <p className="text-xs text-muted-foreground mt-1">or</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fileRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {mapping.length > 0 && (
          <>
            {/* Mapping confirmation */}
            <div className="mt-6 rounded-lg border border-border/60 p-4 bg-muted/30">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="text-sm font-medium">Confirm column mapping</div>
                  <div className="text-xs text-muted-foreground">
                    Detected as{" "}
                    <span className="text-foreground font-medium">
                      {kind === "maintenance" ? "Maintenance records" : "Instrument master data"}
                    </span>
                    . Adjust below if wrong.
                  </div>
                </div>
                <Select value={kind} onValueChange={(v) => changeKind(v as RecordKind)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instrument">Instrument master data</SelectItem>
                    <SelectItem value="maintenance">Maintenance records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mapping.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="flex-1 truncate text-xs font-medium bg-background border rounded px-2 py-1.5"
                      title={m.header}
                    >
                      {m.header || <span className="text-muted-foreground italic">(blank)</span>}
                    </div>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Select
                      value={m.field ?? "__ignore__"}
                      onValueChange={(v) => updateMapping(i, v === "__ignore__" ? null : (v as FieldKey))}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Ignore</SelectItem>
                        {ALL_FIELDS.filter((f) => f.group === kind || f.key === "tagNumber" || f.key === "name").map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 flex items-center justify-between mb-2">
              <span className="text-sm">
                Preview: {previewRows.filter((r) => r.valid).length} valid,{" "}
                {previewRows.filter((r) => !r.valid).length} with errors
              </span>
              <Button onClick={importNow} disabled={previewRows.every((r) => !r.valid)}>
                Import {previewRows.filter((r) => r.valid).length} row
                {previewRows.filter((r) => r.valid).length !== 1 ? "s" : ""}
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    {kind === "instrument" ? (
                      <>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Criticality</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Technician</TableHead>
                      </>
                    )}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => {
                    const d = r.data as any;
                    return (
                      <TableRow key={i} className={!r.valid ? "bg-primary/5" : "hover:bg-muted/40"}>
                        <TableCell className="font-medium">{d.tagNumber ?? "—"}</TableCell>
                        {kind === "instrument" ? (
                          <>
                            <TableCell>{d.name ?? "—"}</TableCell>
                            <TableCell>{d.location ?? "—"}</TableCell>
                            <TableCell>{d.type ?? "—"}</TableCell>
                            <TableCell>{d.criticality ?? "—"}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-xs">
                              {d.dateTime ? new Date(d.dateTime).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>{d.type ?? "—"}</TableCell>
                            <TableCell className="max-w-40 truncate">{d.activity ?? "—"}</TableCell>
                            <TableCell>{d.technician ?? "—"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-xs">
                          {r.valid ? (
                            <span className="text-success">✓ Valid</span>
                          ) : (
                            <span className="text-primary">{r.errors.join(", ")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      <PageHeader
        title="Input Data"
        description="Add new instruments and maintenance records manually or by uploading a file."
      />
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="mb-4 glass-panel border border-border/60">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="import">Smart Import</TabsTrigger>
        </TabsList>
        <TabsContent value="manual"><ManualForm /></TabsContent>
        <TabsContent value="import"><ImportForm /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
