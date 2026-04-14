# 🚀 Setup GitHub - Reisbloc POS

## Pasos para Conectar con GitHub

### 1. Crear Repositorio en GitHub

1. Ve a [github.com](https://github.com)
2. Haz clic en "+" en la esquina superior derecha
3. Selecciona "New repository"
4. Nombre: `TPV_solutions`
5. Descripción: `POS Restaurante profesional con control de inventario, seguridad de dispositivos y transparencia en pagos`
6. Elige: **Public** o **Private** (recomendado: Private para proyectos de negocios)
7. NO selecciones "Initialize this repository with a README"
8. Haz clic en "Create repository"

### 2. Conectar Repositorio Local con GitHub

```bash
cd /path/to/project

# Cambiar rama de 'master' a 'main' (opcional pero recomendado)
git branch -M main

# Añadir remoto
git remote add origin https://github.com/tu_usuario/reisbloc-pos.git

# Verificar que el remoto está configurado
git remote -v
```

**Esperado:**
```
origin  https://github.com/tu_usuario/reisbloc-pos.git (fetch)
origin  https://github.com/tu_usuario/reisbloc-pos.git (push)
```

### 3. Hacer Push del Repositorio

```bash
# Push del código
git push -u origin main
```

## Estructura de Ramas Recomendada

```
main
├── development
│   ├── feature/device-management
│   ├── feature/clip-integration
│   ├── feature/pos-interface
│   └── bugfix/...
└── releases
    ├── v1.0.0
    └── v1.1.0
```

## Configuración de GitHub Recomendada

### 1. Branch Protection Rules
1. Ir a Settings → Branches
2. Añadir regla para `main`:
   - ✓ Require pull request reviews before merging
   - ✓ Dismiss stale pull request approvals when new commits are pushed
   - ✓ Require status checks to pass before merging

### 2. Secrets y Variables
1. Settings → Secrets and variables → Actions
2. Añadir secretos para CI/CD:
   ```
   FIREBASE_CONFIG_JSON
   CLIP_API_KEY
   CLIP_MERCHANT_ID
   ```

### 3. .gitignore (Ya existe)
El archivo `.gitignore` ya está configurado para excluir:
- `node_modules/`
- `.env.local`
- `.firebase/`
- Archivos de logs

## Workflow Recomendado

### Crear nueva rama para feature
```bash
# Actualizar main
git checkout main
git pull origin main

# Crear rama de feature
git checkout -b feature/nombre-feature

# Hacer cambios
# ...

# Commit
git add .
git commit -m "type: descripcion

- Detalle 1
- Detalle 2"

# Push
git push origin feature/nombre-feature
```

### Crear Pull Request
1. Ve a GitHub
2. Haz clic en "Compare & pull request"
3. Escribe descripción clara
4. Pide review
5. Merge cuando esté aprobado

## Tipos de Commits (Conventional Commits)

```
feat:     Nueva característica
fix:      Arreglo de bug
docs:     Cambios en documentación
style:    Cambios de formato/estilo
refactor: Refactorización de código
perf:     Mejoras de performance
test:     Añadir o mejorar tests
chore:    Cambios en build/dependencies
```

### Ejemplos

```bash
git commit -m "feat: agregar sistema de registro de dispositivos"
git commit -m "fix: corregir validación de PIN"
git commit -m "docs: actualizar guía de seguridad"
git commit -m "feat: integración con terminal Clip"
git commit -m "feat: cálculo automático de propinas en cierre"
git commit -m "fix: problema con restricción de tiempo en productos"
```

## GitHub Actions (CI/CD)

Crear archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_CONFIG_JSON }}
          channelId: live
          projectId: your-project-id
```

## Checklist Final

- [ ] Repositorio creado en GitHub
- [ ] Local repository conectado con `git remote add origin`
- [ ] Code pushed a GitHub (`git push -u origin main`)
- [ ] Rama protegida configurada
- [ ] Secretos añadidos en GitHub
- [ ] `.gitignore` funciona correctamente
- [ ] Documentación actualizada
- [ ] Primeros colaboradores invitados (si aplica)

## URLs Importantes

- Repositorio: `https://github.com/tu_usuario/reisbloc-pos`
- Issues: `https://github.com/tu_usuario/reisbloc-pos/issues`
- Pull Requests: `https://github.com/tu_usuario/reisbloc-pos/pulls`
- Projects: `https://github.com/tu_usuario/reisbloc-pos/projects`

## Gestión de Issues

### Crear Issue para cada feature

```
# Título
[FEATURE] Sistema de Gestión de Dispositivos

# Descripción
## Descripción
Implementar sistema completo de registro y gestión de dispositivos para seguridad

## Requisitos
- [ ] Capturar MAC address/fingerprint
- [ ] Registro en Firestore
- [ ] Validación en login
- [ ] Panel de admin para aprobación
- [ ] Auditoría de acceso

## Aceptación
- Nuevo dispositivo no puede acceder hasta aprobación
- Admin puede revocar acceso
- Se registra cada login exitoso y fallido

## Prioridad
Alta
```

## Collaborators

Para añadir colaboradores:
1. Settings → Collaborators
2. Click "Add people"
3. Buscar usuario de GitHub
4. Asignar permisos

---

**Última actualización**: 21 de enero de 2026
