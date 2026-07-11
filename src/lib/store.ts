import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Instrument,
  MaintenanceRecord,
  Settings,
} from "./types";
import { seedInstruments, seedMaintenance, defaultSettings } from "./seed";

interface State {
  instruments: Instrument[];
  maintenance: MaintenanceRecord[];
  settings: Settings;
  addInstrument: (i: Instrument) => void;
  updateInstrument: (id: string, patch: Partial<Instrument>) => void;
  removeInstrument: (id: string) => void;
  addMaintenance: (m: MaintenanceRecord) => void;
  bulkAddInstruments: (list: Instrument[]) => void;
  bulkAddMaintenance: (list: MaintenanceRecord[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addInstrumentType: (t: string) => void;
  resetAll: () => void;
  importBackup: (data: {
    instruments: Instrument[];
    maintenance: MaintenanceRecord[];
    settings: Settings;
  }) => void;
}

export const useAppStore = create<State>()(
  persist(
    (set) => ({
      instruments: seedInstruments,
      maintenance: seedMaintenance,
      settings: defaultSettings,
      addInstrument: (i) =>
        set((s) => ({ instruments: [...s.instruments, i] })),
      updateInstrument: (id, patch) =>
        set((s) => ({
          instruments: s.instruments.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        })),
      removeInstrument: (id) =>
        set((s) => ({
          instruments: s.instruments.filter((x) => x.id !== id),
          maintenance: s.maintenance.filter((m) => m.instrumentId !== id),
        })),
      addMaintenance: (m) =>
        set((s) => ({ maintenance: [...s.maintenance, m] })),
      bulkAddInstruments: (list) =>
        set((s) => ({ instruments: [...s.instruments, ...list] })),
      bulkAddMaintenance: (list) =>
        set((s) => ({ maintenance: [...s.maintenance, ...list] })),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      addInstrumentType: (t) =>
        set((s) =>
          s.settings.instrumentTypes.includes(t)
            ? s
            : {
                settings: {
                  ...s.settings,
                  instrumentTypes: [...s.settings.instrumentTypes, t],
                },
              },
        ),
      resetAll: () =>
        set({
          instruments: seedInstruments,
          maintenance: seedMaintenance,
          settings: defaultSettings,
        }),
      importBackup: (data) =>
        set({
          instruments: data.instruments,
          maintenance: data.maintenance,
          settings: data.settings,
        }),
    }),
    {
      name: "rid-store-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
