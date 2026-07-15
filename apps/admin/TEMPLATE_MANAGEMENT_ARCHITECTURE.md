# LumenX Admin — Template & Document Management

Enterprise architecture for the Template Management module.

## 1. Module architecture

- **Route:** `/templates` — single hub with internal views via `?view=`
- **Data:** `lib/template-management/` — types, categories, seed, localStorage store
- **UI:** `components/templates/` — hub nav, preview, views

## 2. Data structure

- `TemplateRecord` — template metadata, blocks, kind, category, version
- `TemplateBlock` — builder primitives (header, logo, variable, qr, etc.)
- `GeneratedDocument` — issued outputs with batch + certificate numbers
- `TemplateActivity` — audit trail for create/duplicate/generate/import

## 3. Workflows

**Create:** System template → duplicate → builder → save  
**Import:** Upload → detect → map variables → preview → save  
**Generate:** Template → scope (single/class/grade) → batch → Generated Documents  
**Deliver:** Download PDF · Connect · Verify QR (planned API)

## 4. Builder

Visual block editor, variable picker (`{{StudentName}}`, etc.), multi-device preview.

## 5. Phases

| Phase | Status |
|-------|--------|
| Hub + dashboard + library + builder + imports + generated | Implemented (demo) |
| PDF engine + API | Planned |
| Connect sync | Planned |
