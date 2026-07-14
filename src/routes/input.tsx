import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { FileSpreadsheet, FileDown, Loader2, PlusCircle, Upload } from "lucide-react";
import { useCurrentUser } from "@/lib/auth-store";
import type { ActivityType, FrequencyUnit, Instrument, PmTaskRecord } from "@/lib/types";
import {
  applyMapping, buildMapping, detectKind, findHeaderRow, isNonRecordSheet,
  type ColumnMapping, type RecordKind, type FieldKey,
} from "@/lib/smart-import";
import { downloadInstrumentTemplate, downloadPmTaskTemplate } from "@/lib/templates";

export const Route = createFileRoute("/input")({
  head: () => ({ meta: [{ title: "Input Data — Pertamina Reliability Instrumentation" }] }),
  component: InputPage,
});

const ALL_FIELD_KEYS: FieldKey[] = [
  "tagNumber","lokasi","area","equipmentType","pmFrequency",
  "period","planDate","actualDate","pic","activity","activityType",
  "kendala","status","perbaikanLanjutan","catatan",
];

function InputPage() {
  return (
    <AppShell>
      <PageHeader title="Input Data" description="Add instruments and PM/PdM tasks manually, or import from an existing spreadsheet." />
      <Tabs defaultValue="instrument" className="w-full">
        <TabsList className="glass-surface border border-border/60">
          <TabsTrigger value="instrument">Instrument</TabsTrigger>
          <TabsTrigger value="task">PM Task</TabsTrigger>
          <TabsTrigger value="import">Smart Import</TabsTrigger>
        </TabsList>
        <TabsContent value="instrument"><InstrumentForm /></TabsContent>
        <TabsContent value="task"><TaskForm /></TabsContent>
        <TabsContent value="import"><SmartImport /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function InstrumentForm() {
  const { settings, addInstrument } = useAppStore();
  const user = useCurrentUser();
  const [tagNumber, setTagNumber] = useState("");
  const [area, setArea] = useState(settings.areas[0] ?? "");
  const [equipmentType, setEquipmentType] = useState(settings.equipmentTypes[0] ?? "");
  const [lokasi, setLokasi] = useState("");
  const [freqCount, setFreqCount] = useState(1);
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>("tahun");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tagNumber || !area || !equipmentType) { toast.error("Tag Number, Area, Equipment are required"); return; }
    addInstrument({
      id: crypto.randomUUID(),
      tagNumber, area, equipmentType,
      lokasi: lokasi || undefined,
      pmFrequency: { count: freqCount, unit: freqUnit },
      createdBy: user?.name ?? "Unknown",
      createdAt: new Date().toISOString(),
    });
    toast.success(`${tagNumber} added`);
    setTagNumber(""); setLokasi("");
  }

  return (
    <Card className="glass-panel border-0 max-w-2xl mt-4">
      <CardHeader><CardTitle className="text-base">Add Instrument</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Tag Number *</Label>
            <Input placeholder="e.g. 12-JS-007" value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Area *</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{settings.areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipment *</Label>
            <Select value={equipmentType} onValueChange={setEquipmentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{settings.equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Lokasi</Label>
            <Input placeholder="Descriptive location (optional)" value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
          </div>
          <div>
            <Label>PM Frequency</Label>
            <Input type="number" min={1} value={freqCount} onChange={(e) => setFreqCount(Math.max(1, +e.target.value))} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={freqUnit} onValueChange={(v) => setFreqUnit(v as FrequencyUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minggu">minggu</SelectItem>
                <SelectItem value="bulan">bulan</SelectItem>
                <SelectItem value="tahun">tahun</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto"><PlusCircle className="h-4 w-4 mr-1.5" />Add Instrument</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TaskForm() {
  const { instruments, addTask } = useAppStore();
  const user = useCurrentUser();
  const [instrumentId, setInstrumentId] = useState<string>("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [actualDate, setActualDate] = useState("");
  const [pic, setPic] = useState(user?.name ?? "");
  const [period, setPeriod] = useState("");
  const [activity, setActivity] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("PM");
  const [kendala, setKendala] = useState("");
  const [perbaikanLanjutan, setPerbaikanLanjutan] = useState("");
  const [catatan, setCatatan] = useState("");

  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.id === instrumentId), [instruments, instrumentId],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstrument) { toast.error("Select an instrument"); return; }
    if (!planDate) { toast.error("Plan Date is required"); return; }
    addTask({
      id: crypto.randomUUID(),
      instrumentId: selectedInstrument.id,
      tagNumber: selectedInstrument.tagNumber,
      area: selectedInstrument.area,
      equipmentType: selectedInstrument.equipmentType,
      period: period || undefined,
      planDate, actualDate: actualDate || undefined,
      pic, activity, activityType,
      kendala: kendala || undefined,
      status: "Scheduled",
      perbaikanLanjutan: perbaikanLanjutan || undefined,
      catatan: catatan || undefined,
      createdBy: user?.name ?? "Unknown",
      createdAt: new Date().toISOString(),
    });
    toast.success("Task logged");
    setActivity(""); setKendala(""); setPerbaikanLanjutan(""); setCatatan(""); setActualDate("");
  }

  if (instruments.length === 0) {
    return (
      <Card className="glass-panel border-0 mt-4">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Add at least one instrument first, then log tasks against it.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-0 max-w-3xl mt-4">
      <CardHeader><CardTitle className="text-base">Log PM Task</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Instrument *</Label>
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger><SelectValue placeholder="Choose instrument" /></SelectTrigger>
              <SelectContent>
                {instruments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.tagNumber} — {i.equipmentType} · {i.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Plan Date *</Label>
            <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} required /></div>
          <div><Label>Actual Date</Label>
            <Input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} /></div>
          <div><Label>Period (optional)</Label>
            <Input placeholder="W1..W4" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div><Label>PIC *</Label>
            <Input value={pic} onChange={(e) => setPic(e.target.value)} required /></div>
          <div>
            <Label>Activity Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PM">PM</SelectItem>
                <SelectItem value="PdM">PdM</SelectItem>
                <SelectItem value="Perbaikan">Perbaikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
          <div className="sm:col-span-2"><Label>Activity</Label>
            <Textarea rows={2} value={activity} onChange={(e) => setActivity(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Kendala</Label>
            <Textarea rows={2} value={kendala} onChange={(e) => setKendala(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Perbaikan Lanjutan</Label>
            <Textarea rows={2} value={perbaikanLanjutan} onChange={(e) => setPerbaikanLanjutan(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Catatan</Label>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Button type="submit"><PlusCircle className="h-4 w-4 mr-1.5" />Log Task</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface SheetPreview {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: ColumnMapping[];
  kind: RecordKind;
  skippedReason: string | null;
}

function SmartImport() {
  const { settings, instruments, bulkAddInstruments, bulkAddTasks } = useAppStore();
  const user = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);

  async function onFile(file: File) {
    setBusy(true); setSheets([]);
    try {
      const name = file.name.toLowerCase();
      let parsed: SheetPreview[] = [];
      if (name.endsWith(".csv")) parsed = await parseCsv(file);
      else if (name.endsWith(".xlsx") || name.endsWith(".xls")) parsed = await parseXlsx(file);
      else { toast.error("Unsupported file type — please use CSV or Excel"); return; }
      setSheets(parsed);
      const importable = parsed.filter((s) => !s.skippedReason).length;
      const skipped = parsed.length - importable;
      toast.success(`Detected ${importable} sheet${importable === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped` : ""}`);
    } catch (e) {
      console.error(e); toast.error("Failed to parse file");
    } finally { setBusy(false); }
  }

  async function parseCsv(file: File): Promise<SheetPreview[]> {
    const text = await file.text();
    const rowsRaw = Papa.parse<string[]>(text, { skipEmptyLines: true }).data as string[][];
    return [sheetFromRows("CSV", rowsRaw)];
  }

  async function parseXlsx(file: File): Promise<SheetPreview[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    return wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const rowsRaw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
      return sheetFromRows(name, rowsRaw);
    });
  }

  function sheetFromRows(sheetName: string, rowsRaw: unknown[][]): SheetPreview {
    const found = findHeaderRow(rowsRaw);
    if (!found) {
      return { sheetName, headers: [], rows: [], mapping: [], kind: "instrument",
               skippedReason: isNonRecordSheet(sheetName, null) ?? `Sheet "${sheetName}" — no header row detected.` };
    }
    const headers = found.headers;
    const bodyRows = rowsRaw.slice(found.index + 1)
      .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
      .map((r) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      });
    const mapping = buildMapping(headers);
    const kind = detectKind(mapping);
    const skippedReason = isNonRecordSheet(sheetName, mapping);
    return { sheetName, headers, rows: bodyRows, mapping, kind, skippedReason };
  }

  function updateMapping(sheetIdx: number, colIdx: number, field: FieldKey | null) {
    setSheets((prev) => prev.map((s, i) => i === sheetIdx
      ? { ...s, mapping: s.mapping.map((m, j) => j === colIdx ? { ...m, field } : m) }
      : s));
  }

  function toggleKind(sheetIdx: number, kind: RecordKind) {
    setSheets((prev) => prev.map((s, i) => i === sheetIdx ? { ...s, kind } : s));
  }

  function commit() {
    const now = new Date().toISOString();
    const author = user?.name ?? "Unknown";
    let addedI = 0, addedT = 0, skipped = 0;
    const newInstruments: Instrument[] = [];
    const newTasks: PmTaskRecord[] = [];
    const knownByTag = new Map(instruments.map((i) => [i.tagNumber, i]));

    for (const s of sheets) {
      if (s.skippedReason) continue;
      const parsed = applyMapping(s.rows, s.mapping, s.kind);
      for (const row of parsed) {
        if (!row.valid) { skipped++; continue; }
        if (row.kind === "instrument") {
          const d = row.data as Instrument;
          if (knownByTag.has(d.tagNumber)) { skipped++; continue; }
          const ins: Instrument = {
            id: crypto.randomUUID(),
            tagNumber: d.tagNumber, area: d.area, equipmentType: d.equipmentType,
            lokasi: d.lokasi, pmFrequency: d.pmFrequency,
            createdBy: author, createdAt: now,
          };
          knownByTag.set(ins.tagNumber, ins);
          newInstruments.push(ins); addedI++;
        } else {
          const d = row.data as PmTaskRecord;
          let inst = knownByTag.get(d.tagNumber);
          if (!inst) {
            // Auto-create instrument stub so tasks aren't orphaned.
            inst = {
              id: crypto.randomUUID(),
              tagNumber: d.tagNumber, area: d.area ?? "", equipmentType: d.equipmentType ?? "Unknown",
              createdBy: author, createdAt: now,
            };
            knownByTag.set(inst.tagNumber, inst);
            newInstruments.push(inst); addedI++;
          }
          newTasks.push({
            id: crypto.randomUUID(),
            instrumentId: inst.id,
            tagNumber: inst.tagNumber,
            area: d.area || inst.area,
            equipmentType: d.equipmentType || inst.equipmentType,
            period: d.period,
            planDate: d.planDate!,
            actualDate: d.actualDate,
            pic: d.pic ?? "",
            activity: d.activity ?? "",
            activityType: d.activityType ?? "PM",
            kendala: d.kendala,
            status: d.status ?? "Scheduled",
            perbaikanLanjutan: d.perbaikanLanjutan,
            catatan: d.catatan,
            createdBy: author,
            createdAt: now,
          });
          addedT++;
        }
      }
    }
    if (newInstruments.length) bulkAddInstruments(newInstruments);
    if (newTasks.length) bulkAddTasks(newTasks);
    toast.success(`Imported ${addedI} instrument(s), ${addedT} task(s)${skipped ? ` · ${skipped} skipped` : ""}`);
    setSheets([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  const importableCount = sheets.filter((s) => !s.skippedReason).length;

  return (
    <div className="mt-4 space-y-4">
      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-base">Smart Import</CardTitle>
          <p className="text-xs text-muted-foreground">
            CSV or Excel — mirrors the team's existing PM/PdM tracking format.
            The header row is auto-detected even when it's several rows down.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Choose file
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <div className="flex-1" />
            <Button variant="outline" onClick={downloadInstrumentTemplate}>
              <FileDown className="h-4 w-4 mr-1.5" />Download Instrument Template
            </Button>
            <Button variant="outline" onClick={downloadPmTaskTemplate}>
              <FileDown className="h-4 w-4 mr-1.5" />Download PM Task Template
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Templates mirror the team's existing PM/PdM tracking column layout with example rows you can safely delete before importing.
          </p>
        </CardContent>
      </Card>

      {sheets.map((s, i) => (
        <Card key={i} className="glass-panel border-0">
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Sheet: {s.sheetName}</CardTitle>
              {!s.skippedReason && (
                <Select value={s.kind} onValueChange={(v) => toggleKind(i, v as RecordKind)}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instrument">Instrument rows</SelectItem>
                    <SelectItem value="task">PM Task rows</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{s.rows.length} data rows</span>
            </div>
          </CardHeader>
          <CardContent>
            {s.skippedReason ? (
              <div className="text-xs text-muted-foreground italic">{s.skippedReason}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {s.mapping.map((m, j) => (
                  <div key={j} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-xs">
                    <div className="truncate text-muted-foreground" title={m.header}>{m.header || <em>(blank)</em>}</div>
                    <Select value={m.field ?? "__ignore__"} onValueChange={(v) => updateMapping(i, j, v === "__ignore__" ? null : v as FieldKey)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Ignore</SelectItem>
                        {ALL_FIELD_KEYS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {importableCount > 0 && (
        <div className="flex justify-end">
          <Button onClick={commit} size="lg">
            Import {importableCount} sheet{importableCount === 1 ? "" : "s"}
          </Button>
        </div>
      )}

      {/* keep the settings reference so a lint-free future refactor sees it */}
      <div className="hidden">{settings.areas.length}</div>
    </div>
  );
}
