import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Wrench, History, Activity, Bell, FilePlus2,
  Settings as SettingsIcon, HelpCircle, ShieldCheck, UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Guide — Pertamina Reliability Instrumentation" }] }),
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
    id: "dashboard", icon: LayoutDashboard,
    title: { en: "Dashboard Overview", id: "Ringkasan Dashboard" },
    body: {
      en: (
        <>
          <p>One-glance summary of PM &amp; PdM progress across Maintenance Area 2. Filters at the top apply to every card and chart on the page.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Total Instrument</strong> — count of instruments matching your filter.</li>
            <li><strong>Progress PM Bulan Ini</strong> — of every task planned for the current month, the percentage marked <em>Finish</em>.</li>
            <li><strong>Pekerjaan Selesai</strong> — number of tasks finished in the current month.</li>
            <li><strong>Pekerjaan Overdue</strong> — running count of tasks currently in <em>Behind</em> status.</li>
            <li><strong>Progress per Area</strong> — bar chart of completion percentage per area, so you can spot which area is falling behind.</li>
            <li><strong>Distribusi Jenis Instrument</strong> — donut chart of instruments by equipment type.</li>
            <li><strong>Daftar Pekerjaan yang Akan Jatuh Tempo</strong> — upcoming and overdue tasks, sorted soonest first.</li>
          </ul>
        </>
      ),
      id: (
        <>
          <p>Ringkasan singkat progres PM &amp; PdM di Maintenance Area 2. Filter di bagian atas berpengaruh ke semua kartu dan grafik.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Total Instrument</strong> — jumlah instrumen sesuai filter.</li>
            <li><strong>Progress PM Bulan Ini</strong> — persentase pekerjaan yang direncanakan bulan ini dan sudah berstatus <em>Finish</em>.</li>
            <li><strong>Pekerjaan Selesai</strong> — jumlah pekerjaan yang tuntas bulan ini.</li>
            <li><strong>Pekerjaan Overdue</strong> — jumlah pekerjaan yang saat ini berstatus <em>Behind</em>.</li>
            <li><strong>Progress per Area</strong> — grafik persentase penyelesaian per area, sehingga area yang tertinggal langsung terlihat.</li>
            <li><strong>Distribusi Jenis Instrument</strong> — grafik donut jumlah instrumen per tipe peralatan.</li>
            <li><strong>Daftar Pekerjaan yang Akan Jatuh Tempo</strong> — daftar pekerjaan mendatang dan yang telat, diurutkan dari yang paling dekat.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "status", icon: Activity,
    title: { en: "PM Status Logic", id: "Logika Status PM" },
    body: {
      en: (
        <>
          <p>Task status is derived automatically from dates; you can also mark a task <em>Inprogress</em> manually.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Finish</strong> — Actual Date filled in.</li>
            <li><strong>Behind</strong> — Plan Date has passed, no Actual Date.</li>
            <li><strong>Inprogress</strong> — manually set when work has started but isn't finished.</li>
            <li><strong>Scheduled</strong> — Plan Date is still in the future, no work logged yet.</li>
          </ul>
        </>
      ),
      id: (
        <>
          <p>Status pekerjaan dihitung otomatis dari tanggal; Anda juga bisa menandai pekerjaan sebagai <em>Inprogress</em> secara manual.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Finish</strong> — Actual Date sudah diisi.</li>
            <li><strong>Behind</strong> — Plan Date sudah lewat tetapi Actual Date masih kosong.</li>
            <li><strong>Inprogress</strong> — ditandai manual saat pekerjaan sudah mulai tetapi belum tuntas.</li>
            <li><strong>Scheduled</strong> — Plan Date masih di masa depan dan belum ada aktivitas tercatat.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "instruments", icon: Wrench,
    title: { en: "Instruments", id: "Instrumen" },
    body: {
      en: (
        <>
          <p>The master list of physical assets. Each instrument stores its Tag Number, Area, Equipment type, an optional descriptive Lokasi, and its default PM frequency.</p>
          <p className="mt-2">Deleting an instrument also removes all of its PM task records — a confirmation shows the count first.</p>
        </>
      ),
      id: (
        <>
          <p>Daftar master seluruh aset fisik. Tiap instrumen menyimpan Tag Number, Area, jenis Equipment, deskripsi Lokasi (opsional), dan frekuensi PM standar.</p>
          <p className="mt-2">Menghapus instrumen juga menghapus seluruh catatan PM terkait — konfirmasi akan menampilkan jumlahnya terlebih dahulu.</p>
        </>
      ),
    },
  },
  {
    id: "maintenance", icon: History,
    title: { en: "Maintenance History", id: "Riwayat Maintenance" },
    body: {
      en: (
        <>
          <p>Every PM, PdM, and corrective (Perbaikan) task recorded across Area 2. Filter by Area, Equipment, Status, Activity Type, or free-text search across Tag, Activity, or PIC. Export the filtered view as CSV.</p>
        </>
      ),
      id: (
        <>
          <p>Seluruh pekerjaan PM, PdM, dan Perbaikan yang tercatat di Area 2. Bisa disaring berdasarkan Area, Equipment, Status, Jenis Aktivitas, atau pencarian bebas di Tag, Aktivitas, dan PIC. Data yang tersaring bisa diekspor ke CSV.</p>
        </>
      ),
    },
  },
  {
    id: "pm-status", icon: Activity,
    title: { en: "PM Status Page", id: "Halaman PM Status" },
    body: {
      en: (
        <>
          <p>Traffic-light view of each instrument's most recent PM status: <span className="text-success">green = Finish</span>, <span className="text-warning">yellow = Inprogress</span>, <span className="text-primary">red = Behind</span>, grey = Scheduled/not due.</p>
        </>
      ),
      id: (
        <>
          <p>Tampilan lampu lalu-lintas status PM terkini untuk setiap instrumen: <span className="text-success">hijau = Finish</span>, <span className="text-warning">kuning = Inprogress</span>, <span className="text-primary">merah = Behind</span>, abu-abu = Scheduled/belum jatuh tempo.</p>
        </>
      ),
    },
  },
  {
    id: "notifications", icon: Bell,
    title: { en: "Notifications", id: "Notifikasi" },
    body: {
      en: (
        <>
          <p>Every task currently in <em>Behind</em> status is listed here, grouped by Area, along with the escalation recipients configured for that Area in Settings. Use "Send escalation" to queue a notification (delivery happens through your existing mail/notification pipeline).</p>
        </>
      ),
      id: (
        <>
          <p>Semua pekerjaan berstatus <em>Behind</em> akan tampil di sini, dikelompokkan per Area, lengkap dengan daftar penerima eskalasi yang diatur di Settings. Tekan "Send escalation" untuk mengantre notifikasi (pengiriman aktual mengikuti sistem email/notifikasi yang sudah berjalan).</p>
        </>
      ),
    },
  },
  {
    id: "input", icon: FilePlus2,
    title: { en: "Input Data", id: "Input Data" },
    body: {
      en: (
        <>
          <p>Add instruments or tasks manually, or use <strong>Smart Import</strong> to load an existing spreadsheet.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Supports CSV and Excel (.xlsx/.xls).</li>
            <li>Auto-detects the real header row even when it isn't row 1.</li>
            <li>Matches column names in either English or Indonesian.</li>
            <li>Two downloadable templates mirror the team's existing PM/PdM tracker layout.</li>
            <li>Summary and task-list sheets are skipped automatically.</li>
          </ul>
        </>
      ),
      id: (
        <>
          <p>Tambahkan instrumen atau tugas secara manual, atau gunakan <strong>Smart Import</strong> untuk mengunggah spreadsheet yang sudah ada.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Mendukung CSV dan Excel (.xlsx/.xls).</li>
            <li>Baris header dideteksi otomatis walaupun bukan di baris pertama.</li>
            <li>Nama kolom dapat dalam Bahasa Inggris maupun Bahasa Indonesia.</li>
            <li>Tersedia dua template unduhan yang persis mengikuti format tracker PM/PdM tim.</li>
            <li>Sheet rekap atau template task list akan otomatis dilewati.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "settings", icon: SettingsIcon,
    title: { en: "Settings", id: "Pengaturan" },
    body: {
      en: (
        <>
          <p>Configure the Area list, Equipment Type list, PM frequency per equipment type, the dashboard "upcoming" window, and escalation recipients per Area. Backup, Import, and Reset actions live under <em>Backup &amp; Reset</em> and require an Admin account.</p>
        </>
      ),
      id: (
        <>
          <p>Atur daftar Area, daftar Jenis Equipment, frekuensi PM per jenis equipment, jendela "upcoming" pada dashboard, serta penerima eskalasi per Area. Aksi Backup, Import, dan Reset berada di tab <em>Backup &amp; Reset</em> dan hanya dapat dilakukan oleh akun Admin.</p>
        </>
      ),
    },
  },
  {
    id: "register", icon: UserPlus,
    title: { en: "Registration & Approval", id: "Registrasi & Persetujuan" },
    body: {
      en: (
        <>
          <p>New engineers can request access from the sign-in page. There's no email or OTP verification — the request simply sits in <strong>Pending Requests</strong> until an Admin approves or rejects it from User Management. Approved accounts can sign in immediately; rejected requests get a clear "not approved, contact your Admin" message.</p>
        </>
      ),
      id: (
        <>
          <p>Engineer baru dapat mengajukan akun sendiri dari halaman sign-in. Tidak ada verifikasi email atau OTP — permintaan tinggal menunggu di daftar <strong>Pending Requests</strong> hingga Admin menyetujui atau menolak dari halaman User Management. Akun yang disetujui langsung bisa masuk; yang ditolak akan melihat pesan "permintaan tidak disetujui, hubungi Admin".</p>
        </>
      ),
    },
  },
  {
    id: "admin", icon: ShieldCheck,
    title: { en: "Admin Tools", id: "Perangkat Admin" },
    body: {
      en: (
        <>
          <p>Admin accounts can access <em>User Management</em> from the profile menu — approve pending requests, adjust user roles, disable accounts, and monitor active sessions (with the ability to revoke a session immediately).</p>
        </>
      ),
      id: (
        <>
          <p>Akun Admin memiliki akses <em>User Management</em> melalui menu profil — menyetujui permintaan pending, mengubah peran pengguna, menonaktifkan akun, serta memantau sesi aktif (termasuk mencabut sesi secara langsung).</p>
        </>
      ),
    },
  },
];

function HelpPage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_KEY) : null;
    if (stored === "en" || stored === "id") setLang(stored);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  return (
    <AppShell>
      <PageHeader
        title="Help & Guide"
        description="How each page works, plus the KPI logic behind the dashboard."
        actions={
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden">
            {(["en", "id"] as Lang[]).map((l) => (
              <Button key={l} size="sm" variant={lang === l ? "default" : "ghost"}
                onClick={() => setLang(l)} className="rounded-none">
                {l === "en" ? "English" : "Bahasa Indonesia"}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="glass-panel border-0 h-fit sticky top-20">
          <CardContent className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-2">
              {lang === "en" ? "On this page" : "Daftar isi"}
            </div>
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <a key={s.id} href={`#${s.id}`}
                    className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition")}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.title[lang]}</span>
                  </a>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardContent className="p-4 md:p-6">
            <Accordion type="multiple" defaultValue={SECTIONS.map((s) => s.id)} className="w-full">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <AccordionItem key={s.id} value={s.id} id={s.id} className="scroll-mt-20">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {s.title[lang]}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-foreground/90 space-y-2 leading-relaxed">
                      {s.body[lang]}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              {lang === "en"
                ? "For deeper deployment steps (Cloudflare + D1), see the README bundled with the project."
                : "Untuk panduan deploy detail (Cloudflare + D1), silakan lihat README yang disertakan bersama project."}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
