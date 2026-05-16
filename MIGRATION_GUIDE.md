# 🗂️ Migración de Estructura Firestore - Documentación Completa

## Resumen de Cambios

FinanceTrack ha sido reorganizado para tener una estructura **por usuario** en lugar de una estructura global. Esto es mucho más limpio, eficiente y escalable.

---

## 📊 Estructura Anterior vs Nueva

### ❌ Estructura Anterior (Global)

```
Firestore
├── expenses/
│   ├── doc1 {userId: "user1", name: "Pizza", ...}
│   ├── doc2 {userId: "user1", name: "Gas", ...}
│   ├── doc3 {userId: "user2", name: "Movie", ...}
│
├── salaries/
│   ├── doc1 {userId: "user1", amount: 3000, ...}
│   ├── doc2 {userId: "user2", amount: 2500, ...}
│
├── credit_cards/
│   ├── doc1 {userId: "user1", ...}
│   ├── doc2 {userId: "user2", ...}
│
└── ... (más colecciones globales)
```

**Problemas:**
- ❌ Todos los datos mezclados en una colección
- ❌ Queries más complejas (necesitan where userId ==)
- ❌ Difícil de organizar visualmente
- ❌ Difícil de gestionar permisos de seguridad
- ❌ Más costoso en Firestore (más lectura)

---

### ✅ Estructura Nueva (Por Usuario)

```
Firestore
├── users/
│   ├── user1_uid/
│   │   ├── expenses/
│   │   │   ├── doc1 {name: "Pizza", ...}
│   │   │   ├── doc2 {name: "Gas", ...}
│   │   │
│   │   ├── salaries/
│   │   │   └── doc1 {amount: 3000, ...}
│   │   │
│   │   ├── credit_cards/
│   │   │   └── doc1 {...}
│   │   │
│   │   ├── card_payments/
│   │   ├── card_charges/
│   │   ├── saving_goals/
│   │   └── friends/
│   │
│   └── user2_uid/
│       ├── expenses/
│       ├── salaries/
│       └── ... (igual estructura)
```

**Ventajas:**
- ✅ Datos organizados por usuario
- ✅ Queries más simples (no necesitan where)
- ✅ Estructura visual clara
- ✅ Seguridad más fácil de implementar
- ✅ Mejor rendimiento (menos documentos por query)
- ✅ Más escalable

---

## 🔄 Pasos de Migración

### Paso 1: Preparar el Entorno

```bash
# Instalar dependencias necesarias
npm install firebase-admin tsx --save-dev

# Descargar credenciales de Firebase
# 1. Ve a: https://console.firebase.google.com/
# 2. Proyecto > Project Settings
# 3. Service Accounts > Generate New Private Key
# 4. Guarda el archivo como: serviceAccountKey.json en la raíz del proyecto
```

### Paso 2: Hacer Copia de Seguridad

```bash
# IMPORTANTE: Exporta una copia de Firestore
# Firebase Console > Firestore > Exportar/Importar > Exportar

# Guarda el backup en lugar seguro
```

### Paso 3: Ejecutar Migración

```bash
# Ejecutar el script de migración
npm run migrate

# El script mostrará:
# - Cantidad de documentos migrados por usuario
# - Verificación de éxito
# - Instrucciones de próximos pasos
```

### Paso 4: Verificar la Migración

1. **En Firebase Console:**
   ```
   Firestore > Colecciones
   - Verifica que exista: users > [userId] > [colecciones]
   - Comprueba que haya documentos en cada colección
   ```

2. **Testear la App:**
   ```bash
   npm run dev
   
   # Prueba:
   - Login
   - Crear gastos, ingresos, tarjetas
   - Editar y eliminar
   - Verificar que todo funciona correctamente
   ```

3. **Verificar Datos Específicos:**
   - Abre DevTools > Application > LocalStorage
   - Busca keys como: `ft_cache_expenses_[userId]`
   - Verifica que haya datos cacheados

### Paso 5: Deploy y Limpiar

```bash
# 1. Deploy a producción PRIMERO
npm run build
# Deploy to Vercel/Netlify

# 2. Testea en producción con usuarios reales
# 3. Una vez verificado, elimina datos antiguos en Firebase:
#    - Selecciona colección > Eliminar
#    - Colecciones a eliminar:
#      - expenses
#      - salaries
#      - credit_cards
#      - card_payments
#      - card_charges
#      - saving_goals
#      - friends
#      - cards (si existe)
#      - cardPayments (si existe)
#      - cardCharges (si existe)
#      - goals (si existe)
```

---

## 📝 Cambios en el Código

### Cambios en firestore.ts

**Antes:**
```typescript
// Guardaba en colección global
addDoc(collection(db, 'expenses'), data)
```

**Ahora:**
```typescript
// Guarda en colección por usuario
const path = `users/${userId}/expenses`
addDoc(collection(db, path), data)
```

### Cambios en las funciones delete

**Antes:**
```typescript
deleteExpense(id)  // No necesitaba userId
```

**Ahora:**
```typescript
deleteExpense(id, userId)  // Requiere userId
```

### Cambios en components

**Antes:**
```typescript
await deleteExpense(expenseId)
```

**Ahora:**
```typescript
await deleteExpense(expenseId, currentUser.uid)
```

---

## 🔒 Seguridad Firestore (Recomendado)

Una vez migrado, actualiza las reglas de seguridad para proteger datos por usuario:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla general: solo el propietario puede acceder
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Denegar acceso por defecto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ Checklist de Verificación

- [ ] Backup de Firestore completado
- [ ] Script de migración ejecutado sin errores
- [ ] Datos verificados en Firebase Console
- [ ] App testeada localmente (dev)
- [ ] Crear gasto funciona
- [ ] Editar gasto funciona
- [ ] Eliminar gasto funciona
- [ ] Lo mismo para salarios, tarjetas, metas, amigos
- [ ] Deploy a producción completado
- [ ] Testeado en producción con usuarios reales
- [ ] Datos antiguos eliminados de Firestore
- [ ] Reglas de seguridad actualizadas

---

## 🐛 Troubleshooting

### Problema: "Permission denied" después de migración

**Solución:** Las reglas de seguridad todavía permiten acceso a colecciones antiguas. Actualiza las rules en Firebase Console.

### Problema: "No data" después de migración

**Solución:** Verifica:
1. Que el script se ejecutó sin errores
2. Que los datos existan en `users/{uid}/{collection}`
3. Que el userId sea correcto (obtén de `currentUser.uid`)

### Problema: Datos no aparecen en la app

**Solución:** 
1. Limpia el caché del navegador (DevTools > Application > Storage > Clear all)
2. Reinicia la app
3. Verifica en Network que las queries van a la ubicación correcta

---

## 📚 Referencias

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Collection Structuring](https://firebase.google.com/docs/firestore/best-practices#structure_your_data)
- [Security Rules](https://firebase.google.com/docs/firestore/security/start)

---

## ❓ Preguntas Frecuentes

**P: ¿Perderé datos?**  
R: No. El script migra sin eliminar datos antiguos. Después de verificar, puedes eliminar manualmente.

**P: ¿Cuándo debo migrar?**  
R: En cualquier momento. Cuanto antes mejor, para aprovechar la mejor estructura.

**P: ¿Puedo volver atrás?**  
R: Sí, tienes el backup. Pero es mejor migrar hacia adelante.

**P: ¿Afectará a mis usuarios?**  
R: No habrá downtime. El deploy debe ser transparente.

**P: ¿Qué pasa con el cache local?**  
R: El cache se regenera automáticamente cuando los usuarios inicien sesión.

---

## 🎉 ¡Listo!

Tu aplicación ahora tiene una estructura mucho más limpia y eficiente. 

**Próximas optimizaciones recomendadas:**
1. Implementar Seguridad Firestore (rules)
2. Agregar índices de Firestore para queries complejas
3. Implementar Service Worker para PWA
4. Agregar Analytics

¿Preguntas? Revisa el código en `src/lib/firestore.ts`
