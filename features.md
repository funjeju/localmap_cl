# LocalMap — Implemented Features

**Status**: As of 2026-05-24

This document tracks all features currently working in the application.

---

## Core Map & Layers

### ✅ MapLibre GL JS Base Integration
- **Status**: Working
- **Location**: `components/map/MapCanvas.tsx`, `components/map/PinLayer.tsx`
- **Details**:
  - Base map rendering with Protomaps `.pmtiles` tiles
  - White/clean map style (roads, water, boundaries only)
  - Pin layer with Firestore real-time data sync
  - MapLibre Source + Filter-based layer visibility toggle

### ✅ Layer Filter Panel (Sidebar)
- **Status**: Working
- **Location**: `components/map/LayerFilterPanel.tsx`
- **Details**:
  - Displays all user-created layers with checkboxes
  - Real-time layer visibility toggle via Zustand store
  - Heritage layer ("지정 문화재") special section
  - Activity feed integration
  - New layer creation modal with name, color, icon selection

### ✅ Kakao Maps Integration
- **Status**: Working
- **Location**: `components/map/KakaoMapCanvas.tsx`, `stores/mapStore.ts`
- **Details**:
  - SDK loading with `autoload=false` + explicit `kakao.maps.load()` callback
  - Polling fallback for SDK initialization edge cases
  - ResizeObserver for proper map relayout
  - Map type switching (일반/스카이뷰/하이브리드)
  - Overlay support (traffic, bicycle, terrain, use_district)
  - Place category search (14 categories with custom colored markers)
  - Kakao Maps Controls sidebar component

### ✅ Map Mode Toggle
- **Status**: Working
- **Location**: `stores/mapStore.ts`, `lib/hooks/useMapMode.ts`
- **Details**:
  - Toggle between PMTiles (MapLibre) and Kakao Maps
  - Persistent state in Zustand
  - Conditional rendering of map components
  - Kakao controls only visible in Kakao mode

### ✅ Kakao Maps Place Categories
- **Status**: Working
- **Location**: `components/map/KakaoMapCanvas.tsx`
- **Details**:
  - 14 categories: FD6 (음식점), CE7 (카페), AT4 (관광명소), CT1 (문화시설), AD5 (숙박), PS3 (주차), OL (주유소), MT1 (대중교통), BK9 (은행), PK6 (공원), SC4 (학교), AC5 (약국), HP8 (병원), RS2 (카지노)
  - Category search with custom colored markers
  - Toggle each category on/off in sidebar
  - Emoji icons for visual identification

---

## Sketch Map / AI Features

### ✅ Sketch Map Generation (약도 만들기)
- **Status**: Working
- **Location**: `components/map/MapExportUI.tsx`, `lib/ai/gemini.ts`, `app/api/ai/generate-sketch-map/route.ts`
- **Details**:
  - Desktop mode: Drag-to-select rectangle with crosshair cursor
  - Mobile mode: Fixed 16:9 landscape crop box (draggable)
  - Minimum selection size: 80x80 pixels
  - Four style options:
    - Illustration (travel journal style, warm pastels)
    - Watercolor (soft dreamy feel)
    - Sketch (B&W pencil, crisp lines)
    - Cartoon (bright, bold, exaggerated)
  - Optional extra prompt field
  - AI generation using Google Gemini 3.1 Flash Image Preview
  - Result modal showing original vs AI-generated comparison
  - Download functionality with timestamp filename
  - State machine: 'select' → 'generating' → 'result'

### ✅ Map Capture Mechanism
- **Status**: Working
- **Details**:
  - PMTiles maps: Direct canvas capture via `map.getCanvas()`
  - Other maps (Kakao, fallback): html-to-image library capture
  - Device pixel ratio scaling for high-DPI screens
  - Excludes overlay UI elements from capture

### ✅ Google Gemini Integration
- **Status**: Working
- **Location**: `lib/ai/gemini.ts`
- **Details**:
  - Singleton GoogleGenAI client initialization
  - Image-to-image generation with text prompts
  - Support for base64 image input
  - MIME type preservation
  - Error handling and fallback messages
  - Environment variable: `GEMINI_API_KEY`

### ✅ API Endpoint for Sketch Map
- **Status**: Working
- **Location**: `app/api/ai/generate-sketch-map/route.ts`
- **Details**:
  - POST endpoint accepting imageBase64, mimeType, style, extraPrompt
  - Node.js runtime (60-second timeout)
  - Response: imageDataUrl in data:image/* format
  - Error responses with user-friendly messages (Korean)

---

## Firebase Integration

### ✅ Firestore Real-time Sync
- **Status**: Working
- **Location**: `components/map/LayerFilterPanel.tsx`, `components/map/PinLayer.tsx`
- **Details**:
  - Real-time listeners for layers and pins
  - Automatic sort by layer order
  - onSnapshot subscriptions with cleanup

### ✅ Firestore Data Model (Partial)
- **Status**: Partially Implemented
- **Details**:
  - Tenant structure defined
  - Layer schema with id, tenantId, name (LocalizedText), icon, color, order
  - Pin schema with id, tenantId, layerId, name, location, description, images
  - Firestore collection: `tenants/{tenantId}/layers`

---

## State Management

### ✅ Zustand Store (mapStore)
- **Status**: Working
- **Location**: `stores/mapStore.ts`
- **Details**:
  - `visibleLayerIds`: Set of currently visible layer IDs
  - `toggleLayer(id)`: Toggle layer visibility
  - `mapMode`: 'pmtiles' | 'kakao'
  - `kakaoMapType`: 'roadmap' | 'skyview' | 'hybrid'
  - `setKakaoMapType(type)`: Update map type
  - `kakaoOverlays`: Record of overlay toggle states
  - `toggleKakaoOverlay(overlayId)`: Toggle overlay
  - `kakaoCategories`: Record of category toggle states
  - `toggleKakaoCategory(categoryCode)`: Toggle place category
  - `showHeritageLayer`: Toggle for 지정 문화재 layer

---

## UI Components

### ✅ LayerFilterPanel
- **Status**: Working
- **Location**: `components/map/LayerFilterPanel.tsx`
- **Features**:
  - Layer list with checkboxes
  - Heritage layer special section
  - Kakao Map Controls (conditional render in Kakao mode)
  - Activity feed at bottom
  - New layer creation modal
  - Tailwind CSS with full responsiveness

### ✅ KakaoMapControls
- **Status**: Working
- **Location**: `components/map/KakaoMapControls.tsx`
- **Features**:
  - Map Type selector (radio buttons: 일반/스카이뷰/하이브리드)
  - Overlays section with checkboxes
  - Place Categories section with emoji + color-coded checkboxes
  - Consistent styling with LayerFilterPanel

### ✅ MapExportUI
- **Status**: Working
- **Location**: `components/map/MapExportUI.tsx`
- **Features**:
  - Desktop drag-to-select UI
  - Mobile fixed-aspect crop box
  - Style selector with descriptions/tooltips
  - Extra prompt textarea
  - Loading state with spinner
  - Result preview modal
  - Download button with filename generation

---

## API Routes

### ✅ POST /api/ai/generate-sketch-map
- **Status**: Working
- **Location**: `app/api/ai/generate-sketch-map/route.ts`
- **Input**: `{ imageBase64, mimeType, style, extraPrompt }`
- **Output**: `{ imageDataUrl: string }`
- **Error Handling**: Returns 400 (bad input), 500 (generation failed)

---

## Dependencies & Infrastructure

### ✅ External Libraries
- **google/genai**: Google Gemini API client
- **html-to-image**: DOM-to-image capture (handles modern CSS)
- **maplibre-gl**: Base map rendering
- **pmtiles**: Protomaps tile protocol
- **zustand**: State management
- **firebase**: Firestore integration
- **next.js 14+**: Framework
- **tailwindcss v4**: Styling

### ✅ Environment Variables
- `GEMINI_API_KEY`: Required for sketch map generation
- `KAKAO_MAPS_APP_KEY`: Kakao Maps SDK key (if using Kakao)
- Firebase config (if using Firebase)

---

## Testing & Quality

### ✅ TypeScript
- **Status**: Fully typed
- **Exit Code**: 0 (all type checks pass)
- All components, stores, and utilities have proper type annotations

---

## Documentation

### ✅ Code Documentation
- Inline comments for complex logic (SDK loading, capture mechanism, etc.)
- Function signatures with TypeScript types
- Component prop interfaces

### ✅ Configuration Files
- `AGENTS.md`: Project instructions
- `docs/` folder: Complete feature specifications

---

## Known Working Flows

### ✅ Sketch Map Creation (Complete)
1. User clicks "약도 만들기" button
2. MapExportUI opens in 'select' mode
3. User selects region (drag on desktop, adjust box on mobile)
4. User chooses style and optional extra prompt
5. Click "생성" button → State changes to 'generating'
6. API calls /api/ai/generate-sketch-map with canvas capture
7. Gemini generates AI illustration
8. Result shown in modal with side-by-side comparison
9. User can download original or AI version
10. Can close modal or start new selection

### ✅ Map Mode Switching
1. User has toggle/button to switch between PMTiles and Kakao
2. Store updates `mapMode` state
3. Map component unmounts/remounts appropriately
4. Kakao controls only visible in Kakao mode

### ✅ Kakao Maps Feature Usage
1. Map loads with Kakao SDK
2. User toggles map type (일반/스카이뷰/하이브리드)
3. Place categories can be toggled on/off
4. Overlays (traffic, etc.) can be toggled
5. Custom colored markers appear for place search results

### ✅ Layer Management
1. User sees list of layers in sidebar
2. Toggling checkbox updates Zustand store
3. MapLibre source filter updates immediately
4. Heritage layer has separate section

---

## Performance Notes

- **Canvas Capture**: Handled with `preserveDrawingBuffer: true` for MapLibre
- **Device Pixel Ratio**: Properly scaled for high-DPI displays
- **Realtime Sync**: Uses Firebase onSnapshot listeners
- **State Management**: Zustand store for minimal re-renders

---

## Deployment Readiness

- ✅ TypeScript compiles without errors
- ✅ All required API routes implemented
- ✅ Environment variables documented
- ✅ Dependencies installed
- ⚠️ Requires: `GEMINI_API_KEY` in `.env.local` and Vercel environment variables to work in production

---

**Last Updated**: 2026-05-24
**Maintainer**: funjeju
