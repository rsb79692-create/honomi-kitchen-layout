'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project } from '@/types/project';
import { defaultProject } from '@/types/project';
import { idbSave, idbLoad, idbDelete } from '@/lib/idb';
import type { Equipment } from '@/types/equipment';
import type { KitchenLine } from '@/types/kitchenLine';

const KEY_LIST = 'kl-project-list';
const KEY_CURRENT = 'kl-current-id';
const projectKey = (id: string) => `kl-project-${id}`;

type Summary = { id: string; name: string; updatedAt: number };

function lsGet<T>(key: string): T | null {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function lsRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function migrateOldData(project: Project): Project {
  // Migrate data from before project system was added
  const oldEquipments = lsGet<Equipment[]>('kitchen-equipments');
  const oldLines = lsGet<KitchenLine[]>('kitchen-outline-lines');
  const oldShowPdf = lsGet<boolean>('kitchen-show-pdf');
  if (!oldEquipments && !oldLines) return project;
  return {
    ...project,
    equipments: oldEquipments ?? project.equipments,
    kitchenLines: oldLines ?? project.kitchenLines,
    showPdf: oldShowPdf ?? project.showPdf,
  };
}

function initState(): { list: Summary[]; project: Project } {
  if (typeof window === 'undefined') {
    const p = defaultProject();
    return { list: [{ id: p.id, name: p.name, updatedAt: p.updatedAt }], project: p };
  }

  const list: Summary[] = lsGet<Summary[]>(KEY_LIST) ?? [];
  const currentId = localStorage.getItem(KEY_CURRENT);

  let project: Project | null = null;
  if (currentId) project = lsGet<Project>(projectKey(currentId));
  if (!project && list.length > 0) project = lsGet<Project>(projectKey(list[0].id));

  if (project) {
    localStorage.setItem(KEY_CURRENT, project.id);
    return { list, project };
  }

  // First run — create default project and migrate old data
  const newProject = migrateOldData(defaultProject());
  const newList: Summary[] = [{ id: newProject.id, name: newProject.name, updatedAt: newProject.updatedAt }];
  lsSet(KEY_LIST, newList);
  lsSet(projectKey(newProject.id), newProject);
  localStorage.setItem(KEY_CURRENT, newProject.id);
  return { list: newList, project: newProject };
}

export function useProjects() {
  const [{ list: projectList, project: currentProject }, setState] = useState<{
    list: Summary[];
    project: Project;
  }>(() => initState());

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const currentIdRef = useRef(currentProject.id);

  // Keep ref in sync
  useEffect(() => {
    currentIdRef.current = currentProject.id;
  }, [currentProject.id]);

  // Load PDF on mount
  useEffect(() => {
    const id = currentProject.id;
    setIsLoadingPdf(true);
    idbLoad<ArrayBuffer>(`pdf-${id}`)
      .then((data) => { if (currentIdRef.current === id) { setPdfData(data); setIsLoadingPdf(false); } })
      .catch(() => { if (currentIdRef.current === id) setIsLoadingPdf(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProject = useCallback((changes: Partial<Project> | ((prev: Project) => Partial<Project>)) => {
    setState((prev) => {
      const resolved = typeof changes === 'function' ? changes(prev.project) : changes;
      const updated: Project = { ...prev.project, ...resolved, updatedAt: Date.now() };
      lsSet(projectKey(updated.id), updated);
      const newList = prev.list.some((p) => p.id === updated.id)
        ? prev.list.map((p) => p.id === updated.id ? { id: updated.id, name: updated.name, updatedAt: updated.updatedAt } : p)
        : [...prev.list, { id: updated.id, name: updated.name, updatedAt: updated.updatedAt }];
      lsSet(KEY_LIST, newList);
      return { list: newList, project: updated };
    });
  }, []);

  const switchProject = useCallback(async (id: string) => {
    const project = lsGet<Project>(projectKey(id));
    if (!project) return;
    localStorage.setItem(KEY_CURRENT, id);
    setState((prev) => ({ ...prev, project }));
    setIsLoadingPdf(true);
    setPdfData(null);
    try {
      const data = await idbLoad<ArrayBuffer>(`pdf-${id}`);
      if (currentIdRef.current === id) { setPdfData(data); }
    } catch {
      // ignore
    } finally {
      setIsLoadingPdf(false);
    }
  }, []);

  const createProject = useCallback(async (name: string) => {
    const project = defaultProject();
    project.name = name;
    lsSet(projectKey(project.id), project);
    localStorage.setItem(KEY_CURRENT, project.id);
    setPdfData(null);
    setState((prev) => {
      const newList: Summary[] = [...prev.list, { id: project.id, name: project.name, updatedAt: project.updatedAt }];
      lsSet(KEY_LIST, newList);
      return { list: newList, project };
    });
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    lsRemove(projectKey(id));
    await idbDelete(`pdf-${id}`).catch(() => {});

    setState((prev) => {
      const newList = prev.list.filter((p) => p.id !== id);
      lsSet(KEY_LIST, newList);

      if (prev.project.id !== id) {
        return { ...prev, list: newList };
      }

      // Deleting the current project — switch to next available
      if (newList.length > 0) {
        const nextProject = lsGet<Project>(projectKey(newList[0].id)) ?? defaultProject();
        localStorage.setItem(KEY_CURRENT, nextProject.id);
        idbLoad<ArrayBuffer>(`pdf-${nextProject.id}`)
          .then(setPdfData).catch(() => setPdfData(null));
        setIsLoadingPdf(true);
        return { list: newList, project: nextProject };
      }

      // No projects left — create default
      const newProject = defaultProject();
      lsSet(projectKey(newProject.id), newProject);
      localStorage.setItem(KEY_CURRENT, newProject.id);
      const freshList: Summary[] = [{ id: newProject.id, name: newProject.name, updatedAt: newProject.updatedAt }];
      lsSet(KEY_LIST, freshList);
      setPdfData(null);
      return { list: freshList, project: newProject };
    });
  }, []);

  const uploadPdf = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const projectId = currentIdRef.current;
    await idbSave(`pdf-${projectId}`, buffer);
    setPdfData(buffer);
    updateProject({
      pdfFileName: file.name,
      pdfPageNumber: 1,
      pdfTotalPages: 1,
      kitchenCrop: undefined,
      equipmentListCrop: undefined,
    });
  }, [updateProject]);

  return {
    projectList,
    currentProject,
    pdfData,
    isLoadingPdf,
    updateProject,
    switchProject,
    createProject,
    deleteProject,
    uploadPdf,
  };
}
