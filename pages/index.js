<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌿 Plant Sensor Dashboard</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">

    <div class="p-4 sm:p-8 min-h-screen">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <header class="text-center mb-10">
                <h1 class="text-4xl font-extrabold text-green-700 mb-2">🌿 Plant Sensor Dashboard</h1>
                <p class="text-xl text-gray-600" id="plant-id-display">Real-time monitoring for 'My_Favorite_Basil'</p>
            </header>

            <!-- Error Message Display -->
            <div id="error-message" class="hidden mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 font-medium"></div>

            <!-- Status Section -->
            <div id="status-section" class="mb-8 p-6 rounded-xl shadow-lg border-2 border-green-300 bg-white">
                <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 000 2h2a1 1 0 100-2h-2z" clip-rule="evenodd" />
                    </svg>
                    Current Health Summary
                </h2>
                <div id="connection-status" class="text-lg font-semibold text-gray-500">
                    Last Update: <span class="font-normal ml-2" id="last-update">N/A</span>
                </div>
                <div id="health-message" class="mt-2 text-lg font-semibold text-gray-700">
                    Health Status: <span class="font-normal ml-2 text-gray-500">Awaiting first sensor data...</span>
                </div>
            </div>

            <!-- Metric Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <!-- Card 1: Moisture -->
                <div id="moisture-card" class="card p-5 rounded-xl shadow-md border border-gray-200 bg-white">
                    <div class="text-sm font-semibold text-blue-500 mb-1">Soil Moisture</div>
                    <div class="text-4xl font-bold text-gray-900" id="moisture-value">-- %</div>
                    <div class="text-gray-500 mt-2">Target: 40% - 70%</div>
                </div>

                <!-- Card 2: Temperature -->
                <div id="temp-card" class="card p-5 rounded-xl shadow-md border border-gray-200 bg-white">
                    <div class="text-sm font-semibold text-red-500 mb-1">Air Temperature</div>
                    <div class="text-4xl font-bold text-gray-900" id="temp-value">-- °C</div>
                    <div class="text-gray-500 mt-2">Target: 20°C - 26°C</div>
                </div>

                <!-- Card 3: Battery -->
                <div id="battery-card" class="card p-5 rounded-xl shadow-md border border-gray-200 bg-white">
                    <div class="text-sm font-semibold text-purple-500 mb-1">Sensor Battery</div>
                    <div class="text-4xl font-bold text-gray-900" id="battery-value">-- V</div>
                    <div class="text-gray-500 mt-2">Sensor deep sleep health</div>
                </div>
            </div>

            <!-- Simulation Area -->
            <div class="p-6 rounded-xl shadow-xl bg-white">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Data Trend & Simulation</h2>
                <div id="data-plot" class="rounded-lg mb-4 flex items-center justify-center text-gray-500 font-medium h-[250px]" style="background: linear-gradient(to top, #d9f99d 0%, #bbf7d0 100%); border: 1px solid #a7f3d0;">
                    [Placeholder for a D3/Chart.js chart showing historical trend]
                </div>
                <p class="text-sm text-gray-500">
                    **Architecture Note:** The ESP32 sends a single HTTPS POST to a Vercel Serverless Function, which updates Supabase. The client listens to Supabase for instant UI updates.
                </p>
                <button 
                    id="simulate-button" 
                    class="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Simulate New ESP32 Data Upload
                </button>
            </div>
        </div>
    </div>

    <!-- Load Supabase Library from CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <script>
        // --- Configuration ---
        const PLANT_ID = 'My_Favorite_Basil';
        const apiRouteUrl = '/api/ingest'; 
        
        // IMPORTANT: In a real Next.js environment, these would come from NEXT_PUBLIC_ variables.
        // For this self-contained HTML file to work locally, you must manually substitute the keys here
        // or ensure your environment variables are correctly injected into your HTML served by Next.js.
        // For now, we rely on the Vercel API route handling the actual Supabase connection securely.
        
        // Since we are not running a full Next.js process here, we must rely on
        // the client-side keys ONLY for Real-Time functionality. The button simulation
        // will hit the secure API route which uses the service key.

        const SUPABASE_URL = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL');
        const SUPABASE_ANON_KEY = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');

        let supabase = null;

        // --- Utility Functions ---

        function displayError(message) {
            const errorElement = document.getElementById('error-message');
            errorElement.textContent = `Error: ${message}`;
            errorElement.classList.remove('hidden');
        }

        function hideError() {
            document.getElementById('error-message').classList.add('hidden');
        }

        function updateUI(data, isInitialLoad = false) {
            const { moisture, temperature, battery_voltage, created_at } = data;
            
            // 1. Update values
            document.getElementById('moisture-value').textContent = `${moisture} %`;
            document.getElementById('temp-value').textContent = `${temperature} °C`;
            document.getElementById('battery-value').textContent = `${battery_voltage} V`;

            // 2. Update status/timestamp
            const date = new Date(created_at);
            const lastUpdateText = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('last-update').textContent = lastUpdateText;
            document.getElementById('connection-status').classList.remove('text-gray-500');
            document.getElementById('connection-status').classList.add('text-green-600');

            // 3. Health check logic
            let healthMessage = "Optimal Health! Basil is happy.";
            let colorClass = "text-green-600";
            let moistureBgClass = 'bg-white';
            const moistureCard = document.getElementById('moisture-card');
            const healthMsgElement = document.getElementById('health-message').querySelector('span');
            
            // Reset classes
            moistureCard.className = moistureCard.className.replace(/bg-red-50|bg-yellow-50/g, 'bg-white');
            healthMsgElement.className = healthMsgElement.className.replace(/text-(red|orange|green)-\d{3}/g, 'text-gray-700');
            
            if (moisture < 40) {
                healthMessage = "⚠️ CRITICAL: Soil is too dry! Needs water immediately.";
                colorClass = "text-red-600";
                moistureBgClass = 'bg-red-50';
            } else if (moisture > 70) {
                healthMessage = "💧 Warning: Soil is saturated. Check drainage.";
                colorClass = "text-orange-600";
                moistureBgClass = 'bg-yellow-50';
            } else if (temperature > 28) {
                 healthMessage = "🔥 Warning: Temperature is too high. Find shade.";
                colorClass = "text-orange-600";
            }
            
            moistureCard.classList.add(moistureBgClass);
            healthMsgElement.textContent = healthMessage;
            healthMsgElement.classList.add(colorClass);
            
            if (isInitialLoad) {
                healthMsgElement.classList.remove('text-gray-500');
            }
            hideError();
        }

        // 4. Initial Fetch and Real-Time Setup
        async function initializeDashboard() {
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                displayError("Supabase URL or ANON Key is missing. Please ensure your .env.local file is loaded correctly (or set localStorage for client-side testing).");
                return;
            }

            try {
                supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            } catch (e) {
                displayError("Failed to initialize Supabase client.");
                console.error(e);
                return;
            }

            // A. Fetch the single latest data point first
            try {
                const { data, error } = await supabase
                    .from('sensor_data')
                    .select('moisture, temperature, battery_voltage, created_at')
                    .eq('plant_id', PLANT_ID)
                    .order('created_at', { ascending: false }) 
                    .limit(1)
                    .single(); 

                if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
                    throw new Error(error.message);
                }

                if (data) {
                    updateUI(data, true);
                }
            } catch (e) {
                displayError(`Initial data fetch error: ${e.message}`);
            }

            // B. Set up Realtime listener
            const channel = supabase
                .channel('public:sensor_data') 
                .on(
                    'postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'sensor_data', filter: `plant_id=eq.${PLANT_ID}` }, 
                    (payload) => {
                        console.log('Real-time insertion received:', payload.new);
                        updateUI(payload.new); 
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to Supabase Realtime channel.');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('Supabase Realtime Channel Error.');
                    }
                });

            // Clean up is handled by the browser closing in this simple scenario
        }

        // 5. Simulation Handler
        async function handleSimulateFetch() {
            const button = document.getElementById('simulate-button');
            button.disabled = true;
            button.textContent = 'Sending Data to API...';
            hideError();

            // Generate new data payload 
            const newMoisture = Math.floor(Math.random() * (75 - 35 + 1)) + 35;
            const newTemperature = parseFloat((Math.random() * (26 - 20) + 20).toFixed(1));
            const newBattery = parseFloat((Math.random() * (4.2 - 3.3) + 3.3).toFixed(2));
            
            const newPayload = {
              plant_id: PLANT_ID,
              moisture: newMoisture,
              temperature: newTemperature,
              battery_voltage: newBattery,
            };

            // Simulate sending POST request to Vercel API
            try {
                const response = await fetch(apiRouteUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPayload),
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}. Details: ${errorBody.error}`);
                }

                // Wait for the real-time listener to pick up the change
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = 'Simulate New ESP32 Data Upload';
                }, 1500); 

            } catch (error) {
                console.error("Simulation failed (API POST error):", error);
                displayError(`Simulation POST failed. Error: ${error.message}`);
                button.disabled = false;
                button.textContent = 'Simulate New ESP32 Data Upload';
            }
        }

        // --- Event Listeners and Initialization ---
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('simulate-button').addEventListener('click', handleSimulateFetch);

            // Quick hack to test locally: If you paste your keys here, the client will work.
            // For production, the keys must be loaded securely via server-side rendering or env injection.
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                // FALLBACK FOR TESTING ONLY
                // Replace these with your actual keys from Supabase settings if testing the CDN method locally without Next.js envs
                const tempUrl = 'https://[YOUR SUPABASE PROJECT REF].supabase.co'; // Replace this
                const tempAnonKey = 'eyJhbGciOiJIUzI1NiI...'; // Replace this

                if (!tempUrl.includes('[YOUR SUPABASE PROJECT REF]')) {
                    localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', tempUrl);
                    localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', tempAnonKey);
                    // Reload to pick up new keys
                    // initializeDashboard(); // Initialize immediately if keys are provided
                }
            }

            initializeDashboard();
        });
    </script>

</body>
</html>

  }
}
