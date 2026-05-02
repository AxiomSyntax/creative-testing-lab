import React, { createContext, useContext, useState } from "react";
import { generateProjectId, slugifyProjectName, makeUniqueSlug } from "@/lib/id-system";

// ── TYPES ────────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface ProjectContextValue {
  projects: Project[];
  activeProjectId: string;
  activeProject: Project | undefined;
  activeProjectCode: string;
  createProject: (name: string) => string;
  switchProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateProjectCode: (id: string, code: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  exportProject: (id: string) => void;
  resetActiveProject: () => void;
  projectKey: (suffix: string) => string;
}

// ── KEY SUFFIXES (for reset / delete cleanup) ────────────────────────────────
const PROJECT_KEY_SUFFIXES = [
  "market:form",
  "market:avatar",
  "market:angles",
  "market:angleGenerated",
  "market:avatarStrategy",
  "competitors:rows",
  "script:hooks",
  "script:bodies",
  "script:ctas",
  "lab:experiments",
  "iteration:form",
] as const;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function readMeta<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (s !== null) return JSON.parse(s) as T;
  } catch { /* ignore */ }
  return fallback;
}

function writeMeta(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function generateId(existingProjects: Project[]): string {
  const max = existingProjects.reduce((m, p) => {
    const n = parseInt((p.id ?? "").replace("proj-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return generateProjectId(max + 1);
}


function clearProjectData(id: string) {
  PROJECT_KEY_SUFFIXES.forEach(s => localStorage.removeItem(`clb:p:${id}:${s}`));
}

// Migrate old flat clb:* keys into the first project's namespace
function migrateLegacyKeys(projectId: string) {
  const LEGACY: Record<string, string> = {
    "clb:market:form":          "market:form",
    "clb:market:avatar":        "market:avatar",
    "clb:market:angles":        "market:angles",
    "clb:market:angleGenerated":"market:angleGenerated",
    "clb:market:avatarStrategy":"market:avatarStrategy",
    "clb:competitors:rows":     "competitors:rows",
    "clb:script:hooks":         "script:hooks",
    "clb:script:bodies":        "script:bodies",
    "clb:script:ctas":          "script:ctas",
    "clb:lab:experiments":      "lab:experiments",
    "clb:iteration:form":       "iteration:form",
  };
  Object.entries(LEGACY).forEach(([oldKey, suffix]) => {
    const newKey = `clb:p:${projectId}:${suffix}`;
    const existing = localStorage.getItem(oldKey);
    if (existing !== null && localStorage.getItem(newKey) === null) {
      try { localStorage.setItem(newKey, existing); } catch { /* quota */ }
    }
    localStorage.removeItem(oldKey);
  });
}

// ── CONTEXT ───────────────────────────────────────────────────────────────────
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = readMeta<Project[]>("clb:meta:projects", []);
    if (stored.length > 0) {
      // Migrate any existing projects that don't have a code yet
      const migrated = stored.map(p =>
        p.code ? p : { ...p, code: slugifyProjectName(p.name) }
      );
      const needsSave = migrated.some((p, i) => p !== stored[i]);
      if (needsSave) writeMeta("clb:meta:projects", migrated);
      return migrated;
    }

    // First ever launch — create default project and migrate any legacy data
    const id = generateId([]);
    const first: Project = { id, name: "My Project", code: slugifyProjectName("My Project"), createdAt: Date.now() };
    writeMeta("clb:meta:projects", [first]);
    writeMeta("clb:meta:activeProject", id);
    migrateLegacyKeys(id);
    return [first];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const allProjects = readMeta<Project[]>("clb:meta:projects", []);
    const stored = readMeta<string>("clb:meta:activeProject", "");
    if (stored && allProjects.some(p => p.id === stored)) return stored;
    return allProjects[0]?.id ?? "";
  });

  function saveProjects(updated: Project[]) {
    setProjects(updated);
    writeMeta("clb:meta:projects", updated);
  }

  function saveActiveId(id: string) {
    setActiveProjectId(id);
    writeMeta("clb:meta:activeProject", id);
  }

  function createProject(name: string): string {
    const id = generateId(projects);
    const trimmedName = name.trim() || "Untitled Project";
    const project: Project = {
      id,
      name: trimmedName,
      code: makeUniqueSlug(trimmedName, projects),
      createdAt: Date.now(),
    };
    saveProjects([...projects, project]);
    saveActiveId(id);
    return id;
  }

  function switchProject(id: string) {
    if (projects.some(p => p.id === id)) saveActiveId(id);
  }

  function renameProject(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveProjects(projects.map(p => p.id === id ? { ...p, name: trimmed } : p));
  }

  function updateProjectCode(id: string, code: string) {
    const sanitized = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (!sanitized) return;
    saveProjects(projects.map(p => p.id === id ? { ...p, code: sanitized } : p));
  }

  function deleteProject(id: string) {
    if (projects.length <= 1) return;
    clearProjectData(id);
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    if (activeProjectId === id) saveActiveId(updated[0].id);
  }

  function duplicateProject(id: string): string {
    const source = projects.find(p => p.id === id);
    if (!source) return "";
    const newId = generateId(projects);
    const copyName = `${source.name} (Copy)`;
    const copy: Project = { id: newId, name: copyName, code: makeUniqueSlug(copyName, projects), createdAt: Date.now() };
    PROJECT_KEY_SUFFIXES.forEach(suffix => {
      const val = localStorage.getItem(`clb:p:${id}:${suffix}`);
      if (val !== null) try { localStorage.setItem(`clb:p:${newId}:${suffix}`, val); } catch { /* quota */ }
    });
    saveProjects([...projects, copy]);
    saveActiveId(newId);
    return newId;
  }

  function exportProject(id: string): void {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const payload: Record<string, unknown> = { meta: project, data: {} };
    PROJECT_KEY_SUFFIXES.forEach(suffix => {
      const val = localStorage.getItem(`clb:p:${id}:${suffix}`);
      if (val !== null) {
        try { (payload.data as Record<string, unknown>)[suffix] = JSON.parse(val); }
        catch { (payload.data as Record<string, unknown>)[suffix] = val; }
      }
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetActiveProject() {
    clearProjectData(activeProjectId);
    window.location.reload();
  }

  function projectKey(suffix: string): string {
    return `clb:p:${activeProjectId}:${suffix}`;
  }

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProjectId,
      activeProject,
      activeProjectCode: activeProject?.code ?? "PROJ",
      createProject,
      switchProject,
      renameProject,
      updateProjectCode,
      deleteProject,
      duplicateProject,
      exportProject,
      resetActiveProject,
      projectKey,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider");
  return ctx;
}
