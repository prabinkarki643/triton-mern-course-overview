// backend/src/database.ts
import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri: string = process.env.MONGODB_URI || '';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');
  } catch (error: unknown) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error: Error) => {
  console.error('MongoDB connection error:', error);
});