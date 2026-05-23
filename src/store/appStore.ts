// src/store/appStore.ts

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────────────────
type CalendarView = "week" | "day";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
}

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Calendar
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // Notifications (toast queue)
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;

  // Global loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Calendar
      calendarView: "week",
      setCalendarView: (view) => set({ calendarView: view }),
      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      // Notifications
      notifications: [],
      addNotification: (n) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...n, id: crypto.randomUUID() },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // Global loading
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: "SPRMS-Store" },
  ),
);
