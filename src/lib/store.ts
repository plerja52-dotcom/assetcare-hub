import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Instrument, PmTaskRecord, Settings } from "./types";
import { seedInstruments, seedTasks, defaultSettings } from "./seed";
import { recomputeStatuses } from "./kpi";

interface State {
  instruments: Instrument[];
  tasks: PmTaskRecord[];
  settings: Settings;

  addInstrument: (i: Instrument) => void;
  updateInstrument: (id: string, patch: Partial<Instrument>) => void;
  removeInstrument: (id: string) => void;   // cascade-deletes tasks
  bulkAddInstruments: (list: Instrument[]) => void;

  addTask: (t: PmTaskRecord) => void;
  updateTask: (id: string, patch: Partial<PmTaskRecord>) => void;
  removeTask: (id: string) => void;
  bulkAddTasks: (list: PmTaskRecord[]) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  addArea: (a: string) => void;
  removeArea: (a: string) => void;
  addEquipmentType: (t: string) => void;
  removeEquipmentType: (t: string) => void;

  resetAll: () => void;
  importBackup: (data: { instruments: Instrument[]; tasks: PmTaskRecord[]; settings: Settings }) => void;
  recompute: () => void;

  tasksForInstrument: (id: string) => number;
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      instruments: seedInstruments,
      tasks: seedTasks,
      settings: defaultSettings,

      addInstrument: (i) => set((s) => ({ instruments: [...s.instruments, i] })),
      updateInstrument: (id, patch) =>
        set((s) => ({ instruments: s.instruments.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeInstrument: (id) =>
        set((s) => ({
          instruments: s.instruments.filter((x) => x.id !== id),
          tasks: s.tasks.filter((t) => t.instrumentId !== id),
        })),
      bulkAddInstruments: (list) => set((s) => ({ instruments: [...s.instruments, ...list] })),

      addTask: (t) => set((s) => ({ tasks: recomputeStatuses([...s.tasks, t]) })),
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: recomputeStatuses(s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x))),
        })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      bulkAddTasks: (list) => set((s) => ({ tasks: recomputeStatuses([...s.tasks, ...list]) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addArea: (a) =>
        set((s) =>
          s.settings.areas.includes(a) ? s : { settings: { ...s.settings, areas: [...s.settings.areas, a] } },
        ),
      removeArea: (a) =>
        set((s) => ({ settings: { ...s.settings, areas: s.settings.areas.filter((x) => x !== a) } })),
      addEquipmentType: (t) =>
        set((s) =>
          s.settings.equipmentTypes.includes(t)
            ? s
            : { settings: { ...s.settings, equipmentTypes: [...s.settings.equipmentTypes, t] } },
        ),
      removeEquipmentType: (t) =>
        set((s) => ({
          settings: {
            ...s.settings,
            equipmentTypes: s.settings.equipmentTypes.filter((x) => x !== t),
          },
        })),

      resetAll: () => set({ instruments: [], tasks: [], settings: defaultSettings }),
      importBackup: (data) =>
        set({
          instruments: data.instruments ?? [],
          tasks: recomputeStatuses(data.tasks ?? []),
          settings: data.settings ?? defaultSettings,
        }),
      recompute: () => set((s) => ({ tasks: recomputeStatuses(s.tasks) })),

      tasksForInstrument: (id) => get().tasks.filter((t) => t.instrumentId === id).length,
    }),
    {
      name: "rid-store-v2",
      version: 2,
      migrate: (persisted, _v) => {
        // v1 → v2: drop old maintenance/instrument shape entirely; start clean.
        const p = persisted as { settings?: Settings } | undefined;
        return { instruments: [], tasks: [], settings: p?.settings ?? defaultSettings };
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      onRehydrateStorage: () => (state) => {
        if (state) state.tasks = recomputeStatuses(state.tasks);
      },
    },
  ),
);
