import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wrench,
  History,
  Activity,
  Bell,
  FilePlus2,
  Settings as SettingsIcon,
  Info,
  HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [{ title: "Help & Guide — Pertamina Reliability Instrumentation" }],
  }),
  component: HelpPage,
});

type Lang = "en" | "id";
const LANG_KEY = "rid-help-lang";

interface Section {
  id: string;
  icon: typeof LayoutDashboard;
  title: { en: string; id: string };
  body: { en: React.ReactNode; id: React.ReactNode };
}

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: { en: "Dashboard Overview", id: "Ringkasan Dashboard" },
    body: {
      en: (
        <>
          <p>
            One-glance summary of instrument reliability across Maintenance Area 2.
            Everything above is filterable by <strong>Unit</strong> and{" "}
            <strong>Criticality</strong>.
          </p>
          <p className="mt-2 font-medium">Cards &amp; charts:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Total Instruments</strong> — count matching your filter.</li>
            <li><strong>Availability</strong> — (operating hours − downtime hours) ÷ operating hours × 100.</li>
            <li><strong>MTBF</strong> — total operating days ÷ number of CM events.</li>
            <li><strong>MTTR</strong> — total repair hours ÷ number of CM events.</li>
            <li><strong>Overdue Calibrations</strong> — instruments past due date.</li>
            <li><strong>PM/CM Ratio</strong> — share of preventive vs. corrective work.</li>
            <li>Four charts: activity split, per-unit workload, health distribution, and monthly trend.</li>
          </ul>
          <p className="mt-2 font-medium">How to filter:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Pick a Unit and/or Criticality from the filter row at the top.</li>
            <li>All KPIs and charts refresh instantly for that scope.</li>
          </ol>
        </>
      ),
      id: (
        <>
          <p>
            Ringkasan cepat keandalan instrumen di Area Pemeliharaan 2. Semua data
            dapat difilter berdasarkan <strong>Unit</strong> dan{" "}
            <strong>Kritikalitas</strong>.
          </p>
          <p className="mt-2 font-medium">Kartu &amp; grafik:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Total Instrumen</strong> — jumlah sesuai filter.</li>
            <li><strong>Availability</strong> — (jam operasi − jam downtime) ÷ jam operasi × 100.</li>
            <li><strong>MTBF</strong> — total hari operasi ÷ jumlah event CM.</li>
            <li><strong>MTTR</strong> — total jam perbaikan ÷ jumlah event CM.</li>
            <li><strong>Kalibrasi Terlambat</strong> — instrumen yang melewati jatuh tempo.</li>
            <li><strong>Rasio PM/CM</strong> — proporsi pekerjaan preventif vs korektif.</li>
            <li>Empat grafik: pembagian aktivitas, beban per unit, distribusi kesehatan, tren bulanan.</li>
          </ul>
          <p className="mt-2 font-medium">Cara memfilter:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Pilih Unit dan/atau Kritikalitas di baris filter atas.</li>
            <li>Semua KPI dan grafik menyesuaikan secara otomatis.</li>
          </ol>
        </>
      ),
    },
  },
  {
    id: "instruments",
    icon: Wrench,
    title: { en: "Instruments", id: "Instrumen" },
    body: {
      en: (
        <>
          <p>Master data for every instrument (tag, name, unit, type, criticality, commissioning date).</p>
          <p className="mt-2 font-medium">How to add an instrument:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Go to <em>Input Data → Manual Entry</em>.</li>
            <li>Choose <em>New Instrument</em>, fill in tag, name, location, type, criticality.</li>
            <li>Click <em>Next → Save</em> (skip Step 2 or add a first maintenance record).</li>
          </ol>
        </>
      ),
      id: (
        <>
          <p>Data master setiap instrumen (tag, nama, unit, tipe, kritikalitas, tanggal commissioning).</p>
          <p className="mt-2 font-medium">Cara menambah instrumen:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Buka <em>Input Data → Entri Manual</em>.</li>
            <li>Pilih <em>Instrumen Baru</em>, isi tag, nama, lokasi, tipe, kritikalitas.</li>
            <li>Klik <em>Next → Save</em> (Step 2 opsional).</li>
          </ol>
        </>
      ),
    },
  },
  {
    id: "maintenance",
    icon: History,
    title: { en: "Maintenance History", id: "Riwayat Pemeliharaan" },
    body: {
      en: (
        <>
          <p>Complete PM/CM log with search, type, and status filters. Use <em>Export CSV</em> for offline reporting.</p>
          <p className="mt-2 font-medium">How to log a PM or CM record:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Go to <em>Input Data → Manual Entry</em>.</li>
            <li>Pick <em>Existing Instrument</em> in Step 1.</li>
            <li>In Step 2 set date, PM or CM, activity, final status, and technician.</li>
            <li>For CM: also fill failure mode, repair hours, and downtime hours.</li>
          </ol>
        </>
      ),
      id: (
        <>
          <p>Riwayat lengkap PM/CM dengan pencarian, filter tipe, dan status. Gunakan <em>Export CSV</em> untuk laporan offline.</p>
          <p className="mt-2 font-medium">Cara mencatat PM atau CM:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Buka <em>Input Data → Entri Manual</em>.</li>
            <li>Pilih <em>Instrumen Eksisting</em> pada Step 1.</li>
            <li>Di Step 2 isi tanggal, PM/CM, aktivitas, status akhir, teknisi.</li>
            <li>Khusus CM: isi juga failure mode, jam perbaikan, jam downtime.</li>
          </ol>
        </>
      ),
    },
  },
  {
    id: "health",
    icon: Activity,
    title: { en: "Health & Calibration", id: "Kesehatan & Kalibrasi" },
    body: {
      en: (
        <>
          <p>Traffic-light card grid — one card per instrument, colored by Health Score.</p>
          <p className="mt-2 font-medium">Health Score formula (starts at 100):</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>−8 per CM event</li>
            <li>up to −30 for overdue calibration (proportional to days overdue)</li>
            <li>−5 if calibration is due within 14 days</li>
            <li>−10 if the last calibration deviation exceeds the tolerance in Settings</li>
          </ul>
          <p className="mt-2">Bands: ≥90 Excellent, ≥70 Fair, &lt;70 Poor. Configurable in Settings.</p>
        </>
      ),
      id: (
        <>
          <p>Kartu traffic-light per instrumen, warna berdasarkan Health Score.</p>
          <p className="mt-2 font-medium">Rumus Health Score (mulai dari 100):</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>−8 tiap event CM</li>
            <li>hingga −30 untuk kalibrasi terlambat (proporsional dengan hari terlambat)</li>
            <li>−5 jika kalibrasi akan jatuh tempo &lt;14 hari</li>
            <li>−10 jika deviasi kalibrasi terakhir melebihi toleransi di Settings</li>
          </ul>
          <p className="mt-2">Band: ≥90 Excellent, ≥70 Fair, &lt;70 Poor. Dapat diubah di Settings.</p>
        </>
      ),
    },
  },
  {
    id: "notifications",
    icon: Bell,
    title: { en: "Notifications & Escalation", id: "Notifikasi & Eskalasi" },
    body: {
      en: (
        <>
          <p>Active alerts for overdue calibrations, low health, and any issue on SCE / High criticality instruments.</p>
          <p className="mt-2">The Escalation Matrix (also editable in Settings) sets the notification recipients per criticality tier.</p>
        </>
      ),
      id: (
        <>
          <p>Alert aktif untuk kalibrasi terlambat, health rendah, dan masalah pada instrumen SCE / High.</p>
          <p className="mt-2">Escalation Matrix (juga dapat diubah di Settings) mengatur penerima notifikasi per tingkat kritikalitas.</p>
        </>
      ),
    },
  },
  {
    id: "input",
    icon: FilePlus2,
    title: { en: "Input Data", id: "Input Data" },
    body: {
      en: (
        <>
          <p>Two modes:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Manual Entry</strong> — 2-step wizard (instrument, optional maintenance record).</li>
            <li>
              <strong>Smart Import</strong> — drop any <code>.csv</code>, <code>.xlsx</code>, or <code>.docx</code>.
              Column headers are auto-matched (Tag / Tag Number / Asset Tag all map to the same field),
              record type (instrument vs maintenance) is auto-detected, and you can adjust the mapping before importing.
            </li>
          </ul>
          <p className="mt-2 font-medium">How to import a file:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Open <em>Input Data → Smart Import</em>.</li>
            <li>Drag &amp; drop the file (or click Browse).</li>
            <li>Review the auto-detected column mapping; adjust dropdowns for any incorrect guesses; mark unwanted columns as <em>Ignore</em>.</li>
            <li>Confirm the record type (instrument or maintenance).</li>
            <li>Check the preview — valid rows are green, invalid rows show the reason.</li>
            <li>Click <em>Import N rows</em>.</li>
          </ol>
        </>
      ),
      id: (
        <>
          <p>Dua mode:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Entri Manual</strong> — wizard 2 langkah (instrumen, opsi maintenance).</li>
            <li>
              <strong>Smart Import</strong> — unggah <code>.csv</code>, <code>.xlsx</code>, atau <code>.docx</code>.
              Header kolom dicocokkan otomatis (Tag / Tag Number / Asset Tag → satu field yang sama),
              tipe record dideteksi otomatis, dan mapping bisa diubah sebelum impor.
            </li>
          </ul>
          <p className="mt-2 font-medium">Cara mengimpor file:</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>Buka <em>Input Data → Smart Import</em>.</li>
            <li>Seret &amp; lepas file (atau klik Browse).</li>
            <li>Periksa pemetaan kolom otomatis; koreksi bila salah; tandai kolom tak terpakai sebagai <em>Ignore</em>.</li>
            <li>Konfirmasi tipe record (instrumen / maintenance).</li>
            <li>Cek preview — baris valid hijau, baris invalid menampilkan alasannya.</li>
            <li>Klik <em>Import N rows</em>.</li>
          </ol>
        </>
      ),
    },
  },
  {
    id: "settings",
    icon: SettingsIcon,
    title: { en: "Settings", id: "Pengaturan" },
    body: {
      en: (
        <>
          <p>Four tabs:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Health Scoring</strong> — thresholds and calibration tolerance.</li>
            <li><strong>PM &amp; Calibration</strong> — intervals in days per instrument type.</li>
            <li><strong>Escalation</strong> — notification recipients per criticality.</li>
            <li><strong>Backup &amp; Reset</strong> — Admin-only. Export JSON, Import JSON, or reset all data.</li>
          </ul>
          <p className="mt-2">Users can edit the first three tabs; Backup &amp; Reset is locked for non-Admin accounts.</p>
        </>
      ),
      id: (
        <>
          <p>Empat tab:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Health Scoring</strong> — ambang skor dan toleransi kalibrasi.</li>
            <li><strong>PM &amp; Calibration</strong> — interval (hari) per tipe instrumen.</li>
            <li><strong>Eskalasi</strong> — penerima notifikasi per kritikalitas.</li>
            <li><strong>Backup &amp; Reset</strong> — khusus Admin. Ekspor / impor JSON, atau reset data.</li>
          </ul>
          <p className="mt-2">User biasa dapat mengubah tiga tab pertama; Backup &amp; Reset dikunci untuk non-Admin.</p>
        </>
      ),
    },
  },
  {
    id: "admin",
    icon: Info,
    title: { en: "Admins only — User Management", id: "Khusus Admin — Manajemen User" },
    body: {
      en: (
        <>
          <p>Only Admin accounts see the <strong>User Management</strong> item in the profile dropdown (top-right) and can visit <code>/admin/users</code>.</p>
          <p className="mt-2">From there: create Admin or User accounts, reset passwords, and deactivate accounts. The signed-in Admin cannot deactivate themselves.</p>
          <p className="mt-2 font-medium">Roles:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Admin</strong> — full access, including Backup &amp; Reset and User Management.</li>
            <li><strong>User</strong> — full operational access (all pages, add/edit instruments, log PM/CM, edit Health / Intervals / Escalation), <em>except</em> Backup &amp; Reset and User Management.</li>
          </ul>
        </>
      ),
      id: (
        <>
          <p>Hanya akun Admin yang melihat <strong>User Management</strong> di menu profil (kanan atas) dan dapat membuka <code>/admin/users</code>.</p>
          <p className="mt-2">Dari sana: buat akun Admin atau User, reset password, deaktivasi akun. Admin yang sedang login tidak dapat menonaktifkan dirinya sendiri.</p>
          <p className="mt-2 font-medium">Peran:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Admin</strong> — akses penuh, termasuk Backup &amp; Reset dan User Management.</li>
            <li><strong>User</strong> — akses operasional penuh (semua halaman, tambah/ubah instrumen, catat PM/CM, edit Health / Intervals / Escalation), <em>kecuali</em> Backup &amp; Reset dan User Management.</li>
          </ul>
        </>
      ),
    },
  },
];

function HelpPage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "id") setLang(saved);
    } catch {}
  }, []);
  const changeLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  };

  const t = (en: string, id: string) => (lang === "en" ? en : id);

  return (
    <AppShell>
      <PageHeader
        title={t("Help & Guide", "Bantuan & Panduan")}
        description={t(
          "How to use each page, and how the numbers are calculated.",
          "Cara menggunakan tiap halaman dan bagaimana angka-angka dihitung.",
        )}
        actions={
          <div className="inline-flex rounded-full glass-panel p-1 border border-border/60">
            {(["id", "en"] as Lang[]).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? "default" : "ghost"}
                className={cn(
                  "rounded-full h-8 px-4 text-xs font-semibold",
                  lang === l ? "" : "text-muted-foreground",
                )}
                onClick={() => changeLang(l)}
              >
                {l === "id" ? "Indonesia" : "English"}
              </Button>
            ))}
          </div>
        }
      />

      {/* Table of contents */}
      <Card className="glass-panel border-0 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <HelpCircle className="h-3.5 w-3.5" />
            {t("Contents", "Daftar Isi")}
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
              >
                {s.title[lang]}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-0">
        <CardContent className="p-4 md:p-6">
          <Accordion type="multiple" defaultValue={["dashboard"]} className="w-full">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <AccordionItem key={s.id} value={s.id} id={s.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2.5 text-left">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.title[lang]}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pl-6">
                    {s.body[lang]}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </AppShell>
  );
}
