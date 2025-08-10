# Cross-Browser Audio Volume Control

A lightweight JavaScript library that provides consistent audio volume control across all browsers and platforms, specifically designed to work with iOS Safari where the native `audio.volume` property is read-only. This is work in progress so bugs are expected - please report them via Issues or make a PR.

## Features

- **iOS Safari Compatible** - Works around the read-only `audio.volume` limitation
- **Cross-Browser Support** - Consistent API across all modern browsers
- **Web Audio API** - Uses GainNode for precise volume control
- **Fallback Support** - Gracefully falls back to native volume control when possible
- **Promise-Based** - Modern async/await API
- **Zero Dependencies** - Lightweight and self-contained
- **TypeScript Ready** - Includes type definitions
- **Mobile Optimized** - Handles mobile browser quirks

## Installation

### CDN
```html
<script src="https://cdn.jsdelivr.net/gh/yourusername/cross-browser-audio-volume@main/dist/CrossBrowserAudioVolume.min.js"></script>
```

### Direct Download
Download `CrossBrowserAudioVolume.js` and include it in your project.

## Quick Start

```html
<audio id="myAudio" src="path/to/audio.mp3"></audio>
<input type="range" id="volumeSlider" min="0" max="100" value="50">
<button id="playButton">Play</button>

<script>
const audio = document.getElementById('myAudio');
const volumeControl = new CrossBrowserAudioVolume(audio, {
    initialVolume: 50,
    debug: true
});

// Play button (required for iOS - must be user initiated)
document.getElementById('playButton').addEventListener('click', async () => {
    try {
        await volumeControl.play();
    } catch (error) {
        console.error('Play failed:', error);
    }
});

// Volume control
document.getElementById('volumeSlider').addEventListener('input', (e) => {
    volumeControl.setVolume(e.target.value);
});
</script>
```

## API Reference

### Constructor

```javascript
new CrossBrowserAudioVolume(audioElement, options)
```

**Parameters:**
- `audioElement` (HTMLAudioElement) - The audio element to control
- `options` (Object) - Configuration options

**Options:**
- `initialVolume` (number) - Initial volume 0-100, default: 50
- `debug` (boolean) - Enable debug logging, default: false
- `onVolumeChange` (function) - Callback when volume changes: `(volume) => {}`
- `onReady` (function) - Callback when Web Audio is initialized: `() => {}`
- `onError` (function) - Callback for errors: `(error, originalError) => {}`

### Methods

#### `initialize()`
Initialize Web Audio API. Must be called after user interaction on iOS.
```javascript
await volumeControl.initialize();
```

#### `setVolume(volumePercent)`
Set volume (0-100).
```javascript
volumeControl.setVolume(75); // Set to 75%
```

#### `getVolume()`
Get current volume (0-100).
```javascript
const currentVolume = volumeControl.getVolume();
```

#### `play()`
Play audio with proper Web Audio initialization.
```javascript
await volumeControl.play();
```

#### `pause()`
Pause audio.
```javascript
await volumeControl.pause();
```

#### `destroy()`
Clean up resources and event listeners.
```javascript
volumeControl.destroy();
```

### Static Methods

#### `isWebAudioSupported()`
Check if Web Audio API is supported.
```javascript
if (CrossBrowserAudioVolume.isWebAudioSupported()) {
    // Web Audio is available
}
```

#### `isIOS()`
Check if running on iOS.
```javascript
if (CrossBrowserAudioVolume.isIOS()) {
    // Running on iOS device
}
```

#### `getCompatibilityInfo()`
Get detailed browser compatibility information.
```javascript
const info = CrossBrowserAudioVolume.getCompatibilityInfo();
console.log(info);
// {
//   isIOS: false,
//   webAudioSupported: true,
//   volumeControlSupported: true,
//   audioContextState: 'available'
// }
```

## Usage Examples

### Basic Volume Control
```javascript
const audio = document.getElementById('audio');
const volumeControl = new CrossBrowserAudioVolume(audio);

// Set volume to 80%
volumeControl.setVolume(80);
```

### With Callbacks
```javascript
const volumeControl = new CrossBrowserAudioVolume(audio, {
    initialVolume: 60,
    debug: true,
    onVolumeChange: (volume) => {
        console.log(`Volume changed to ${volume}%`);
        document.getElementById('volumeDisplay').textContent = `${volume}%`;
    },
    onReady: () => {
        console.log('Audio system ready');
    },
    onError: (error) => {
        console.error('Audio error:', error);
    }
});
```

### React Integration
```jsx
import { useEffect, useRef, useState } from 'react';
import CrossBrowserAudioVolume from 'cross-browser-audio-volume';

function AudioPlayer({ src }) {
    const audioRef = useRef();
    const volumeControlRef = useRef();
    const [volume, setVolume] = useState(50);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        volumeControlRef.current = new CrossBrowserAudioVolume(audio, {
            initialVolume: volume,
            onVolumeChange: setVolume
        });

        return () => {
            volumeControlRef.current?.destroy();
        };
    }, []);

    const handlePlay = async () => {
        try {
            await volumeControlRef.current.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Play failed:', error);
        }
    };

    const handleVolumeChange = (newVolume) => {
        volumeControlRef.current.setVolume(newVolume);
        setVolume(newVolume);
    };

    return (
        <div>
            <audio ref={audioRef} src={src} />
            <button onClick={handlePlay} disabled={isPlaying}>
                Play
            </button>
            <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
            />
            <span>{volume}%</span>
        </div>
    );
}
```

## Browser Compatibility

| Browser | Native Volume | Web Audio | Library Support |
|---------|---------------|-----------|-----------------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari (macOS) | ✅ | ✅ | ✅ |
| Safari (iOS) | ❌ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Opera | ✅ | ✅ | ✅ |

## Important Notes

### iOS Safari Limitations
- Web Audio API must be initialized after user interaction
- AudioContext may be suspended and needs to be resumed
- The library automatically handles these requirements

### User Interaction Requirement
```javascript
// ❌ Won't work on iOS - no user interaction
volumeControl.play();

// ✅ Works - called from user event
button.addEventListener('click', () => {
    volumeControl.play();
});
```

### Best Practices
1. Always call `play()` from a user-initiated event
2. Handle play promises with try/catch
3. Initialize the library early but expect Web Audio setup on first play
4. Use the `onReady` callback to know when volume control is fully functional

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- iOS Safari support via Web Audio API
- Cross-browser compatibility
- Promise-based API
- Zero dependencies
