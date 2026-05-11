"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, PencilLine, AppWindow, Receipt, Landmark } from "lucide-react";
import { useState } from "react";

export function QuickAddModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg transform -translate-y-4 hover:scale-105 transition-transform focus:outline-none">
          <Plus className="h-6 w-6" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[90%] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl rounded-2xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-xl font-bold leading-none tracking-tight">Quick Add</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-2">
              What would you like to log today?
            </Dialog.Description>
          </div>
          <div className="grid gap-3 py-4">
            <button className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors" onClick={() => setOpen(false)}>
              <div className="bg-blue-100 p-3 rounded-full"><PencilLine className="h-6 w-6 text-blue-700" /></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Add Works Completed</h4>
                <p className="text-sm text-muted-foreground">Log progress, photos & notes</p>
              </div>
            </button>
            <button className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors" onClick={() => setOpen(false)}>
              <div className="bg-emerald-100 p-3 rounded-full"><Receipt className="h-6 w-6 text-emerald-700" /></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Upload Receipt</h4>
                <p className="text-sm text-muted-foreground">Record a new expense</p>
              </div>
            </button>
            <button className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors" onClick={() => setOpen(false)}>
              <div className="bg-violet-100 p-3 rounded-full"><AppWindow className="h-6 w-6 text-violet-700" /></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Update Window</h4>
                <p className="text-sm text-muted-foreground">Change window status</p>
              </div>
            </button>
            <button className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors" onClick={() => setOpen(false)}>
              <div className="bg-orange-100 p-3 rounded-full"><Landmark className="h-6 w-6 text-orange-700" /></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Add Income / Funding</h4>
                <p className="text-sm text-muted-foreground">Record received capital</p>
              </div>
            </button>
          </div>
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
