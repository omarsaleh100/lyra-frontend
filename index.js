// Register background tasks BEFORE expo-router loads.
// This ensures TaskManager.defineTask runs on every JS bundle init,
// including when iOS wakes the app in the background for location events.
import './lib/location';
import 'expo-router/entry';
