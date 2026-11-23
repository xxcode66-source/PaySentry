"use client";

import { create } from "zustand";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  desc?: string;
}

interface ToastState {
  toasts: ToastMessage[];
  push: (kind: ToastKind, title: string, desc?: string) => number;
  dismiss: (id: number) => void;
}

let nextToastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, title, desc) => {
    const id = ++nextToastId;
    set((state) => ({ toasts: [...state.toasts, { id, kind, title, desc }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 6000);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  success: (title: string, desc?: string, _hash?: string) =>
    useToastStore.getState().push("success", title, desc),
  error: (title: string, desc?: string) => useToastStore.getState().push("error", title, desc),
  warning: (title: string, desc?: string) => useToastStore.getState().push("warning", title, desc),
  info: (title: string, desc?: string) => useToastStore.getState().push("info", title, desc),
};
