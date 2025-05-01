import * as SQLite from 'expo-sqlite';
import { NewUsuario, NewComida, Comida, NewConsumo, Usuario, Ruta, NewRuta } from './entities'; // Add NewComida
import { Platform } from 'react-native';

const DATABASE_NAME = 'fitnessTracker.db';

const PRAGMA_SQL = `PRAGMA journal_mode = WAL;`;
const CREATE_USUARIO_SQL = `
CREATE TABLE IF NOT EXISTS Usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    edad INTEGER,
    altura REAL,
    peso REAL,
    metabolismo REAL
);`;
const CREATE_COMIDA_SQL = `
CREATE TABLE IF NOT EXISTS Comida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    valor_calorico REAL,
    descripcion TEXT
);`;
const CREATE_RUTA_SQL = `
CREATE TABLE IF NOT EXISTS Ruta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    distancia REAL,
    coordenadas TEXT,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE
);`;
const CREATE_CONSUMO_SQL = `
CREATE TABLE IF NOT EXISTS Consumo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    comida_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    cantidad REAL DEFAULT 1.0,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (comida_id) REFERENCES Comida(id) ON DELETE RESTRICT
);`;
const CREATE_INDEX_RUTA_SQL = `CREATE INDEX IF NOT EXISTS idx_ruta_usuario_fecha ON Ruta(usuario_id, fecha);`;
const CREATE_INDEX_CONSUMO_USUARIO_SQL = `CREATE INDEX IF NOT EXISTS idx_consumo_usuario_fecha ON Consumo(usuario_id, fecha);`;
const CREATE_INDEX_CONSUMO_COMIDA_SQL = `CREATE INDEX IF NOT EXISTS idx_consumo_comida ON Consumo(comida_id);`;


let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    console.log('Database already initialized.');
    return db;
  }

  try {
    console.log(`Opening database: ${DATABASE_NAME}...`);
    const openedDb = SQLite.openDatabaseSync(DATABASE_NAME);

    console.log('Database opened. Initializing schema...');

    console.log('Applying PRAGMA journal_mode=WAL...');
    await openedDb.execAsync(PRAGMA_SQL);
    console.log('PRAGMA applied.');

    console.log('Starting schema creation transaction...');
    await openedDb.withTransactionAsync(async () => {
      console.log('Creating Usuario table...');
      await openedDb.execAsync(CREATE_USUARIO_SQL);
      console.log('Creating Comida table...');
      await openedDb.execAsync(CREATE_COMIDA_SQL);
      console.log('Creating Ruta table...');
      await openedDb.execAsync(CREATE_RUTA_SQL);
      console.log('Creating Consumo table...');
      await openedDb.execAsync(CREATE_CONSUMO_SQL);
      console.log('Creating Ruta index...');
      await openedDb.execAsync(CREATE_INDEX_RUTA_SQL);
      console.log('Creating Consumo user index...');
      await openedDb.execAsync(CREATE_INDEX_CONSUMO_USUARIO_SQL);
      console.log('Creating Consumo comida index...');
      await openedDb.execAsync(CREATE_INDEX_CONSUMO_COMIDA_SQL);
    });
    console.log('Schema creation transaction completed.');

    console.log('Database schema initialized successfully.');

    // Seed initial food data if necessary
    await seedFoods(openedDb);

    db = openedDb;
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
    if (!db) {
        console.warn('Database accessed before initialization. Attempting synchronous open.');
        try {
            db = SQLite.openDatabaseSync(DATABASE_NAME);
            console.log('Synchronous database open successful (fallback).');
        } catch (syncError) {
             console.error('Failed to open database synchronously:', syncError);
             throw new Error('Database is not initialized and synchronous open failed.');
        }
    }
    return db;
}


// Function to seed initial food data
async function seedFoods(dbInstance: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Remove the check for existing foods
    // const existingFoods = await dbInstance.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Comida');
    // if (existingFoods && existingFoods.count > 0) {
    //   console.log('Food data already exists, skipping seed.');
    //   return;
    // }

    console.log('Clearing and seeding initial food data...');
    const foodsToSeed: NewComida[] = [
      { nombre: 'Apple', valor_calorico: 95, descripcion: 'Medium size' },
      { nombre: 'Banana', valor_calorico: 105, descripcion: 'Medium size' },
      { nombre: 'Chicken Breast (100g)', valor_calorico: 165, descripcion: 'Cooked' },
      { nombre: 'Broccoli (1 cup)', valor_calorico: 55, descripcion: 'Cooked' },
      { nombre: 'Rice (1 cup cooked)', valor_calorico: 205, descripcion: 'White rice' },
      { nombre: 'Salmon (100g)', valor_calorico: 208, descripcion: 'Cooked' },
      { nombre: 'Almonds (23 nuts)', valor_calorico: 164, descripcion: 'Approx 1 oz' },
      { nombre: 'Pizza Barbacoa Campofrío (410g)', valor_calorico: 278, descripcion: 'Pizza con salsa barbacoa' },
      { nombre: 'Pizza Jamón y Queso Campofrío (360g)', valor_calorico: 270, descripcion: 'Pizza de jamón y queso' },
      { nombre: 'Pizza Pepperoni Campofrío (345g)', valor_calorico: 345, descripcion: 'Pizza de pepperoni' },
      { nombre: 'Pizza 4 Quesos Campofrío (365g)', valor_calorico: 293, descripcion: 'Pizza cuatro quesos' },
      { nombre: 'Pizza Carbonara Campofrío (360g)', valor_calorico: 288, descripcion: 'Pizza carbonara' },
      { nombre: 'Pizza Atún Campofrío (360g)', valor_calorico: 360, descripcion: 'Pizza de atún y cebolla' },
      { nombre: 'Pizza Vegetal Campofrío (360g)', valor_calorico: 274, descripcion: 'Pizza con verduras' },
      { nombre: 'Pizza Jamón y Bacon Campofrío (360g)', valor_calorico: 258, descripcion: 'Pizza de jamón y bacon con salsa de cebolla caramelizada' },
      { nombre: 'Pizza Pollo Asado Campofrío (355g)', valor_calorico: 355, descripcion: 'Pizza de pollo asado con salsa de miel y mostaza' },
      { nombre: 'Pizza Mexicana Campofrío (400g)', valor_calorico: 230, descripcion: 'Pizza con carne picada y salsa chipotle' },
      { nombre: 'Pizza 5 Quesos Campofrío (360g)', valor_calorico: 360, descripcion: 'Pizza con 5 quesos y salsa de queso semicurado' },
    ];

    await dbInstance.withTransactionAsync(async () => {
      // Delete existing food data first
      console.log('Deleting existing food data...');
      await dbInstance.execAsync('DELETE FROM Comida;');
      // Optional: Reset autoincrement sequence if needed (might vary by SQLite version/implementation)
      // await dbInstance.execAsync("DELETE FROM sqlite_sequence WHERE name='Comida';");
      console.log('Inserting new seed data...');
      for (const food of foodsToSeed) {
        await dbInstance.runAsync(
          'INSERT INTO Comida (nombre, valor_calorico, descripcion) VALUES (?, ?, ?)',
          food.nombre,
          food.valor_calorico ?? null,
          food.descripcion ?? null
        );
      }
    });
    console.log('Initial food data seeded successfully.');

  } catch (error) {
    console.error('Failed to seed food data:', error);
    // Decide if this error should prevent app startup
  }
}


export async function addUser(user: NewUsuario): Promise<number> {
  const dbInstance = getDatabase();
  try {
    const result = await dbInstance.runAsync(
      'INSERT INTO Usuario (nombre, edad, altura, peso, metabolismo) VALUES (?, ?, ?, ?, ?)',
      user.nombre ?? null,
      user.edad ?? null,
      user.altura ?? null,
      user.peso ?? null,
      user.metabolismo ?? null
    );
    console.log(`User added with ID: ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to add user:', error);
    throw error;
  }
}

export async function hasUsers(): Promise<boolean> {
  const dbInstance = getDatabase();
  try {
    const result = await dbInstance.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Usuario');
    const userCount = result?.count ?? 0;
    console.log(`User count check: ${userCount}`);
    return userCount > 0;
  } catch (error) {
    console.error('Failed to check for users:', error);
    throw error;
  }
}

export async function getAllFoods(): Promise<Comida[]> {
  const dbInstance = getDatabase();
  try {
    const results = await dbInstance.getAllAsync<Comida>('SELECT * FROM Comida ORDER BY nombre');
    return results ?? [];
  } catch (error) {
    console.error('Failed to get all foods:', error);
    throw error;
  }
}

// Modified to accept an optional date string
export async function addConsumption(consumption: NewConsumo): Promise<number> {
  const dbInstance = getDatabase();
  // Use provided date or default to now, formatted correctly
  const dateToUse = consumption.fecha
    ? new Date(consumption.fecha) // Ensure it's a Date object if provided
    : new Date();
  const formattedDate = dateToUse.toISOString().slice(0, 19).replace('T', ' ');

  try {
    const result = await dbInstance.runAsync(
      'INSERT INTO Consumo (usuario_id, comida_id, fecha, cantidad) VALUES (?, ?, ?, ?)',
      consumption.usuario_id,
      consumption.comida_id,
      formattedDate, // Use formatted date (either provided or now)
      consumption.cantidad ?? 1.0
    );
    console.log(`Consumption added with ID: ${result.lastInsertRowId} for date ${formattedDate}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to add consumption:', error);
    throw error;
  }
}

// Renamed and modified to get calories for a specific date
export async function getCaloriesForDate(userId: number, date: Date): Promise<number> {
  const dbInstance = getDatabase();
  // Format the start and end of the specified date
  const dateString = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const startOfDay = dateString + ' 00:00:00';
  const endOfDay = dateString + ' 23:59:59';

  try {
    const result = await dbInstance.getFirstAsync<{ totalCalories: number }>(
      `SELECT SUM(c.cantidad * co.valor_calorico) as totalCalories
       FROM Consumo c
       JOIN Comida co ON c.comida_id = co.id
       WHERE c.usuario_id = ? AND c.fecha BETWEEN ? AND ?`,
      userId,
      startOfDay,
      endOfDay
    );
    console.log(`Calories for ${dateString}: ${result?.totalCalories ?? 0}`);
    return result?.totalCalories ?? 0;
  } catch (error) {
    console.error(`Failed to get calories for date ${dateString}:`, error);
    throw error;
  }
}

export async function getAllUsers(): Promise<Usuario[]> {
  const dbInstance = getDatabase();
  try {
    const results = await dbInstance.getAllAsync<Usuario>('SELECT id, nombre FROM Usuario ORDER BY nombre');
    return results ?? [];
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
}

export async function getUserById(userId: number): Promise<Usuario | null> {
  const dbInstance = getDatabase();
  try {
    const result = await dbInstance.getFirstAsync<Usuario>('SELECT * FROM Usuario WHERE id = ?', userId);
    return result ?? null;
  } catch (error) {
    console.error(`Failed to get user by ID ${userId}:`, error);
    throw error;
  }
}

// Save a route to the database
export async function saveRoute(route: NewRuta): Promise<number> {
  const dbInstance = getDatabase();
  try {
    const result = await dbInstance.runAsync(
      'INSERT INTO Ruta (usuario_id, fecha, distancia, coordenadas) VALUES (?, ?, ?, ?)',
      route.usuario_id,
      route.fecha,
      route.distancia ?? null,
      route.coordenadas ?? null
    );
    console.log(`Route saved with ID: ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to save route:', error);
    throw error;
  }
}

// Get all routes for a user
export async function getRoutesForUser(userId: number): Promise<Ruta[]> {
  const dbInstance = getDatabase();
  try {
    const results = await dbInstance.getAllAsync<Ruta>(
      'SELECT * FROM Ruta WHERE usuario_id = ? ORDER BY fecha DESC',
      userId
    );
    return results ?? [];
  } catch (error) {
    console.error('Failed to get routes for user:', error);
    throw error;
  }
}

// Get a specific route by ID
export async function getRouteById(routeId: number): Promise<Ruta | null> {
  const dbInstance = getDatabase();
  try {
    const result = await dbInstance.getFirstAsync<Ruta>(
      'SELECT * FROM Ruta WHERE id = ?',
      routeId
    );
    return result ?? null;
  } catch (error) {
    console.error(`Failed to get route with ID ${routeId}:`, error);
    throw error;
  }
}