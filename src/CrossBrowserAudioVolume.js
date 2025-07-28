/**
 * CrossBrowserAudioVolume - A JavaScript library for consistent audio volume control across all browsers and platforms
 * Specifically designed to work with iOS Safari where audio.volume is read-only
 * 
 * @version 1.0.0
 * @author Your Name
 * @license MIT
 */

class CrossBrowserAudioVolume {
    /**
     * Creates a new CrossBrowserAudioVolume instance
     * @param {HTMLAudioElement} audioElement - The HTML audio element to control
     * @param {Object} options - Configuration options
     * @param {number} options.initialVolume - Initial volume (0-100), default: 50
     * @param {boolean} options.debug - Enable debug logging, default: false
     * @param {Function} options.onVolumeChange - Callback when volume changes
     * @param {Function} options.onReady - Callback when Web Audio is ready
     * @param {Function} options.onError - Callback for errors
     */
    constructor(audioElement, options = {}) {
        if (!audioElement || !(audioElement instanceof HTMLAudioElement)) {
            throw new Error('CrossBrowserAudioVolume requires a valid HTMLAudioElement');
        }

        this.audio = audioElement;
        this.options = {
            initialVolume: 50,
            debug: false,
            onVolumeChange: null,
            onReady: null,
            onError: null,
            ...options
        };

        // Audio Web API properties
        this.audioContext = null;
        this.gainNode = null;
        this.source = null;
        this.isWebAudioSetup = false;
        
        // State management
        this.volume = this.options.initialVolume / 100;
        this.isInitialized = false;
        this.playPromise = null;

        // Bind methods
        this.handlePlay = this.handlePlay.bind(this);
        this.handlePause = this.handlePause.bind(this);
        this.handleEnded = this.handleEnded.bind(this);

        this._setupEventListeners();
        this._log('CrossBrowserAudioVolume initialized');
    }

    /**
     * Initialize Web Audio API (must be called after user interaction)
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            await this._setupWebAudio();
            this.isInitialized = true;
            this._log('Web Audio API initialized successfully');
            
            if (this.options.onReady) {
                this.options.onReady();
            }
            
            return true;
        } catch (error) {
            this._error('Failed to initialize Web Audio API', error);
            return false;
        }
    }

    /**
     * Set volume (0-100)
     * @param {number} volumePercent - Volume percentage (0-100)
     */
    setVolume(volumePercent) {
        if (typeof volumePercent !== 'number' || volumePercent < 0 || volumePercent > 100) {
            throw new Error('Volume must be a number between 0 and 100');
        }

        this.volume = volumePercent / 100;

        if (this.gainNode) {
            // Use Web Audio API for precise control (works on iOS)
            this.gainNode.gain.value = this.volume;
            this._log(`Volume set to ${volumePercent}% via Web Audio API`);
        } else {
            // Fallback for browsers that support audio.volume
            try {
                this.audio.volume = this.volume;
                this._log(`Volume set to ${volumePercent}% via audio.volume`);
            } catch (error) {
                this._log('audio.volume is read-only (likely iOS Safari)');
            }
        }

        if (this.options.onVolumeChange) {
            this.options.onVolumeChange(volumePercent);
        }
    }

    /**
     * Get current volume (0-100)
     * @returns {number} Current volume percentage
     */
    getVolume() {
        return Math.round(this.volume * 100);
    }

    /**
     * Play audio with proper Web Audio initialization
     * @returns {Promise<void>}
     */
    async play() {
        try {
            // Initialize Web Audio on first play if not already done
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Resume AudioContext if suspended (required for iOS)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                this._log('AudioContext resumed');
            }

            // Wait for any pending play operations
            if (this.playPromise) {
                await this.playPromise;
            }

            this.playPromise = this.audio.play();
            await this.playPromise;
            this.playPromise = null;

        } catch (error) {
            this.playPromise = null;
            if (error.name !== 'AbortError') {
                this._error('Play failed', error);
            }
            throw error;
        }
    }

    /**
     * Pause audio
     * @returns {Promise<void>}
     */
    async pause() {
        try {
            // Wait for play promise to resolve before pausing
            if (this.playPromise) {
                await this.playPromise;
            }
            this.audio.pause();
        } catch (error) {
            // Ignore abort errors when pausing
            if (error.name !== 'AbortError') {
                this._error('Pause failed', error);
            }
        }
    }

    /**
     * Check if Web Audio API is supported
     * @returns {boolean} Support status
     */
    static isWebAudioSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Check if running on iOS
     * @returns {boolean} iOS detection
     */
    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    /**
     * Get browser compatibility info
     * @returns {Object} Compatibility information
     */
    static getCompatibilityInfo() {
        const testAudio = document.createElement('audio');
        return {
            isIOS: CrossBrowserAudioVolume.isIOS(),
            webAudioSupported: CrossBrowserAudioVolume.isWebAudioSupported(),
            volumeControlSupported: testAudio.volume !== undefined,
            audioContextState: window.AudioContext ? 'available' : 'unavailable'
        };
    }

    /**
     * Destroy the instance and clean up resources
     */
    destroy() {
        this._removeEventListeners();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.audioContext = null;
        this.gainNode = null;
        this.source = null;
        this.isWebAudioSetup = false;
        this.isInitialized = false;
        
        this._log('CrossBrowserAudioVolume destroyed');
    }

    // Private methods
    async _setupWebAudio() {
        if (this.isWebAudioSetup) return;

        if (!CrossBrowserAudioVolume.isWebAudioSupported()) {
            throw new Error('Web Audio API not supported');
        }

        // Create AudioContext
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.volume;
        
        // Create source from audio element
        this.source = this.audioContext.createMediaElementSource(this.audio);
        
        // Connect: source -> gain -> destination
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        this.isWebAudioSetup = true;
    }

    _setupEventListeners() {
        this.audio.addEventListener('play', this.handlePlay);
        this.audio.addEventListener('pause', this.handlePause);
        this.audio.addEventListener('ended', this.handleEnded);
    }

    _removeEventListeners() {
        this.audio.removeEventListener('play', this.handlePlay);
        this.audio.removeEventListener('pause', this.handlePause);
        this.audio.removeEventListener('ended', this.handleEnded);
    }

    handlePlay() {
        this._log('Audio started playing');
    }

    handlePause() {
        this._log('Audio paused');
    }

    handleEnded() {
        this._log('Audio playback ended');
    }

    _log(message) {
        if (this.options.debug) {
            console.log(`[CrossBrowserAudioVolume] ${message}`);
        }
    }

    _error(message, error) {
        const errorMessage = `[CrossBrowserAudioVolume] ${message}`;
        if (this.options.debug) {
            console.error(errorMessage, error);
        }
        
        if (this.options.onError) {
            this.options.onError(new Error(errorMessage), error);
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossBrowserAudioVolume;
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
        return CrossBrowserAudioVolume;
    });
} else {
    window.CrossBrowserAudioVolume = CrossBrowserAudioVolume;
}