import { create } from 'zustand';

interface MapState {
  visibleLayerIds: Set<string>;
  highlightedLayerId: string | null;
  studentMode: boolean;
  todayLayers: string[];
  selectedPinId: string | null;
  draftPinLocation: { lat: number; lng: number } | null;
  exportMode: boolean;
  exportImage: string | null;
  
  toggleLayer: (id: string) => void;
  setStudentMode: (on: boolean) => void;
  setTodayLayers: (ids: string[]) => void;
  setHighlightedLayerId: (id: string | null) => void;
  setSelectedPinId: (id: string | null) => void;
  setDraftPinLocation: (loc: { lat: number; lng: number } | null) => void;
  setExportMode: (on: boolean) => void;
  setExportImage: (dataUrl: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  visibleLayerIds: new Set<string>(),
  highlightedLayerId: null,
  studentMode: false,
  todayLayers: [],
  selectedPinId: null,
  draftPinLocation: null,
  exportMode: false,
  exportImage: null,
  
  toggleLayer: (id) => set((state) => {
    const newSet = new Set(state.visibleLayerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { visibleLayerIds: newSet };
  }),
  
  setStudentMode: (on) => set({ studentMode: on }),
  setTodayLayers: (ids) => set({ todayLayers: ids }),
  setHighlightedLayerId: (id) => set({ highlightedLayerId: id }),
  setSelectedPinId: (id) => set({ selectedPinId: id, draftPinLocation: null, exportMode: false }),
  setDraftPinLocation: (loc) => set({ draftPinLocation: loc, selectedPinId: null, exportMode: false }),
  setExportMode: (on) => set({ exportMode: on, selectedPinId: null, draftPinLocation: null }),
  setExportImage: (dataUrl) => set({ exportImage: dataUrl }),
}));
