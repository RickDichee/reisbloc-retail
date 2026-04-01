# 📦 DISEÑO DE INVENTARIO OPTIMIZADO PARA MAYOREO TEXTIL
## Análisis y Propuesta - Reisbloc Store

---

## 🎯 PROBLEMA ACTUAL

El sistema actual está diseñado para retail unitario, no para mayoreo textil con estructuras complejas de producto.

### Problemas identificados:

| Problema | Impacto | Solución propuesta |
|----------|---------|-------------------|
| Sin soporte para modalidad de venta (pieza/paquete/bulto) | No se puede cobrar correctamente | Estructura jerárquica de producto |
| Códigos alfanuméricos no escaneables | Escaneo manual lento | Generador de códigos 100% numéricos |
| Variaciones por paquete (tallas/colores) no manejadas | Confusión en inventario | Sistema de SKUs por variant |
| Sin понятие de "bulto" | Ventas de mayoreo complicadas | Campo cantidad_bulto |
| barcode y SKU son lo mismo o se confunden | Duplicidad de datos | Roles diferenciados |

---

## 📊 MODELO PROPUESTO

### Concepto: Producto → Variantes → Unidades

```
┌─────────────────────────────────────────────────────┐
│  PRODUCTO: "Playera Básica Blanco"                 │
├─────────────────────────────────────────────────────┤
│  ID: 1001                                          │
│  SKU Padre: PLAY-BASI-BLANCO                       │
│  Modalidad: [PIEZA | PAQUETE | BULTO]            │
│  Categoría: "Playeras"                            │
├─────────────────────────────────────────────────────┤
│  VARIANTES:                                        │
│  ├─ VAR-1001-01 (Talla CH, Blanco)               │
│  │   └─ Stock: 120 piezas                         │
│  ├─ VAR-1001-02 (Talla M, Blanco)                │
│  │   └─ Stock: 85 piezas                         │
│  ├─ VAR-1001-03 (Talla G, Blanco)               │
│  │   └─ Stock: 200 piezas                         │
│  ├─ VAR-1001-04 (Talla EG, Blanco)               │
│  │   └─ Stock: 50 piezas                          │
├─────────────────────────────────────────────────────┤
│  PRECIOS:                                          │
│  ├─ Por pieza: $45.00                             │
│  ├─ Por paquete (12 pzas): $504.00                │
│  └─ Por bulto (120 pzas): $4,680.00               │
├─────────────────────────────────────────────────────┤
│  CÓDIGO DE BARRAS:                                 │
│  ├─ Pieza: 7501234567801                          │
│  ├─ Paquete: 7501234567802                         │
│  └─ Bulto: 7501234567803                           │
└─────────────────────────────────────────────────────┘
```

---

## 🔢 SISTEMA DE CÓDIGOS PROPUESTO

### Prefijo para Mayoreo Textil (750 = México):

```
╔═══════════════════════════════════════════════════════════╗
║  ESTRUCTURA DEL CÓDIGO DE BARRAS (EAN-13)             ║
╠═══════════════════════════════════════════════════════════╣
║  [750] [XXXXX] [XXX] [X]                              ║
║    │       │      │     │                              ║
║    │       │      │     └─ Dígito verificador          ║
║    │       │      └─ Modalidad (1=pieza, 2=paq, 3=blt)║
║    │       └─ ID Producto (5 dígitos)                  ║
║    └─ País (México)                                    ║
╚═══════════════════════════════════════════════════════════╝

EJEMPLO:
Producto ID: 12345
Modalidad: 1 (pieza)

Código: 750123451 + [dígito verificación]
```

### Tabla de modalidades:

| Modalidad | Código | Descripción | Equivalencia |
|-----------|--------|-------------|--------------|
| 1 | PIEZA | Venta individual | 1 unidad |
| 2 | PAQUETE | Paquete的标准 (12 pzas) | 12 unidades |
| 3 | BULTO | Mayoreo completo (120 pzas) | 120 unidades |

---

## 🏗️ ESTRUCTURA DE DATOS PROPUESTA

### Tabla: products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  
  -- Identificación
  sku_base VARCHAR(50) NOT NULL,        -- PLAY-BASI-BLANCO
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  
  -- Multimodalidad
  selling_mode VARCHAR(20) DEFAULT 'unit' CHECK (selling_mode IN ('unit', 'pack', 'bulk', 'all')),
  pieces_per_pack INT DEFAULT 12,
  pieces_per_bulk INT DEFAULT 120,
  
  -- Precios
  price_unit DECIMAL(10,2),
  price_pack DECIMAL(10,2),
  price_bulk DECIMAL(10,2),
  
  -- Precios de costo
  cost_unit DECIMAL(10,2),
  cost_pack DECIMAL(10,2),
  cost_bulk DECIMAL(10,2),
  
  -- Config
  has_variants BOOLEAN DEFAULT false,
  has_inventory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: product_variants
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Identificación de variant
  sku_variant VARCHAR(50),               -- PLAY-BASI-BLANCO-CH
  variant_name VARCHAR(100),             -- "CH - Blanco"
  
  -- Atributos (para textiles)
  size VARCHAR(20),                     -- CH, M, G, EG
  color VARCHAR(50),                    -- Blanco, Negro, Azul
  material VARCHAR(100),
  
  -- Stock
  stock_unit INT DEFAULT 0,
  
  -- Precio override (opcional)
  price_modifier DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: barcodes
```sql
CREATE TABLE product_barcodes (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  
  barcode VARCHAR(50) UNIQUE NOT NULL,
  barcode_type VARCHAR(20) DEFAULT 'EAN13',  -- EAN13, CODE128, QR
  selling_mode VARCHAR(20) NOT NULL,        -- unit, pack, bulk
  
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📱 FLUJO EN POS PROPUESTO

### Al escanear un barcode:

```
ESCANEO: 750123451

         ↓
    ┌────────────┐
    │ PRODUCTO   │
    │ ID: 12345 │
    └────────────┘
         ↓
    ┌─────────────────────────────────┐
    │ MODALIDADES DISPONIBLES:       │
    │                                 │
    │ ┌─────┐ ┌────────┐ ┌────────┐ │
    │ │ PIECE│ │ PACK   │ │ BULK   │ │
    │ │ $45  │ │ $504   │ │ $4,680 │ │
    │ │ 1pc  │ │ 12pcs  │ │ 120pcs │ │
    │ │[ADD] │ │ [ADD]  │ │ [ADD]  │ │
    │ └─────┘ └────────┘ └────────┘ │
    │                                 │
    │ Variant: CH (Stock: 85)         │
    │ Variants: CH | M | G | EG      │
    └─────────────────────────────────┘
```

---

## 🎨 UI PROPUESTA - MODAL DE PRODUCTO

```
┌─────────────────────────────────────────────────────────┐
│  ✕                                                    │
│                                                         │
│  Nombre del Producto                                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Playera Básica                                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  Categoría                                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Playeras                                    ▼    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ════════════════════════════════════════════════════════ │
│  MODALIDADES DE VENTA                                  │
│  ════════════════════════════════════════════════════════ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ☑ Pieza          | Paquete          | Bulto     │  │
│  │   $45.00         | $504.00 (12p)    | $4680 (120p)│  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ════════════════════════════════════════════════════════ │
│  VARIANTES (Tallas/Colores)                            │
│  ════════════════════════════════════════════════════════ │
│                                                         │
│  Tallas:  [CH] [M] [G] [EG]                           │
│  Color:   [Blanco] [Negro] [Azul] [Rojo]              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ CH - Blanco     Stock: 85      $45.00           │  │
│  │ M - Blanco     Stock: 120      $45.00           │  │
│  │ G - Blanco     Stock: 200      $45.00           │  │
│  │ EG - Blanco    Stock: 50       $45.00           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ════════════════════════════════════════════════════════ │
│  CÓDIGOS DE BARRAS                                     │
│  ════════════════════════════════════════════════════════ │
│                                                         │
│  Pieza:    7501234517801  [Generar] [Imprimir]        │
│  Paquete:  7501234527801  [Generar] [Imprimir]        │
│  Bulto:    7501234537801  [Generar] [Imprimir]        │
│                                                         │
│         [Cancelar]              [Guardar Producto]   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE VENTA PROPUESTO

### POS - Agregar al carrito:

```
STEP 1: Escanear o buscar producto
        ↓
STEP 2: Seleccionar modalidad
        ┌────────────────────────────────────┐
        │ Selecciona cómo vender:           │
        │ [PIEZA] [PAQUETE] [BULTO]       │
        │                                    │
        │ o ingresa cantidad: [____] pzas   │
        └────────────────────────────────────┘
        ↓
STEP 3: Seleccionar variant (si aplica)
        ┌────────────────────────────────────┐
        │ Talla: [CH] [M] [G] [EG]         │
        │ Color: [Blanco]                   │
        └────────────────────────────────────┘
        ↓
STEP 4: Confirmar y agregar
        ┌────────────────────────────────────┐
        │ Playera Básica - CH Blanco         │
        │ Paquete x12 ................ $504  │
        │ ─────────────────────────────────  │
        │        [AGREGAR AL CARRITO]        │
        └────────────────────────────────────┘
```

---

## 📊 REPORTES PROPUESTOS

### Reporte de Mayoreo:

```
╔═══════════════════════════════════════════════════════════╗
║  REPORTE DE VENTAS - MOROLEÓN                          ║
║  Periodo: 01-04-2026 al 07-04-2026                    ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  VENTAS POR MODALIDAD:                                  ║
║  ┌─────────────┬──────────┬──────────┬──────────────┐   ║
║  │ Modalidad   │ Cantidad│ Monto    │ % del Total  │   ║
║  ├─────────────┼──────────┼──────────┼──────────────┤   ║
║  │ PIEZA       │ 1,245   │ $56,025  │ 45%         │   ║
║  │ PAQUETE     │ 380     │ $191,520 │ 55%         │   ║
║  │ BULTO       │ 15      │ $70,200  │ 20%         │   ║
║  └─────────────┴──────────┴──────────┴──────────────┘   ║
║                                                           ║
║  TOP PRODUCTOS VENDIDOS:                                 ║
║  1. Playera Básica - CH (Paq) - 45 paquetes            ║
║  2. Camisa Formal - M (Pza) - 120 piezas              ║
║  3. Suéter Invernal - EG (Blt) - 8 bulones           ║
║                                                           ║
║  ALERTAS DE INVENTARIO:                                 ║
║  ⚠️ Playera Básica CH - Stock bajo (15 pzas)           ║
║  ⚠️ Suéter Invernal EG - Agotado                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🚀 IMPLEMENTACIÓN PRIORIZADA

### Fase 1: Core (Crítico)
- [ ] Agregar campos selling_mode a products
- [ ] Agregar precio por modalidad
- [ ] Modificar POS para selector de modalidad
- [ ] Generador de códigos de barras multimodalidad

### Fase 2: Variants
- [ ] Crear tabla product_variants
- [ ] UI de variants en producto
- [ ] Selector de variant en POS
- [ ] Stock por variant

### Fase 3: Reportes
- [ ] Reporte por modalidad
- [ ] Reporte por variant
- [ ] Alertas de stock mejorado

### Fase 4: Optimización
- [ ] Importación masiva optimizada
- [ ] Escaneo rápido por modalidad
- [ ] Atajos de teclado

---

## 📝 NOTAS PARA EL DESARROLLO

### Cálculo de dígito verificador EAN-13:
```javascript
function calculateEAN13CheckDigit(code) {
  const digits = code.replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}
```

### Generación de código multimodalidad:
```javascript
function generateBarcode(productId, mode) {
  const prefix = '750';  // México
  const productCode = String(productId).padStart(5, '0');
  const modeCode = mode === 'unit' ? '1' : mode === 'pack' ? '2' : '3';
  const partial = prefix + productCode + modeCode;
  return partial + calculateEAN13CheckDigit(partial);
}
```

---

*Documento de diseño - Reisbloc Store 2026*
