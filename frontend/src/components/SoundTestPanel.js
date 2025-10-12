import React, { useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX, Play, Settings } from 'lucide-react';

const SoundTestPanel = () => {
  const { soundManager } = useWebSocket();
  const [volume, setVolume] = useState(80);
  const [enabled, setEnabled] = useState(true);
  const [forceWebAudio, setForceWebAudio] = useState(false);

  const soundTypes = [
    { key: 'ride_request', label: 'Ride Request', description: 'New ride request notification' },
    { key: 'ride_accepted', label: 'Ride Accepted', description: 'Driver accepted ride' },
    { key: 'driver_arrived', label: 'Driver Arrived', description: 'Driver arrived at pickup' },
    { key: 'ride_started', label: 'Ride Started', description: 'Ride has begun' },
    { key: 'ride_completed', label: 'Ride Completed', description: 'Ride finished successfully' },
    { key: 'ride_canceled', label: 'Ride Canceled', description: 'Ride was canceled' },
    { key: 'status_critical', label: 'Critical Alert', description: 'Important system notification' }
  ];

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume / 100);
  };

  const handleEnabledChange = (newEnabled) => {
    setEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
  };

  const handleWebAudioChange = (newForceWebAudio) => {
    setForceWebAudio(newForceWebAudio);
    soundManager.setForceWebAudio(newForceWebAudio);
  };

  const playTestSound = (soundType) => {
    soundManager.playSound(soundType, volume / 100);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          🔊 Sound Notification Test Panel
        </CardTitle>
        <CardDescription>
          Test and configure sound notifications for real-time ride updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-sm font-medium">Sound Notifications</span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Volume</span>
              <span className="text-sm text-muted-foreground">{volume}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([newVolume]) => handleVolumeChange(newVolume)}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Force Web Audio</span>
            </div>
            <Switch
              checked={forceWebAudio}
              onCheckedChange={handleWebAudioChange}
            />
          </div>
        </div>

        {/* Sound Test Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Test Sounds</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {soundTypes.map((sound) => (
              <Button
                key={sound.key}
                variant="outline"
                size="sm"
                onClick={() => playTestSound(sound.key)}
                disabled={!enabled}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <Play className="h-3 w-3 flex-shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-medium">{sound.label}</div>
                    <div className="text-xs text-muted-foreground">{sound.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Status Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Sound files are loaded from /public/sounds/</p>
          <p>• Web Audio fallback generates synthetic sounds when files fail</p>
          <p>• Sounds play automatically when notifications are received</p>
          <p>• Volume and enabled state are saved in browser</p>
          <p>• Force Web Audio mode bypasses file loading for testing</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SoundTestPanel;
