import { useState, useRef, useEffect } from "react";
import {
  Plus, Check, Pencil, Trash2, ChevronDown, X,
  Settings2, Copy, Download, AlertTriangle, Hash, Sparkles,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { motion, AnimatePresence } from "framer-motion";
import { seedDemoProject } from "@/lib/seedDemoProject";
import { makeUniqueSlug } from "@/lib/id-system";

export function ProjectPanel() {
  const {
    projects, activeProjectId, activeProject,
    createProject, switchProject, renameProject, updateProjectCode, deleteProject,
    duplicateProject, exportProject,
  } = useProject();

  const [isCreating,        setIsCreating]        = useState(false);
  const [newName,           setNewName]           = useState("");
  const [editingId,         setEditingId]         = useState<string | null>(null);
  const [editName,          setEditName]          = useState("");
  const [confirmDeleteId,   setConfirmDeleteId]   = useState<string | null>(null);
  const [settingsOpen,      setSettingsOpen]      = useState(false);
  const [confirmDelete,     setConfirmDelete]     = useState(false);
  const [editingCode,       setEditingCode]       = useState(false);
  const [codeInput,         setCodeInput]         = useState("");
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [demoLoaded,        setDemoLoaded]        = useState(false);
  const [newProjectOpen,    setNewProjectOpen]    = useState(false);

  const createInputRef   = useRef<HTMLInputElement>(null);
  const editInputRef     = useRef<HTMLInputElement>(null);
  const settingsRef      = useRef<HTMLDivElement>(null);
  const newProjectRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isCreating) createInputRef.current?.focus(); }, [isCreating]);
  useEffect(() => { if (editingId)  editInputRef.current?.focus();   }, [editingId]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3500);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    function onOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [settingsOpen]);

  // Close new-project dropdown on outside click
  useEffect(() => {
    if (!newProjectOpen) return;
    function onOutside(e: MouseEvent) {
      if (newProjectRef.current && !newProjectRef.current.contains(e.target as Node)) {
        setNewProjectOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [newProjectOpen]);

  function handleCreate() {
    const trimmed = newName.trim();
    if (trimmed) createProject(trimmed);
    setIsCreating(false);
    setNewName("");
  }

  function loadDemoProject() {
    const existing = projects.find(p => p.name === "LeadFlow AI");
    if (existing) {
      seedDemoProject(existing.id, existing.code);
      switchProject(existing.id);
    } else {
      // Compute the slug BEFORE createProject so it matches what createProject assigns internally.
      const demoSlug = makeUniqueSlug("LeadFlow AI", projects);
      const newId = createProject("LeadFlow AI");
      seedDemoProject(newId, demoSlug);
    }
    setDemoLoaded(true);
    setTimeout(() => setDemoLoaded(false), 2500);
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setConfirmDeleteId(null);
    setSettingsOpen(false);
  }

  function commitEdit(id: string) {
    const trimmed = editName.trim();
    if (trimmed) renameProject(id, trimmed);
    setEditingId(null);
    setEditName("");
  }

  function handleRowDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteProject(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function handleSettingsDelete() {
    if (!activeProject) return;
    if (confirmDelete) {
      deleteProject(activeProjectId);
      setConfirmDelete(false);
      setSettingsOpen(false);
    } else {
      setConfirmDelete(true);
    }
  }

  function startEditCode() {
    setCodeInput(activeProject?.code ?? "");
    setEditingCode(true);
  }

  function commitCode() {
    const sanitized = codeInput.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (sanitized) updateProjectCode(activeProjectId, sanitized);
    setEditingCode(false);
    setCodeInput("");
  }

  function handleDuplicate() {
    if (activeProject) duplicateProject(activeProjectId);
    setSettingsOpen(false);
  }

  function handleExport() {
    if (activeProject) exportProject(activeProjectId);
    setSettingsOpen(false);
  }

  return (
    <div className="hidden md:block px-4 py-3 border-t border-white/5">

      {/* ── Header ── */}
      <button
        onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
        className="w-full flex items-center justify-start mb-2 rounded px-1 py-0.5 hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 select-none flex items-center gap-1">
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isProjectsExpanded ? "" : "-rotate-90"}`} />
          Projects
          <span className="text-muted-foreground/30">({projects.length})</span>
        </span>
      </button>

      {/* ── Project list ── */}
      {isProjectsExpanded && (
        <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto no-scrollbar">
          {projects.map(project => {
            const isActive  = project.id === activeProjectId;
            const isEditing = editingId === project.id;
            const isConfirm = confirmDeleteId === project.id;

            return (
              <div
                key={project.id}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-primary/8 border border-primary/15"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  isActive ? "bg-primary shadow-[0_0_4px_1px] shadow-primary/40" : "bg-white/15"
                }`} />

                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter")  { e.preventDefault(); commitEdit(project.id); }
                      if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                    }}
                    onBlur={() => commitEdit(project.id)}
                    className="flex-1 bg-white/8 text-xs text-foreground px-1.5 py-0.5 rounded border border-primary/30 focus:outline-none focus:border-primary/60 min-w-0"
                  />
                ) : (
                  <button
                    className={`flex-1 text-left text-xs truncate transition-colors min-w-0 ${
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => !isActive && switchProject(project.id)}
                    title={project.name}
                  >
                    {project.name}
                  </button>
                )}

                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(project.id, project.name)}
                    title="Rename"
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground/35 hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => handleRowDelete(project.id)}
                      title={isConfirm ? "Click again to confirm delete" : "Delete project"}
                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                        isConfirm
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "hover:bg-red-500/10 text-muted-foreground/35 hover:text-red-400"
                      }`}
                    >
                      {isConfirm ? <X className="w-2.5 h-2.5" /> : <Trash2 className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inline create input ── */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            key="create-input"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                ref={createInputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter")  { e.preventDefault(); handleCreate(); }
                  if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
                }}
                placeholder="Project name…"
                className="flex-1 bg-white/[0.06] text-xs text-foreground px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-primary/40 min-w-0 placeholder:text-muted-foreground/30"
              />
              <button
                onClick={handleCreate}
                className="w-6 h-6 flex items-center justify-center rounded bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-colors shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewName(""); }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 text-muted-foreground/40 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom action buttons ── */}
      <div className="relative mt-2 pt-2 border-t border-white/5 flex flex-col gap-1" ref={settingsRef}>

        {/* + New Project — dropdown with Create / Load Demo */}
        <div className="relative" ref={newProjectRef}>
          <button
            onClick={() => { setNewProjectOpen(s => !s); setSettingsOpen(false); }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
              newProjectOpen
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-primary/6 border-primary/12 text-primary/70 hover:text-primary hover:bg-primary/10 hover:border-primary/20"
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              New Project
            </span>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${newProjectOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {newProjectOpen && (
              <motion.div
                key="new-project-dropdown"
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.13 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 p-1"
              >
                {/* Create New Project */}
                <button
                  onClick={() => {
                    setNewProjectOpen(false);
                    setIsCreating(true);
                    setSettingsOpen(false);
                    setEditingId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all text-left"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                  Create New Project
                </button>

                {/* Load Demo Project */}
                <button
                  onClick={() => { loadDemoProject(); setNewProjectOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left ${
                    demoLoaded
                      ? "text-emerald-400 bg-emerald-500/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                  }`}
                >
                  {demoLoaded
                    ? <><Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />Demo Loaded</>
                    : <><Sparkles className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />Load Demo Project</>
                  }
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project Settings */}
        <button
          onClick={() => { setSettingsOpen(s => !s); setConfirmDelete(false); setNewProjectOpen(false); }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
            settingsOpen
              ? "bg-white/[0.07] border-white/15 text-foreground"
              : "bg-white/[0.03] border-white/8 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:border-white/15"
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            Project Settings
          </span>
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Settings dropdown */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              key="settings-dropdown"
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.13 }}
              className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
            >
              {/* Active project name + code */}
              <div className="px-3 pt-2.5 pb-2 border-b border-white/6">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/35">Active Project</p>
                <p className="text-xs font-semibold text-foreground/80 truncate mt-0.5">{activeProject?.name}</p>

                <div className="flex items-center gap-1.5 mt-2">
                  <Hash className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Code</span>
                  {editingCode ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        autoFocus
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6))}
                        onKeyDown={e => {
                          if (e.key === "Enter")  { e.preventDefault(); commitCode(); }
                          if (e.key === "Escape") { setEditingCode(false); }
                        }}
                        onBlur={commitCode}
                        placeholder="SAAS"
                        className="w-16 bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-primary uppercase tracking-widest focus:outline-none focus:border-primary/60 placeholder:text-primary/25"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={startEditCode}
                      className="ml-auto flex items-center gap-1 group"
                      title="Edit project code"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] font-bold tracking-widest group-hover:bg-primary/15 group-hover:border-primary/35 transition-all">
                        {activeProject?.code ?? "PROJ"}
                      </span>
                      <Pencil className="w-2.5 h-2.5 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  onClick={() => startEdit(activeProjectId, activeProject?.name ?? "")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all text-left"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                  Rename Project
                </button>

                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all text-left"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                  Duplicate Project
                </button>

                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all text-left"
                >
                  <Download className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                  Export Project Data
                </button>

                {projects.length > 1 && <div className="h-px bg-white/6 my-0.5" />}

                {projects.length > 1 && (
                  <button
                    onClick={handleSettingsDelete}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left ${
                      confirmDelete
                        ? "bg-red-500/12 text-red-400 hover:bg-red-500/18"
                        : "text-muted-foreground hover:text-red-400 hover:bg-red-500/8"
                    }`}
                  >
                    {confirmDelete
                      ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      : <Trash2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                    }
                    {confirmDelete ? "Click again to confirm" : "Delete Project"}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
