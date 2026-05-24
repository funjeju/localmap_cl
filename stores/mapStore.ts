import { create } from 'zustand';

type MapMode = 'pmtiles' | 'kakao';
export type KakaoMapType = 'roadmap' | 'skyview' | 'hybrid';
export type KakaoOverlay = 'traffic' | 'bicycle' | 'terrain' | 'use_district';

interface MapState {
  visibleLayerIds: Set<string>;
  highlightedLayerId: string | null;
  studentMode: boolean;
  todayLayers: string[];
  selectedPinId: string | null;
  draftPinLocation: { lat: number; lng: number } | null;
  exportMode: boolean;
  exportImage: string | null;
  showHeritageLayer: boolean;
  showPinEditor: boolean;
  allLayerIds: string[];
  hasFilterApplied: boolean;
  mapMode: MapMode;
  kakaoMapType: KakaoMapType;
  kakaoOverlays: Set<KakaoOverlay>;
  kakaoCategories: Set<string>;

  toggleLayer: (id: string) => void;
  setStudentMode: (on: boolean) => void;
  setTodayLayers: (ids: string[]) => void;
  setHighlightedLayerId: (id: string | null) => void;
  setSelectedPinId: (id: string | null) => void;
  setDraftPinLocation: (loc: { lat: number; lng: number } | null) => void;
  setExportMode: (on: boolean) => void;
  setExportImage: (dataUrl: string | null) => void;
  setShowHeritageLayer: (show: boolean) => void;
  setShowPinEditor: (show: boolean) => void;
  setAllLayerIds: (ids: string[]) => void;
  setMapMode: (mode: MapMode) => void;
  setKakaoMapType: (t: KakaoMapType) => void;
  toggleKakaoOverlay: (o: KakaoOverlay) => void;
  toggleKakaoCategory: (code: string) => void;
  resetFilters: () => void;
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
  showHeritageLayer: false,
  showPinEditor: false,
  allLayerIds: [],
  hasFilterApplied: false,
  mapMode: 'pmtiles',
  kakaoMapType: 'roadmap',
  kakaoOverlays: new Set<KakaoOverlay>(),
  kakaoCategories: new Set<string>(),

  toggleLayer: (id) => set((state) => {
    const newSet = new Set(state.visibleLayerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { visibleLayerIds: newSet, hasFilterApplied: true };
  }),

  setStudentMode: (on) => set({ studentMode: on }),
  setTodayLayers: (ids) => set({ todayLayers: ids }),
  setHighlightedLayerId: (id) => set({ highlightedLayerId: id }),
  setSelectedPinId: (id) => set({ selectedPinId: id, draftPinLocation: null, exportMode: false }),
  setDraftPinLocation: (loc) => set({ draftPinLocation: loc, selectedPinId: null, exportMode: false }),
  setExportMode: (on) => set({ exportMode: on, selectedPinId: null, draftPinLocation: null }),
  setExportImage: (dataUrl) => set({ exportImage: dataUrl }),
  setShowHeritageLayer: (show) => set({ showHeritageLayer: show }),
  setShowPinEditor: (show) => set({ showPinEditor: show }),
  setAllLayerIds: (ids) => set({ allLayerIds: ids }),
  setMapMode: (mode) => set({ mapMode: mode }),
  setKakaoMapType: (t) => set({ kakaoMapType: t }),
  toggleKakaoOverlay: (o) => set((state) => {
    const next = new Set(state.kakaoOverlays);
    if (next.has(o)) next.delete(o); else next.add(o);
    return { kakaoOverlays: next };
  }),
  toggleKakaoCategory: (code) => set((state) => {
    const next = new Set(state.kakaoCategories);
    if (next.has(code)) next.delete(code); else next.add(code);
    return { kakaoCategories: next };
  }),
  resetFilters: () => set({ visibleLayerIds: new Set<string>(), hasFilterApplied: false }),
}));
