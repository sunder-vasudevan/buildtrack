"use client";

export interface Preferences {
  tabs: {
    overview: boolean;
    tracker: boolean;
    finances: boolean;
    more: boolean;
  };
  quickAdd: {
    log: boolean;
    expense: boolean;
    funds: boolean;
    reminder: boolean;
    wish: boolean;
    note: boolean;
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  tabs: { overview: true, tracker: true, finances: true, more: true },
  quickAdd: { log: true, expense: true, funds: true, reminder: true, wish: true, note: true },
};

const TAB_LABELS: { key: keyof Preferences["tabs"]; label: string; description: string }[] = [
  { key: "overview", label: "Overview", description: "Dashboard with budget summary & reminders" },
  { key: "tracker", label: "Tracker", description: "Phases, daily logs, plans" },
  { key: "finances", label: "Finances", description: "Budget & funds tracking" },
  { key: "more", label: "Project Info", description: "Team, windows, project details" },
];

const QUICK_ADD_LABELS: { key: keyof Preferences["quickAdd"]; label: string; description: string }[] = [
  { key: "log", label: "Add Works Completed", description: "Log daily progress with photos" },
  { key: "expense", label: "Add Expense / Receipt", description: "Record a payment" },
  { key: "funds", label: "Add Funds", description: "Record capital received" },
  { key: "reminder", label: "Reminder / Followup", description: "Set a reminder" },
  { key: "wish", label: "Wishlist / Pending Work", description: "Add backlog items" },
  { key: "note", label: "Project Jotting / Note", description: "Quick notes" },
];

interface Props {
  preferences: Preferences;
  onChange: (prefs: Preferences) => void;
  onNext: () => void;
  onBack: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function StepPreferences({ preferences, onChange, onNext, onBack }: Props) {
  function setTab(key: keyof Preferences["tabs"], val: boolean) {
    onChange({ ...preferences, tabs: { ...preferences.tabs, [key]: val } });
  }

  function setQuickAdd(key: keyof Preferences["quickAdd"], val: boolean) {
    onChange({ ...preferences, quickAdd: { ...preferences.quickAdd, [key]: val } });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Customise Your App</h2>
        <p className="text-sm text-gray-500 mt-1">Show only what you need. You can change this later in Settings.</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Navigation Tabs</h3>
        <div className="bg-white border rounded-xl divide-y">
          {TAB_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
              <Toggle checked={preferences.tabs[key]} onChange={(v) => setTab(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Quick Add Options</h3>
        <div className="bg-white border rounded-xl divide-y">
          {QUICK_ADD_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
              <Toggle checked={preferences.quickAdd[key]} onChange={(v) => setQuickAdd(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          Review & Create →
        </button>
      </div>
    </div>
  );
}
