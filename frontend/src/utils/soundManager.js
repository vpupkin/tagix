/**
 * Sound Manager for TAGIX Real-time Notifications
 * Implements audible alerts for ride status updates as per QA Enforcement Charter
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.isEnabled = true;
    this.volume = 0.8;
    this.audioContext = null;
    this.useWebAudio = true; // Fallback to Web Audio API when files fail
    this.forceWebAudioMode = true; // Force Web Audio mode for production
    this.loadSounds();
  }

  /**
   * Load all notification sounds
   */
  loadSounds() {
    const soundProfiles = {
      'ride_request': {
        file: '/sounds/ride_request.mp3',
        volume: 0.8,
        description: 'New ride request notification',
        webAudio: { frequency: 800, duration: 0.3, type: 'sine' }
      },
      'ride_accepted': {
        file: '/sounds/ride_accepted.mp3', 
        volume: 0.8,
        description: 'Ride acceptance notification',
        webAudio: { frequency: 1000, duration: 0.2, type: 'sine' }
      },
      'driver_arrived': {
        file: '/sounds/driver_arrived.mp3',
        volume: 0.9,
        description: 'Driver arrived notification',
        webAudio: { frequency: 1200, duration: 0.4, type: 'square' }
      },
      'ride_started': {
        file: '/sounds/ride_started.mp3',
        volume: 0.7,
        description: 'Ride started notification',
        webAudio: { frequency: 600, duration: 0.5, type: 'triangle' }
      },
      'ride_completed': {
        file: '/sounds/ride_completed.mp3',
        volume: 0.8,
        description: 'Ride completed notification',
        webAudio: { frequency: 1000, duration: 0.6, type: 'sine' }
      },
      'ride_canceled': {
        file: '/sounds/ride_canceled.mp3',
        volume: 0.9,
        description: 'Ride canceled notification',
        webAudio: { frequency: 400, duration: 0.8, type: 'sawtooth' }
      },
      'status_critical': {
        file: '/sounds/critical.mp3',
        volume: 1.0,
        description: 'Critical status notification',
        webAudio: { frequency: 1500, duration: 0.3, type: 'square' }
      },
      'balance_transaction': {
        file: '/sounds/balance_update.mp3',
        volume: 0.8,
        description: 'Balance transaction notification',
        webAudio: { frequency: 900, duration: 0.4, type: 'sine' }
      }
    };

    // Preload all sounds
    Object.entries(soundProfiles).forEach(([key, profile]) => {
      this.sounds[key] = new Audio(profile.file);
      this.sounds[key].volume = profile.volume;
      this.sounds[key].preload = 'auto';
      
      // Force Web Audio mode for production (since audio files are text files)
      if (this.forceWebAudioMode) {
        this.sounds[key].useWebAudio = true;
        console.log(`🔊 Forcing Web Audio mode for ${key} (production mode)`);
      }
      
      // Handle loading errors gracefully and fallback to Web Audio
      this.sounds[key].onerror = () => {
        console.warn(`Failed to load sound: ${profile.file}, will use Web Audio fallback`);
        this.sounds[key].webAudioProfile = profile.webAudio;
        this.sounds[key].useWebAudio = true;
      };
      
      // Store Web Audio profile for fallback
      this.sounds[key].webAudioProfile = profile.webAudio;
    });
  }

  /**
   * Initialize Web Audio API
   */
  initWebAudio() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * Generate sound using Web Audio API
   * @param {object} profile - Sound profile with frequency, duration, type
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  playWebAudioSound(profile, volume = 0.8) {
    if (!this.initWebAudio()) {
      console.warn('Web Audio API not available');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(profile.frequency, this.audioContext.currentTime);
      oscillator.type = profile.type;

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + profile.duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + profile.duration);

      console.log(`🔊 Playing Web Audio sound: ${profile.frequency}Hz ${profile.type} for ${profile.duration}s`);
    } catch (error) {
      console.error('Web Audio error:', error);
    }
  }

  /**
   * Play notification sound
   * @param {string} soundType - Type of sound to play
   * @param {number} volume - Volume override (0.0 to 1.0)
   */
  playSound(soundType, volume = null) {
    if (!this.isEnabled) {
      console.log('🔇 Sound notifications disabled');
      return;
    }

    const sound = this.sounds[soundType];
    if (!sound) {
      console.warn(`Sound not found: ${soundType}`);
      return;
    }

    const playVolume = volume !== null ? volume : this.volume;

    try {
      // Try to play audio file first
      if (!sound.useWebAudio) {
        sound.volume = playVolume;
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.warn(`Failed to play audio file ${soundType}, falling back to Web Audio:`, error);
          sound.useWebAudio = true;
          this.playWebAudioSound(sound.webAudioProfile, playVolume);
        });
        console.log(`🔊 Playing audio file: ${soundType}`);
      } else {
        // Use Web Audio fallback
        this.playWebAudioSound(sound.webAudioProfile, playVolume);
      }
    } catch (error) {
      console.error(`Error playing sound ${soundType}:`, error);
      // Final fallback to Web Audio
      if (sound.webAudioProfile) {
        this.playWebAudioSound(sound.webAudioProfile, playVolume);
      }
    }
  }

  /**
   * Play sound based on notification type
   * @param {string} notificationType - WebSocket notification type
   * @param {object} data - Notification data
   */
  playNotificationSound(notificationType, data = {}) {
    const soundMapping = {
      'ride_request': 'ride_request',
      'ride_accepted': 'ride_accepted', 
      'driver_arrived': 'driver_arrived',
      'ride_started': 'ride_started',
      'ride_completed': 'ride_completed',
      'ride_canceled': 'ride_canceled',
      'admin_message': 'status_critical',
      'payment_required': 'status_critical'
    };

    const soundType = soundMapping[notificationType];
    if (soundType) {
      this.playSound(soundType);
    } else {
      console.log(`No sound mapping for notification type: ${notificationType}`);
    }
  }

  /**
   * Enable/disable sound notifications
   * @param {boolean} enabled - Whether to enable sounds
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🔊 Sound notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set global volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
    
    console.log(`🔊 Volume set to: ${this.volume}`);
  }

  /**
   * Force Web Audio mode for all sounds (useful for testing)
   * @param {boolean} force - Whether to force Web Audio mode
   */
  setForceWebAudio(force = true) {
    Object.values(this.sounds).forEach(sound => {
      sound.useWebAudio = force;
    });
    console.log(`🔊 Web Audio mode ${force ? 'enabled' : 'disabled'} for all sounds`);
  }

  /**
   * Get current sound settings
   */
  getSettings() {
    return {
      enabled: this.isEnabled,
      volume: this.volume,
      availableSounds: Object.keys(this.sounds),
      webAudioMode: Object.values(this.sounds).some(sound => sound.useWebAudio)
    };
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
