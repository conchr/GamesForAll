/* ============================================================
   Η ΚΑΡΤΑ ΤΟΥ ΕΞΕΡΕΥΝΗΤΗ — PRESENTATION APP
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

    // ── URL Param & Data ──
    const params = new URLSearchParams(window.location.search);
    const level = parseInt(params.get('level')) || 1;
    const data = QUIZ_LEVELS[level];

    if (!data) {
        document.body.innerHTML = '<div style="padding:40px;color:white;font-size:24px;">Λάθος επίπεδο</div>';
        return;
    }

    const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];
    const TOTAL_QUESTIONS = data.questions.length;
    const TIMER_SECONDS = data.timerSeconds;
    const CIRCLE_LENGTH = 138.2;

    // ── Apply level accent color ──
    document.documentElement.style.setProperty('--accent-color', data.accentColor);

    // ── State ──
    let currentIndex = 0;
    let isRevealed = false;
    let timerInterval = null;
    let timeLeft = TIMER_SECONDS;
    let soundEnabled = true;
    let tickToggle = false; // για εναλλαγή tick-tock

    // ── DOM ──
    const container    = document.getElementById('slidesContainer');
    const progressFill = document.getElementById('progressFill');
    const counterCur   = document.getElementById('counterCurrent');
    const counterTotal = document.getElementById('counterTotal');
    const levelBadge   = document.getElementById('levelBadge');
    const btnPrev      = document.getElementById('btnPrev');
    const btnNext      = document.getElementById('btnNext');
    const btnReveal    = document.getElementById('btnReveal');
    const timerBox     = document.getElementById('timerBox');
    const timerNumber  = document.getElementById('timerNumber');
    const timerRing    = document.getElementById('timerRing');
    const soundToggle  = document.getElementById('soundToggle');

    // ── Level Badge ──
    levelBadge.textContent = `Επίπεδο ${data.numeral} · ${data.name}`;
    counterTotal.textContent = TOTAL_QUESTIONS;

    // ══════════════════════════════════════════════════════════
    // AUDIO ENGINE — Tick-Tock
    // ══════════════════════════════════════════════════════════
    let audioCtx = null;

    function ensureAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio not available');
                soundEnabled = false;
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTick(isUrgent = false) {
        if (!soundEnabled || !audioCtx) return;

        // Tick-tock εναλλαγή
        tickToggle = !tickToggle;
        const baseFreq = tickToggle ? 1100 : 850;
        const freq = isUrgent ? baseFreq * 1.15 : baseFreq;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const now = audioCtx.currentTime;
        const peak = isUrgent ? 0.14 : 0.09;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    function playRevealChime() {
        if (!soundEnabled || !audioCtx) return;
        const now = audioCtx.currentTime;

        // Chord: C-E-G
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.8);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.85);
        });
    }

    function playTimeoutTone() {
        if (!soundEnabled || !audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
    }

    // Sound toggle
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('muted', !soundEnabled);
        soundToggle.querySelector('i').className = soundEnabled
            ? 'fas fa-volume-up'
            : 'fas fa-volume-mute';

        // Init audio on first user interaction
        if (soundEnabled) ensureAudio();
    });

    // ══════════════════════════════════════════════════════════
    // BUILD SLIDES
    // ══════════════════════════════════════════════════════════
    function buildSlides() {
        let html = '';

        // Cover
        html += `
            <div class="slide cover-slide active" data-slide="0">
                <div class="cover-badge">
                    <i class="fas fa-landmark"></i> ΕΚΠΑΙΔΕΥΤΙΚΟ ΠΡΟΓΡΑΜΜΑ
                </div>
                <h1 class="cover-title">${data.cardTitle}</h1>
                <p class="cover-desc">
                    ${TOTAL_QUESTIONS} ερωτήσεις για το Κάστρο Καλλιθέας —
                    διάρκεια ${TIMER_SECONDS} δευτ. ανά ερώτηση
                </p>
                <div class="cover-instruction">
                    <p><i class="fas fa-pen"></i> Πάρτε την κάρτα σας και γράψτε το όνομά σας.</p>
                    <p><i class="fas fa-eye"></i> Διαλέξτε την απάντηση που νομίζετε σωστή.</p>
                    <p><i class="fas fa-star"></i> Κερδίστε ένα αυτοκόλλητο για κάθε σωστή απάντηση.</p>
                </div>
                <button class="btn-pres btn-start" onclick="startQuiz()">
                    <i class="fas fa-play"></i> Έναρξη
                </button>
            </div>
        `;

        // Questions
        data.questions.forEach((q, idx) => {
            const opts = q.options.map((opt, j) => `
                <div class="option-card" data-correct="${!!opt.correct}">
                    <div class="option-letter">${LETTERS[j]}</div>
                    <div class="option-text">${opt.t}</div>
                </div>
            `).join('');

            html += `
                <div class="slide question-slide" data-slide="${idx + 1}">
                    <div class="slide-icon"><i class="${q.icon}"></i></div>
                    <h2 class="slide-question">${q.q}</h2>
                    <div class="options-grid">${opts}</div>
                </div>
            `;
        });

        // End
        html += `
            <div class="slide end-slide" data-slide="${TOTAL_QUESTIONS + 1}">
                <div class="slide-icon" style="
                    --accent-color: #86efac;
                    background: linear-gradient(135deg, rgba(74,222,128,0.22), rgba(34,163,90,0.12));
                    border-color: rgba(134,239,172,0.55);
                    color: #86efac;
                    box-shadow: 0 0 40px rgba(74,222,128,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
                ">
                    <i class="fas fa-trophy"></i>
                </div>
                <h1 class="end-title">Ολοκληρώθηκε</h1>
                <p class="end-subtitle">Κολλήστε τα αυτοκόλλητά σας στην κάρτα σας.</p>
                <div class="end-actions">
                    <button class="btn-pres btn-start" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Επανάληψη από την αρχή
                    </button>
                    <a href="index.html" class="btn-pres btn-nav-pres" style="text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Πίσω στην Αρχική
                    </a>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // ══════════════════════════════════════════════════════════
    // SHOW SLIDE
    // ══════════════════════════════════════════════════════════
    function showSlide(index) {
        const slides = container.querySelectorAll('.slide');
        if (index < 0 || index >= slides.length) return;

        slides.forEach(s => s.classList.remove('active'));
        slides[index].classList.add('active');
        currentIndex = index;
        isRevealed = false;
        stopTimer();

        const pct = (index / (slides.length - 1)) * 100;
        progressFill.style.width = pct + '%';

        const isQuestion = index >= 1 && index <= TOTAL_QUESTIONS;
        counterCur.textContent = isQuestion ? index : (index === 0 ? 0 : TOTAL_QUESTIONS);

        btnPrev.disabled = (index === 0);
        btnNext.disabled = (index === slides.length - 1);
        btnReveal.disabled = !isQuestion || isRevealed;

        if (isQuestion) {
            timerBox.classList.remove('hidden');
            startTimer();
        } else {
            timerBox.classList.add('hidden');
        }
    }

    // ══════════════════════════════════════════════════════════
    // TIMER with TICK-TOCK
    // ══════════════════════════════════════════════════════════
    function startTimer() {
        ensureAudio();
        timeLeft = TIMER_SECONDS;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            // Tick-tock κάθε δευτερόλεπτο
            const isUrgent = timeLeft <= 5;
            playTick(isUrgent);

            if (timeLeft <= 0) {
                stopTimer();
                playTimeoutTone();
                if (!isRevealed) revealAnswer();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        timerNumber.textContent = timeLeft;
        const offset = CIRCLE_LENGTH * (1 - timeLeft / TIMER_SECONDS);
        timerRing.style.strokeDashoffset = offset;

        timerBox.classList.remove('warning', 'danger');
if (timeLeft <= 3) timerBox.classList.add('danger');
else if (timeLeft <= 6) timerBox.classList.add('warning');
    }

    // ══════════════════════════════════════════════════════════
    // REVEAL
    // ══════════════════════════════════════════════════════════
    function revealAnswer() {
        if (isRevealed) return;
        const slides = container.querySelectorAll('.slide');
        const activeSlide = slides[currentIndex];
        if (!activeSlide) return;

        activeSlide.querySelectorAll('.option-card').forEach(opt => {
            opt.classList.add('revealed');
            if (opt.dataset.correct === 'true') opt.classList.add('correct');
        });

        isRevealed = true;
        stopTimer();
        btnReveal.disabled = true;
        playRevealChime();
    }

    // ══════════════════════════════════════════════════════════
    // NAVIGATION
    // ══════════════════════════════════════════════════════════
    window.startQuiz = function () {
        ensureAudio();
        showSlide(1);
    };

    function nextSlide() {
        const slides = container.querySelectorAll('.slide');
        if (currentIndex < slides.length - 1) showSlide(currentIndex + 1);
    }

    function prevSlide() {
        if (currentIndex > 0) showSlide(currentIndex - 1);
    }

    // ══════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════
    btnPrev.addEventListener('click', prevSlide);
    btnNext.addEventListener('click', nextSlide);
    btnReveal.addEventListener('click', revealAnswer);

    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
        else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const isQuestion = currentIndex >= 1 && currentIndex <= TOTAL_QUESTIONS;
            if (isQuestion && !isRevealed) revealAnswer();
            else nextSlide();
        }
        else if (e.key === 'Home') { e.preventDefault(); showSlide(0); }
        else if (e.key === 'End') {
            e.preventDefault();
            const slides = container.querySelectorAll('.slide');
            showSlide(slides.length - 1);
        }
    });

    // Touch swipe
    let touchStartX = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    document.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (dx < -60) nextSlide();
        else if (dx > 60) prevSlide();
    }, { passive: true });

    // ══════════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════════
    buildSlides();
    showSlide(0);
});