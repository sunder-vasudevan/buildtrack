"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { ProjectPreferences, DEFAULT_PROJECT_PREFERENCES } from "@/lib/types";

interface PrefsContextValue {
  prefs: ProjectPreferences;
  setPrefs: (prefs: ProjectPreferences) => void;
}

const PrefsContext = createContext<PrefsContextValue>({
  prefs: DEFAULT_PROJECT_PREFERENCES,
  setPrefs: () => {},
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ProjectPreferences>(DEFAULT_PROJECT_PREFERENCES);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("projects")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.preferences?.tabs) setPrefs(data.preferences as ProjectPreferences);
    }
    load();
  }, []);

  return (
    <PrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
