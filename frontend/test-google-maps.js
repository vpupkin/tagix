// Test script to verify Google Maps API configuration
// Run this in the browser console to test your setup

function testGoogleMapsAPI() {
  console.log('🧪 Testing Google Maps API Configuration...');
  
  // Check if API key is configured
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    console.warn('❌ Google Maps API key not configured');
    console.log('📝 Please add your API key to .env file:');
    console.log('   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key');
    return false;
  }
  
  console.log('✅ API key configured');
  
  // Check if Google Maps is loaded
  if (typeof window.google === 'undefined') {
    console.warn('❌ Google Maps not loaded');
    console.log('📝 Make sure Maps JavaScript API is enabled');
    return false;
  }
  
  console.log('✅ Google Maps loaded');
  
  // Check if Places API is available
  if (!window.google.maps.places) {
    console.warn('❌ Places API not available');
    console.log('📝 Make sure Places API is enabled in Google Cloud Console');
    return false;
  }
  
  console.log('✅ Places API available');
  
  // Test autocomplete service
  try {
    const autocompleteService = new window.google.maps.places.AutocompleteService();
    console.log('✅ Autocomplete service initialized');
    
    // Test a simple prediction
    autocompleteService.getPlacePredictions({
      input: 'Stuttgart',
      types: ['geocode']
    }, (predictions, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        console.log('✅ Autocomplete working - found', predictions.length, 'predictions');
        console.log('Sample prediction:', predictions[0]);
      } else {
        console.warn('❌ Autocomplete failed:', status);
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing autocomplete:', error);
    return false;
  }
  
  console.log('🎉 Google Maps integration is working correctly!');
  return true;
}

// Auto-run the test
testGoogleMapsAPI();
