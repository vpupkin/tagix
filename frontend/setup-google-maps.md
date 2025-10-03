# Google Maps API Setup Guide

## Quick Setup

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Configure the API Key:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your API key
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. **Restart the development server:**
   ```bash
   yarn start
   ```

## Features Enabled with Google Maps API

- ✅ **Real-time address autocomplete** - Type and get suggestions
- ✅ **Global location search** - Works worldwide (no country restrictions)
- ✅ **Interactive map** - Visual route preview
- ✅ **Accurate geocoding** - Precise coordinates for addresses

## Fallback Mode (Without API Key)

The app works without Google Maps API using manual entry:
- Enter coordinates: `48.6670336, 9.7910784`
- Enter full addresses: `Stuttgart Central Station, Germany`
- Basic map display with manual markers

## Test Locations

Try these test coordinates:
- **Stuttgart, Germany**: `48.6670336, 9.7910784`
- **San Francisco, CA**: `37.7749, -122.4194`
- **New York, NY**: `40.7128, -74.0060`

## Troubleshooting

- **"Google Maps API not configured"** - Add your API key to `.env`
- **No suggestions appearing** - Check API key permissions
- **Map not loading** - Verify Maps JavaScript API is enabled
- **Autocomplete not working** - Ensure Places API is enabled
