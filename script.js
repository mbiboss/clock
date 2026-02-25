/**
 * AMOLED Flip Clock
 * Version: 1.0.0
 * Pure Vanilla JavaScript - No Dependencies
 */

(function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        animationDuration: 600, // ms
        updateInterval: 1000,   // ms
        cacheVersion: '1.2.0'
    };

    // ============================================
    // State Management
    // ============================================
    const state = {
        previousTime: { h1: '0', h2: '0', m1: '0', m2: '0', s1: '0', s2: '0' },
        wakeLock: null,
        isFullscreen: false,
        isInitialized: false
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
        rotateMessage: null,
        clockContainer: null
    };

    // ============================================
    // Date/Time Constants
    // ============================================
    const DAY_NAMES = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
        'Thursday', 'Friday', 'Saturday'
    ];

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // ============================================
    // Utility Functions
    // ============================================
    
    /**
     * Pad number with leading zero
     * @param {number} num - Number to pad
     * @returns {string} Padded number
     */
    function pad(num) {
        return num < 10 ? '0' + num : num.toString();
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
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
    
    /**
     * Update a single digit with flip animation
     * @param {HTMLElement} digitElement - The digit container element
     * @param {string} newValue - New digit value
     */
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

        // Set up flip animation values
        flipTopEl.textContent = currentValue;
        flipBottomEl.textContent = newValue;
        topEl.textContent = currentValue;
        bottomEl.textContent = newValue;

        // Start animation
        digitElement.classList.add('flipping');

        // Update static value after animation completes
        setTimeout(() => {
            staticEl.textContent = newValue;
            topEl.textContent = newValue;
            bottomEl.textContent = newValue;
            flipTopEl.textContent = newValue;
            flipBottomEl.textContent = newValue;
            digitElement.classList.remove('flipping');
            digitElement.dataset.digit = newValue;
        }, CONFIG.animationDuration);
    }

    // ============================================
    // Clock Logic
    // ============================================
    
    /**
     * Update the clock display
     */
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

        // Extract individual digits
        const timeData = {
            h1: hoursStr[0],
            h2: hoursStr[1],
            m1: minutesStr[0],
            m2: minutesStr[1],
            s1: secondsStr[0],
            s2: secondsStr[1]
        };

        // Update digit elements
        if (elements.hoursDigits) {
            updateDigit(elements.hoursDigits[0], timeData.h1);
            updateDigit(elements.hoursDigits[1], timeData.h2);
        }

        if (elements.minutesDigits) {
            updateDigit(elements.minutesDigits[0], timeData.m1);
            updateDigit(elements.minutesDigits[1], timeData.m2);
        }

        if (elements.secondsDigits) {
            updateDigit(elements.secondsDigits[0], timeData.s1);
            updateDigit(elements.secondsDigits[1], timeData.s2);
        }

        // Update AM/PM
        if (elements.ampm && elements.ampm.textContent !== ampm) {
            elements.ampm.textContent = ampm;
        }

        // Update date
        updateDate(now);

        // Store current time
        state.previousTime = timeData;
    }

    /**
     * Update the date display
     * @param {Date} date - Date object
     */
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
    
    /**
     * Request screen wake lock
     */
    async function requestWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.log('[Flip Clock] Wake Lock API not supported');
            return;
        }

        try {
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

    /**
     * Release wake lock
     */
    async function releaseWakeLock() {
        if (state.wakeLock) {
            try {
                await state.wakeLock.release();
                state.wakeLock = null;
            } catch (err) {
                console.error('[Flip Clock] Wake Lock release failed:', err);
            }
        }
    }

    // ============================================
    // Fullscreen
    // ============================================
    
    /**
     * Enter fullscreen mode
     */
    function enterFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('[Flip Clock] Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        state.isFullscreen = true;
    }

    /**
     * Exit fullscreen mode
     */
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        state.isFullscreen = false;
    }

    /**
     * Toggle fullscreen mode
     */
    function toggleFullscreen() {
        if (state.isFullscreen) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }

    // ============================================
    // Event Handlers
    // ============================================
    
    /**
     * Handle first user interaction
     */
    function handleFirstInteraction() {
        // Fullscreen activation
        enterFullscreen();
        
        // Request Wake Lock
        requestWakeLock();
        
        // Remove interaction listeners
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
    }

    /**
     * Handle visibility change
     */
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Re-request wake lock when page becomes visible
            if (!state.wakeLock) {
                requestWakeLock();
            }
            // Update clock immediately
            updateClock();
        }
    }

    /**
     * Handle orientation change
     */
    function handleOrientationChange() {
        // Force redraw after orientation change
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    }

    /**
     * Prevent default behavior for various events
     * @param {Event} e - Event object
     */
    function preventDefault(e) {
        e.preventDefault();
    }

    // ============================================
    // Service Worker
    // ============================================
    
    /**
     * Register service worker
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('[Flip Clock] Service Worker registered:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[Flip Clock] New version available');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('[Flip Clock] Service Worker registration failed:', error);
                });
        }
    }

    // ============================================
    // Initialization
    // ============================================
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.hoursDigits = document.querySelectorAll('#hours .flip-digit');
        elements.minutesDigits = document.querySelectorAll('#minutes .flip-digit');
        elements.secondsDigits = document.querySelectorAll('#seconds .flip-digit');
        elements.ampm = document.getElementById('ampm');
        elements.date = document.getElementById('date-display');
        elements.wakeLockIndicator = document.getElementById('wake-lock-indicator');
        elements.rotateMessage = document.getElementById('rotate-message');
        elements.clockContainer = document.getElementById('clock-container');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // First interaction for fullscreen and wake lock
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);

        // Visibility change for wake lock re-acquisition
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Orientation change
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', debounce(handleOrientationChange, 250));

        // Prevent scrolling
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
    }

    /**
     * Initialize the clock
     */
    function init() {
        if (state.isInitialized) return;

        console.log('[Flip Clock] Initializing...');

        // Cache DOM elements
        cacheElements();

        // Setup event listeners
        setupEventListeners();

        // Register service worker
        registerServiceWorker();

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
    
    // Initialize when DOM is ready
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
