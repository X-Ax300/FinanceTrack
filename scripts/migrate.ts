/**
 * MIGRACIÓN DE DATOS - Estructura por Usuario
 * ============================================
 *
 * Este script migra todos los datos de la estructura global a una estructura por usuario.
 * 
 * Estructura Anterior:
 *   - expenses/
 *   - salaries/
 *   - credit_cards/
 *   - etc.
 *
 * Nueva Estructura:
 *   - users/{userId}/expenses/
 *   - users/{userId}/salaries/
 *   - users/{userId}/credit_cards/
 *   - etc.
 *
 * USO:
 * 1. Ve a Firebase Console
 * 2. Abre la terminal en la carpeta del proyecto
 * 3. Ejecuta: npm run migrate
 * 4. Sigue las instrucciones
 *
 * IMPORTANTE:
 * - Haz una copia de seguridad de Firestore antes de ejecutar
 * - El script solo migra datos, NO los elimina de la ubicación anterior
 * - Después de migrar, verifica que los datos estén en la nueva ubicación
 * - Una vez verificado, puedes eliminar manualmente las colecciones antiguas
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Inicializar Firebase Admin (necesita archivo de credenciales)
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Archivo de credenciales no encontrado: ${serviceAccountPath}`);
  console.error('Descárgalo desde: Firebase Console > Project Settings > Service Accounts > Generate new private key');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const COLLECTIONS = {
  expenses: 'expenses',
  salaries: 'salaries',
  cards: 'credit_cards',
  cardPayments: 'card_payments',
  cardCharges: 'card_charges',
  goals: 'saving_goals',
  friends: 'friends',
};

const LEGACY_COLLECTIONS = {
  cards: 'cards',
  cardPayments: 'cardPayments',
  cardCharges: 'cardCharges',
  goals: 'goals',
};

async function migrateCollection(collectionName: string, legacyName?: string) {
  console.log(`\n📦 Migrando colección: ${collectionName}`);
  
  // Obtener todas las colecciones (nuevas y antiguas si existen)
  const collections = [collectionName];
  if (legacyName) collections.push(legacyName);
  
  const userIds = new Set<string>();
  let totalMigrated = 0;

  // Recolectar todos los userId únicos
  for (const col of collections) {
    try {
      const snapshot = await db.collection(col).get();
      snapshot.docs.forEach((doc) => {
        const userId = doc.data().userId;
        if (userId) userIds.add(userId);
      });
    } catch (err) {
      // Colección podría no existir
    }
  }

  if (userIds.size === 0) {
    console.log(`   ℹ️  No hay documentos para migrar`);
    return 0;
  }

  // Migrar documentos por usuario
  for (const userId of userIds) {
    const userPath = `users/${userId}/${collectionName}`;
    let migratedForUser = 0;

    for (const col of collections) {
      try {
        const snapshot = await db.collection(col).where('userId', '==', userId).get();
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const newDocId = doc.id;
          
          // Evitar duplicados
          const existingDoc = await db.collection(userPath).doc(newDocId).get();
          if (!existingDoc.exists) {
            await db.collection(userPath).doc(newDocId).set(data);
            migratedForUser++;
          }
        }
      } catch (err) {
        // Colección o query podría fallar
      }
    }

    if (migratedForUser > 0) {
      console.log(`   ✓ Usuario ${userId}: ${migratedForUser} documentos migrados`);
      totalMigrated += migratedForUser;
    }
  }

  return totalMigrated;
}

async function runMigration() {
  console.log('🚀 Iniciando migración de estructura Firestore...\n');
  
  try {
    let grandTotal = 0;

    // Migrar cada colección
    for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
      const legacyName = LEGACY_COLLECTIONS[key as keyof typeof LEGACY_COLLECTIONS];
      const migrated = await migrateCollection(collectionName, legacyName);
      grandTotal += migrated;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migración completada`);
    console.log(`   Total de documentos migrados: ${grandTotal}`);
    console.log('='.repeat(50));

    console.log('\n⚠️  PRÓXIMOS PASOS:');
    console.log('1. Verifica en Firebase Console que los datos estén en users/{userId}/{collection}');
    console.log('2. Prueba la app en development para asegurar que todo funciona');
    console.log('3. IMPORTANTE: Haz un deploy de producción ANTES de eliminar datos antiguos');
    console.log('4. Una vez verificado en producción, elimina manualmente las colecciones antiguas:');
    for (const collectionName of Object.values(COLLECTIONS)) {
      console.log(`   - ${collectionName}`);
    }
    for (const collectionName of Object.values(LEGACY_COLLECTIONS)) {
      console.log(`   - ${collectionName}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();
