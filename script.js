/**
 * AMOLED Flip Clock
 * Version: 2.0.0
 * Pure Vanilla JavaScript - No Dependencies
 */

(function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        animationDuration: 500, // ms
        updateInterval: 1000,   // ms
        cacheVersion: '2.0.0'
    };

    // ============================================
    // State Management
    // ============================================
    const state = {
        wakeLock: null,
        isFullscreen: false,
        isInitialized: false,
        deferredPrompt: null,
        installBannerVisible: false
    };

    // ============================================
    // DOM Elements Cache
    // ============================================
    const elements = {
        hoursDigits: null,
        minutesDigits: null,
        secondsDigits: null,
        ampm: null,
        date: null,
        wakeLockIndicator: null,
        clockContainer: null,
        installBanner: null,
        installButton: null,
        closeInstall: null
    };

    // ============================================
    // Date/Time Constants
    // ============================================
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // ============================================
    // Utility Functions
    // ============================================
    
    function pad(num) {
        return num < 10 ? '0' + num : num.toString();
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================
    // Flip Animation
    // ============================================
    
    function updateDigit(digitElement, newValue) {
        if (!digitElement) return;
        
        const currentValue = digitElement.dataset.digit;
        if (currentValue === newValue) return;

        const staticEl = digitElement.querySelector('.digit-static');
        const topEl = digitElement.querySelector('.digit-top span');
        const bottomEl = digitElement.querySelector('.digit-bottom span');
        const flipTopEl = digitElement.querySelector('.digit-flip-top span');
        const flipBottomEl = digitElement.querySelector('.digit-flip-bottom span');

        if (!staticEl || !topEl || !bottomEl || !flipTopEl || !flipBottomEl) return;

        // Cancel any ongoing animation
        if (digitElement._animationTimeout) {
            clearTimeout(digitElement._animationTimeout);
        }

        // Set up flip animation values
        flipTopEl.textContent = currentValue;
        flipBottomEl.textContent = newValue;
        topEl.textContent = currentValue;
        bottomEl.textContent = newValue;

        // Start animation
        digitElement.classList.add('flipping');

        // Update static value after animation completes
        digitElement._animationTimeout = setTimeout(() => {
            staticEl.textContent = newValue;
            topEl.textContent = newValue;
            bottomEl.textContent = newValue;
            flipTopEl.textContent = newValue;
            flipBottomEl.textContent = newValue;
            digitElement.classList.remove('flipping');
            digitElement.dataset.digit = newValue;
            delete digitElement._animationTimeout;
        }, CONFIG.animationDuration);
    }

    // ============================================
    // Clock Logic
    // ============================================
    
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Determine AM/PM
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        // Convert to 12-hour format
        hours = hours % 12;
        hours = hours ? hours : 12;

        // Format digits
        const hoursStr = pad(hours);
        const minutesStr = pad(minutes);
        const secondsStr = pad(seconds);

        // Update digit elements
        if (elements.hoursDigits) {
            updateDigit(elements.hoursDigits[0], hoursStr[0]);
            updateDigit(elements.hoursDigits[1], hoursStr[1]);
        }

        if (elements.minutesDigits) {
            updateDigit(elements.minutesDigits[0], minutesStr[0]);
            updateDigit(elements.minutesDigits[1], minutesStr[1]);
        }

        if (elements.secondsDigits) {
            updateDigit(elements.secondsDigits[0], secondsStr[0]);
            updateDigit(elements.secondsDigits[1], secondsStr[1]);
        }

        // Update AM/PM
        if (elements.ampm && elements.ampm.textContent !== ampm) {
            elements.ampm.textContent = ampm;
        }

        // Update date
        updateDate(now);
    }

    function updateDate(date) {
        if (!elements.date) return;

        const dayName = DAY_NAMES[date.getDay()];
        const day = date.getDate();
        const monthName = MONTH_NAMES[date.getMonth()];
        const year = date.getFullYear();
        
        const dateString = `${dayName}, ${day} ${monthName} ${year}`;

        if (elements.date.textContent !== dateString) {
            elements.date.textContent = dateString;
        }
    }

    // ============================================
    // Wake Lock API
    // ============================================
    
    async function requestWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.log('[Flip Clock] Wake Lock API not supported');
            return;
        }

        try {
            // Release existing wake lock if any
            if (state.wakeLock) {
                await state.wakeLock.release();
            }

            state.wakeLock = await navigator.wakeLock.request('screen');
            
            if (elements.wakeLockIndicator) {
                elements.wakeLockIndicator.classList.add('active');
            }
            
            console.log('[Flip Clock] Wake Lock active');

            state.wakeLock.addEventListener('release', () => {
                if (elements.wakeLockIndicator) {
                    elements.wakeLockIndicator.classList.remove('active');
                }
                console.log('[Flip Clock] Wake Lock released');
                state.wakeLock = null;
            });
        } catch (err) {
            console.error('[Flip Clock] Wake Lock request failed:', err);
        }
    }

    async function releaseWakeLock() {
        if (state.wakeLock) {
            try {
                await state.wakeLock.release();
            } catch (err) {
                console.error('[Flip Clock] Wake Lock release failed:', err);
            }
        }
    }

    // ============================================
    // Fullscreen
    // ============================================
    
    function enterFullscreen() {
        const elem = document.documentElement;
        
        const requestFS = elem.requestFullscreen || 
                         elem.webkitRequestFullscreen || 
                         elem.mozRequestFullScreen || 
                         elem.msRequestFullscreen;

        if (requestFS) {
            requestFS.call(elem).catch(err => {
                console.log('[Flip Clock] Fullscreen request failed:', err);
            });
        }
        
        // Attempt to lock orientation to landscape
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
        
        state.isFullscreen = true;
    }

    function exitFullscreen() {
        const exitFS = document.exitFullscreen || 
                      document.webkitExitFullscreen || 
                      document.mozCancelFullScreen || 
                      document.msExitFullscreen;

        if (exitFS) {
            exitFS.call(document).catch(() => {});
        }
        
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        
        state.isFullscreen = false;
    }

    function toggleFullscreen() {
        if (state.isFullscreen) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }

    // ============================================
    // PWA Installation
    // ============================================
    
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            state.deferredPrompt = e;
            
            if (elements.installBanner) {
                elements.installBanner.classList.remove('hidden');
                state.installBannerVisible = true;
            }
        });

        if (elements.installButton) {
            elements.installButton.addEventListener('click', async () => {
                if (!state.deferredPrompt) return;
                
                elements.installButton.disabled = true;
                
                try {
                    state.deferredPrompt.prompt();
                    const { outcome } = await state.deferredPrompt.userChoice;
                    console.log(`[Flip Clock] Install prompt outcome: ${outcome}`);
                    
                    if (outcome === 'accepted') {
                        // Hide banner after successful installation
                        if (elements.installBanner) {
                            elements.installBanner.classList.add('hidden');
                        }
                    }
                } catch (err) {
                    console.error('[Flip Clock] Install prompt failed:', err);
                } finally {
                    state.deferredPrompt = null;
                    elements.installButton.disabled = false;
                }
            });
        }

        if (elements.closeInstall) {
            elements.closeInstall.addEventListener('click', () => {
                if (elements.installBanner) {
                    elements.installBanner.classList.add('hidden');
                    state.installBannerVisible = false;
                }
            });
        }

        // Hide banner if app is already installed
        window.addEventListener('appinstalled', () => {
            console.log('[Flip Clock] App was installed');
            if (elements.installBanner) {
                elements.installBanner.classList.add('hidden');
                state.installBannerVisible = false;
            }
            state.deferredPrompt = null;
        });
    }

    // ============================================
    // Event Handlers
    // ============================================
    
    function handleFirstInteraction(e) {
        // Fullscreen activation
        enterFullscreen();
        
        // Request Wake Lock
        requestWakeLock();
        
        // Remove interaction listeners
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            if (!state.wakeLock) {
                requestWakeLock();
            }
            // Update clock immediately when becoming visible
            updateClock();
        }
    }

    function handleFullscreenChange() {
        state.isFullscreen = !!document.fullscreenElement;
    }

    function preventDefault(e) {
        e.preventDefault();
    }

    // ============================================
    // Service Worker
    // ============================================
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('[Flip Clock] Service Worker registered:', registration.scope);
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        console.log('[Flip Clock] New version available');
                                        // Notify user of update if needed
                                    }
                                });
                            }
                        });
                    })
                    .catch(error => {
                        console.error('[Flip Clock] Service Worker registration failed:', error);
                    });

                // Handle controller change (new service worker activated)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[Flip Clock] Service Worker controller changed');
                    window.location.reload();
                });
            });
        }
    }

    // ============================================
    // Initialization
    // ============================================
    
    function cacheElements() {
        elements.hoursDigits = document.querySelectorAll('#hours .flip-digit');
        elements.minutesDigits = document.querySelectorAll('#minutes .flip-digit');
        elements.secondsDigits = document.querySelectorAll('#seconds .flip-digit');
        elements.ampm = document.getElementById('ampm');
        elements.date = document.getElementById('date-display');
        elements.wakeLockIndicator = document.getElementById('wake-lock-indicator');
        elements.clockContainer = document.getElementById('clock-container');
        elements.installBanner = document.getElementById('install-banner');
        elements.installButton = document.getElementById('install-button');
        elements.closeInstall = document.getElementById('close-install');
    }

    function setupEventListeners() {
        // First interaction for fullscreen and wake lock
        document.addEventListener('click', handleFirstInteraction, { once: true });
        document.addEventListener('touchstart', handleFirstInteraction, { once: true });
        document.addEventListener('keydown', handleFirstInteraction, { once: true });

        // Visibility change for wake lock re-acquisition
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Fullscreen change
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        // Prevent scrolling and gestures
        document.addEventListener('wheel', preventDefault, { passive: false });
        document.addEventListener('touchmove', preventDefault, { passive: false });
        document.addEventListener('gesturestart', preventDefault);
        document.addEventListener('gesturechange', preventDefault);
        document.addEventListener('gestureend', preventDefault);

        // Prevent context menu
        document.addEventListener('contextmenu', preventDefault);

        // Double tap to toggle fullscreen
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                toggleFullscreen();
                e.preventDefault();
            }
            lastTap = currentTime;
        });

        // Handle resize events
        window.addEventListener('resize', debounce(() => {
            // Force redraw
            document.body.style.display = 'none';
            document.body.offsetHeight; // Trigger reflow
            document.body.style.display = 'flex';
        }, 250));
    }

    function setInitialTime() {
        const now = new Date();
        let hours = now.getHours();
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        const hoursStr = pad(hours);
        const minutesStr = pad(now.getMinutes());
        const secondsStr = pad(now.getSeconds());

        // Set initial digit values
        if (elements.hoursDigits) {
            elements.hoursDigits[0].dataset.digit = hoursStr[0];
            elements.hoursDigits[1].dataset.digit = hoursStr[1];
        }
        if (elements.minutesDigits) {
            elements.minutesDigits[0].dataset.digit = minutesStr[0];
            elements.minutesDigits[1].dataset.digit = minutesStr[1];
        }
        if (elements.secondsDigits) {
            elements.secondsDigits[0].dataset.digit = secondsStr[0];
            elements.secondsDigits[1].dataset.digit = secondsStr[1];
        }
    }

    function init() {
        if (state.isInitialized) return;

        console.log('[Flip Clock] Initializing...');

        // Cache DOM elements
        cacheElements();

        // Set initial time values
        setInitialTime();

        // Setup event listeners
        setupEventListeners();

        // Register service worker
        registerServiceWorker();

        // Setup PWA install prompt
        setupInstallPrompt();

        // Initial clock update
        updateClock();

        // Start clock interval
        setInterval(updateClock, CONFIG.updateInterval);

        state.isInitialized = true;
        console.log('[Flip Clock] Initialized successfully');
    }

    // ============================================
    // Start
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose minimal API for debugging
    window.FlipClock = {
        version: CONFIG.cacheVersion,
        toggleFullscreen,
        requestWakeLock,
        releaseWakeLock,
        updateClock
    };

})();
