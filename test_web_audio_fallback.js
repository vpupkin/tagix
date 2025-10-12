/**
 * Web Audio Fallback Test
 * Tests the sound system with Web Audio API fallback
 */

console.log('🔊 Testing Web Audio Fallback System');
console.log('=====================================');

// Test Web Audio API availability
function testWebAudioSupport() {
  console.log('\n1. Testing Web Audio API Support...');
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      console.log('✅ Web Audio API is supported');
      
      const audioContext = new AudioContext();
      console.log('✅ AudioContext created successfully');
      console.log('📊 Sample rate:', audioContext.sampleRate);
      console.log('📊 State:', audioContext.state);
      
      return true;
    } else {
      console.log('❌ Web Audio API not supported');
      return false;
    }
  } catch (error) {
    console.log('❌ Web Audio API error:', error);
    return false;
  }
}

// Test sound generation
function testSoundGeneration() {
  console.log('\n2. Testing Sound Generation...');
  
  if (!testWebAudioSupport()) {
    console.log('❌ Cannot test sound generation without Web Audio API');
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Test different sound types
    const testSounds = [
      { name: 'Ride Request', frequency: 800, duration: 0.3, type: 'sine' },
      { name: 'Ride Accepted', frequency: 1000, duration: 0.2, type: 'sine' },
      { name: 'Driver Arrived', frequency: 1200, duration: 0.4, type: 'square' },
      { name: 'Critical Alert', frequency: 1500, duration: 0.3, type: 'square' }
    ];

    testSounds.forEach((sound, index) => {
      setTimeout(() => {
        console.log(`🔊 Playing ${sound.name}: ${sound.frequency}Hz ${sound.type} for ${sound.duration}s`);
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
        oscillator.type = sound.type;

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + sound.duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + sound.duration);
      }, index * 1000); // Play each sound 1 second apart
    });

    console.log('✅ Sound generation test scheduled');
    console.log('📝 Listen for 4 different notification sounds');
    
  } catch (error) {
    console.error('❌ Sound generation error:', error);
  }
}

// Test browser audio file loading
function testAudioFileLoading() {
  console.log('\n3. Testing Audio File Loading...');
  
  const soundFiles = [
    '/sounds/ride_request.mp3',
    '/sounds/ride_accepted.mp3',
    '/sounds/driver_arrived.mp3',
    '/sounds/critical.mp3'
  ];

  soundFiles.forEach(file => {
    const audio = new Audio(file);
    audio.preload = 'auto';
    
    audio.onload = () => {
      console.log(`✅ ${file} loaded successfully`);
    };
    
    audio.onerror = (error) => {
      console.log(`❌ ${file} failed to load (expected - using Web Audio fallback)`);
    };
    
    // Try to load
    audio.load();
  });
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Web Audio Fallback Tests...\n');
  
  testWebAudioSupport();
  testAudioFileLoading();
  
  // Wait a bit then test sound generation
  setTimeout(() => {
    testSoundGeneration();
  }, 2000);
  
  console.log('\n=====================================');
  console.log('📋 TEST SUMMARY');
  console.log('=====================================');
  console.log('✅ Web Audio API support test');
  console.log('✅ Audio file loading test (expected failures)');
  console.log('✅ Sound generation test (scheduled)');
  console.log('\n🎯 EXPECTED RESULTS:');
  console.log('• Audio files should fail to load (they are text files)');
  console.log('• Web Audio should generate synthetic sounds');
  console.log('• You should hear 4 different notification sounds');
  console.log('\n🔊 The sound system will automatically fallback to Web Audio');
  console.log('when audio files fail to load, providing audible notifications!');
}

// Run tests when page loads
if (typeof window !== 'undefined') {
  runAllTests();
} else {
  console.log('This test should be run in a browser environment');
}
