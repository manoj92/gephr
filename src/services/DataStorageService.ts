import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { LerobotDataPoint, GestureData, HandPose } from '../types';

export interface DataExportOptions {
  format: 'lerobot' | 'json' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  compression?: boolean;
}

export class DataStorageService {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'humanoid_training.db';
  private isInitialized = false;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS gestures (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        confidence REAL,
        timestamp INTEGER,
        start_time INTEGER,
        end_time INTEGER,
        duration INTEGER,
        task_type TEXT,
        environment TEXT,
        user_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS hand_poses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gesture_id TEXT,
        handedness TEXT,
        confidence REAL,
        timestamp INTEGER,
        landmarks TEXT, -- JSON encoded HandKeypoint[]
        FOREIGN KEY (gesture_id) REFERENCES gestures (id)
      );

      CREATE TABLE IF NOT EXISTS lerobot_data_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gesture_id TEXT,
        observation TEXT, -- JSON encoded LerobotObservation
        action TEXT, -- JSON encoded LerobotAction
        reward REAL,
        done BOOLEAN,
        metadata TEXT, -- JSON encoded metadata
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (gesture_id) REFERENCES gestures (id)
      );

      CREATE TABLE IF NOT EXISTS training_sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        robot_type TEXT,
        total_gestures INTEGER DEFAULT 0,
        total_data_points INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        skill_level INTEGER DEFAULT 1,
        total_recordings INTEGER DEFAULT 0,
        total_training_time INTEGER DEFAULT 0,
        achievements TEXT, -- JSON encoded array
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_gestures_timestamp ON gestures(timestamp);
      CREATE INDEX IF NOT EXISTS idx_gestures_user_id ON gestures(user_id);
      CREATE INDEX IF NOT EXISTS idx_hand_poses_gesture_id ON hand_poses(gesture_id);
      CREATE INDEX IF NOT EXISTS idx_lerobot_data_points_gesture_id ON lerobot_data_points(gesture_id);
    `;

    await this.db.execAsync(createTablesSQL);
    console.log('Database tables created successfully');
  }

  /**
   * Store a gesture with its hand poses
   */
  public async storeGesture(gesture: GestureData, userId: string = 'anonymous'): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      console.error('Database not initialized');
      return false;
    }

    try {
      // Start transaction
      await this.db.execAsync('BEGIN TRANSACTION');

      // Insert gesture
      await this.db.runAsync(
        `INSERT INTO gestures (id, type, confidence, timestamp, start_time, end_time, duration, task_type, environment, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gesture.id,
          gesture.type,
          gesture.confidence,
          gesture.timestamp,
          gesture.startTime,
          gesture.endTime || 0,
          gesture.duration || 0,
          gesture.taskType || null,
          JSON.stringify(gesture.environment),
          userId
        ]
      );

      // Insert hand poses
      for (const pose of gesture.poses) {
        await this.db.runAsync(
          `INSERT INTO hand_poses (gesture_id, handedness, confidence, timestamp, landmarks)
           VALUES (?, ?, ?, ?, ?)`,
          [
            gesture.id,
            pose.handedness,
            pose.confidence,
            pose.timestamp,
            JSON.stringify(pose.landmarks)
          ]
        );
      }

      await this.db.execAsync('COMMIT');
      console.log(`Gesture ${gesture.id} stored successfully`);
      return true;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Failed to store gesture:', error);
      return false;
    }
  }

  /**
   * Store LeRobot data point
   */
  public async storeLerobotDataPoint(dataPoint: LerobotDataPoint, gestureId: string): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      console.error('Database not initialized');
      return false;
    }

    try {
      await this.db.runAsync(
        `INSERT INTO lerobot_data_points (gesture_id, observation, action, reward, done, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          gestureId,
          JSON.stringify(dataPoint.observation),
          JSON.stringify(dataPoint.action),
          dataPoint.reward || 0,
          dataPoint.done,
          JSON.stringify(dataPoint.metadata)
        ]
      );

      console.log('LeRobot data point stored successfully');
      return true;
    } catch (error) {
      console.error('Failed to store LeRobot data point:', error);
      return false;
    }
  }

  /**
   * Retrieve gestures with optional filters
   */
  public async getGestures(options: {
    userId?: string;
    gestureType?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<GestureData[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      let query = 'SELECT * FROM gestures WHERE 1=1';
      const params: any[] = [];

      if (options.userId) {
        query += ' AND user_id = ?';
        params.push(options.userId);
      }

      if (options.gestureType) {
        query += ' AND type = ?';
        params.push(options.gestureType);
      }

      if (options.startDate) {
        query += ' AND timestamp >= ?';
        params.push(options.startDate.getTime());
      }

      if (options.endDate) {
        query += ' AND timestamp <= ?';
        params.push(options.endDate.getTime());
      }

      query += ' ORDER BY timestamp DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }

      const result = await this.db.getAllAsync(query, params);
      
      // Convert database rows to GestureData objects
      const gestures: GestureData[] = [];
      for (const row: any of result) {
        const poses = await this.getHandPosesForGesture(row.id);
        
        gestures.push({
          id: row.id,
          type: row.type,
          confidence: row.confidence,
          timestamp: row.timestamp,
          startTime: row.start_time,
          endTime: row.end_time,
          duration: row.duration,
          taskType: row.task_type,
          environment: row.environment ? JSON.parse(row.environment) : null,
          handPoses: poses, // Legacy field
          poses: poses
        });
      }

      return gestures;
    } catch (error) {
      console.error('Failed to retrieve gestures:', error);
      return [];
    }
  }

  private async getHandPosesForGesture(gestureId: string): Promise<HandPose[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM hand_poses WHERE gesture_id = ? ORDER BY timestamp',
        [gestureId]
      );

      return result.map((row: any) => ({
        landmarks: JSON.parse(row.landmarks),
        handedness: row.handedness,
        confidence: row.confidence,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Failed to get hand poses:', error);
      return [];
    }
  }

  /**
   * Export data in various formats
   */
  public async exportData(options: DataExportOptions): Promise<string | null> {
    try {
      const gestures = await this.getGestures({
        startDate: options.dateRange?.start,
        endDate: options.dateRange?.end
      });

      let exportData: any;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'lerobot':
          exportData = await this.exportLerobotFormat(gestures);
          filename = `lerobot_dataset_${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        case 'json':
          exportData = {
            meta: {
              exportDate: new Date().toISOString(),
              totalGestures: gestures.length,
              includeMetadata: options.includeMetadata
            },
            gestures: options.includeMetadata ? gestures : gestures.map(g => ({
              id: g.id,
              type: g.type,
              confidence: g.confidence,
              poses: g.poses
            }))
          };
          filename = `gestures_export_${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        case 'csv':
          exportData = this.convertToCSV(gestures);
          filename = `gestures_export_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Write to file
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const content = typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2);
      
      await FileSystem.writeAsStringAsync(fileUri, content);
      console.log(`Data exported to: ${fileUri}`);
      
      return fileUri;
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  private async exportLerobotFormat(gestures: GestureData[]): Promise<any> {
    const dataPoints: LerobotDataPoint[] = [];

    for (const gesture of gestures) {
      const lerobotPoints = await this.db?.getAllAsync(
        'SELECT * FROM lerobot_data_points WHERE gesture_id = ?',
        [gesture.id]
      );

      if (lerobotPoints) {
        for (const point of lerobotPoints) {
          dataPoints.push({
            observation: JSON.parse(point.observation),
            action: JSON.parse(point.action),
            reward: point.reward,
            done: Boolean(point.done),
            metadata: JSON.parse(point.metadata)
          });
        }
      }
    }

    return {
      info: {
        total_episodes: gestures.length,
        total_frames: dataPoints.length,
        fps: 30,
        created_at: new Date().toISOString(),
        format_version: '1.0.0'
      },
      data: dataPoints
    };
  }

  private convertToCSV(gestures: GestureData[]): string {
    const headers = ['id', 'type', 'confidence', 'timestamp', 'duration', 'handedness', 'num_landmarks'];
    const rows = [headers.join(',')];

    for (const gesture of gestures) {
      for (const pose of gesture.poses) {
        rows.push([
          gesture.id,
          gesture.type,
          gesture.confidence,
          gesture.timestamp,
          gesture.duration || 0,
          pose.handedness,
          pose.landmarks.length
        ].join(','));
      }
    }

    return rows.join('\n');
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalGestures: number;
    totalHandPoses: number;
    totalDataPoints: number;
    databaseSize: number;
  }> {
    if (!this.db || !this.isInitialized) {
      return { totalGestures: 0, totalHandPoses: 0, totalDataPoints: 0, databaseSize: 0 };
    }

    try {
      const gesturesCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM gestures');
      const handPosesCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM hand_poses');
      const dataPointsCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM lerobot_data_points');

      // Get database file size
      const dbPath = `${FileSystem.documentDirectory}SQLite/${this.dbName}`;
      let databaseSize = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        databaseSize = fileInfo.exists ? fileInfo.size || 0 : 0;
      } catch (error) {
        console.warn('Could not get database file size:', error);
      }

      return {
        totalGestures: (gesturesCount as any)?.count || 0,
        totalHandPoses: (handPosesCount as any)?.count || 0,
        totalDataPoints: (dataPointsCount as any)?.count || 0,
        databaseSize
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { totalGestures: 0, totalHandPoses: 0, totalDataPoints: 0, databaseSize: 0 };
    }
  }

  /**
   * Clear all data (use with caution)
   */
  public async clearAllData(): Promise<boolean> {
    if (!this.db || !this.isInitialized) return false;

    try {
      await this.db.execAsync('BEGIN TRANSACTION');
      await this.db.execAsync('DELETE FROM lerobot_data_points');
      await this.db.execAsync('DELETE FROM hand_poses');
      await this.db.execAsync('DELETE FROM gestures');
      await this.db.execAsync('DELETE FROM training_sessions');
      await this.db.execAsync('DELETE FROM user_progress');
      await this.db.execAsync('COMMIT');

      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Store encrypted sensitive data
   */
  public async storeSecureData(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error('Failed to store secure data:', error);
      return false;
    }
  }

  /**
   * Retrieve encrypted sensitive data
   */
  public async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }
}

export const dataStorageService = new DataStorageService();