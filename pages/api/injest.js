import { createClient } from '@supabase/supabase-js';

// Get the SECRET key from the environment variables.
// This key is ONLY accessible on the serverless function (Vercel server).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client using the SERVICE_KEY for secure, privileged writes.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Define the handler for the Vercel Serverless Function
export default async function handler(req, res) {
  // 1. Only allow POST requests (how the ESP32 will send data)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 2. Security Check: Simple API Key for ESP32 (replace with a real token in production)
  // For this example, we skip the security header check, but in production, 
  // you'd check a token here:
  // if (req.headers['x-api-key'] !== 'YOUR_SECRET_ESP32_KEY') {
  //     return res.status(401).json({ error: 'Unauthorized' });
  // }
  
  // 3. Extract data from the request body
  const { plant_id, moisture, temperature, battery_voltage } = req.body;

  // 4. Basic Validation
  if (!plant_id || moisture === undefined || temperature === undefined) {
    return res.status(400).json({ error: 'Missing required sensor data fields.' });
  }

  // 5. Insert data into the 'sensor_data' table
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([
        { 
          plant_id: plant_id, 
          moisture: parseFloat(moisture), 
          temperature: parseFloat(temperature),
          battery_voltage: parseFloat(battery_voltage)
          // created_at is handled automatically by the Supabase default value
        },
      ])
      .select();

    if (error) {
      console.error("Supabase Insertion Error:", error);
      return res.status(500).json({ error: 'Failed to insert data into Supabase.', details: error.message });
    }

    // 6. Success Response
    res.status(200).json({ message: 'Data logged successfully!', record: data });

  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: 'Internal server error processing request.' });
  }
}