document.addEventListener('DOMContentLoaded', () => {
    const hoursGroup = document.getElementById('hours-group');
    const minutesGroup = document.getElementById('minutes-group');
    const secondsGroup = document.getElementById('seconds-group');
    const ampmDisplay = document.getElementById('ampm');
    const dateDisplay = document.getElementById('date-display');
    const installModal = document.getElementById('install-modal');
    const btnInstall = document.getElementById('btn-install');
    const btnCancel = document.getElementById('btn-cancel');
    const clockContainer = document.querySelector('.clock-container');

    // Click to toggle fullscreen
    clockContainer.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // Wake Lock to keep screen on
    let wakeLock = null;
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake Lock error:', err);
        }
    };
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });
    requestWakeLock();

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!localStorage.getItem('pwa-installed')) {
            installModal.classList.add('show');
        }
    });

    btnInstall.addEventListener('click', async () => {
        installModal.classList.remove('show');
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('pwa-installed', 'true');
            }
            deferredPrompt = null;
        }
    });

    btnCancel.addEventListener('click', () => {
        installModal.classList.remove('show');
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('pwa-installed', 'true');
        installModal.classList.remove('show');
    });

    // Flip clock logic
    function createFlipCard(id) {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.id = id;

        const top = document.createElement('div');
        top.className = 'top';
        const topDigit = document.createElement('div');
        topDigit.className = 'digit';
        topDigit.innerText = '0';
        top.appendChild(topDigit);

        const bottom = document.createElement('div');
        bottom.className = 'bottom';
        const bottomDigit = document.createElement('div');
        bottomDigit.className = 'digit';
        bottomDigit.innerText = '0';
        bottom.appendChild(bottomDigit);

        card.appendChild(top);
        card.appendChild(bottom);

        return card;
    }

    const cards = {
        h1: createFlipCard('h1'),
        h2: createFlipCard('h2'),
        m1: createFlipCard('m1'),
        m2: createFlipCard('m2'),
        s1: createFlipCard('s1'),
        s2: createFlipCard('s2'),
    };

    hoursGroup.appendChild(cards.h1);
    hoursGroup.appendChild(cards.h2);
    minutesGroup.appendChild(cards.m1);
    minutesGroup.appendChild(cards.m2);
    secondsGroup.appendChild(cards.s1);
    secondsGroup.appendChild(cards.s2);

    function flip(card, newNumber) {
        const topDigit = card.querySelector('.top .digit');
        const bottomDigit = card.querySelector('.bottom .digit');
        const currentNumber = topDigit.innerText;

        if (currentNumber === newNumber) return;

        topDigit.innerText = newNumber;

        const flipTop = document.createElement('div');
        flipTop.className = 'flip-top';
        const ftDigit = document.createElement('div');
        ftDigit.className = 'digit';
        ftDigit.innerText = currentNumber;
        flipTop.appendChild(ftDigit);

        const flipBottom = document.createElement('div');
        flipBottom.className = 'flip-bottom';
        const fbDigit = document.createElement('div');
        fbDigit.className = 'digit';
        fbDigit.innerText = newNumber;
        flipBottom.appendChild(fbDigit);

        card.appendChild(flipTop);
        card.appendChild(flipBottom);

        setTimeout(() => {
            bottomDigit.innerText = newNumber;
            if (card.contains(flipTop)) flipTop.remove();
            if (card.contains(flipBottom)) flipBottom.remove();
        }, 650);
    }

    function updateTime() {
        const now = new Date();
        
        let h = now.getHours();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        
        const m = now.getMinutes();
        const s = now.getSeconds();

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        flip(cards.h1, hStr[0]);
        flip(cards.h2, hStr[1]);
        flip(cards.m1, mStr[0]);
        flip(cards.m2, mStr[1]);
        flip(cards.s1, sStr[0]);
        flip(cards.s2, sStr[1]);

        if (ampmDisplay.innerText !== ampm) {
            ampmDisplay.innerText = ampm;
        }

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options).toUpperCase();
        if (dateDisplay.innerText !== dateStr) {
            dateDisplay.innerText = dateStr;
        }
    }

    updateTime();
    setInterval(updateTime, 1000);
});