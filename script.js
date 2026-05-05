// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

// 1. Intro Screen Logic
const introScreen = document.getElementById('intro-screen');
const startBtn = document.getElementById('start-btn');
let appStarted = false;

startBtn.addEventListener('click', () => {
    appStarted = true;
    introScreen.classList.add('fade-out');
    gsap.to(cursor, { opacity: 1, duration: 1 }); // Show cursor
    if (typeof initAudio === 'function') initAudio();
    
    // Start camera after interaction
    if (typeof camera !== 'undefined') {
        camera.start().catch(err => console.error("Camera error:", err));
    }
});

// Power Optimization: Pause camera when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (!appStarted || typeof camera === 'undefined') return;
    if (document.hidden) {
        videoElement.pause();
    } else {
        videoElement.play();
    }
});

// Custom Cursor
const cursor = document.querySelector('.custom-cursor');
document.addEventListener('mousemove', (e) => {
    if (!appStarted) return;
    gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1
    });
});

// 2. Three.js 3D Background
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg-canvas'),
    antialias: true,
    alpha: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera3D.position.setZ(30);

// Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 5000;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.005,
    color: '#d4a017'
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Animation Loop for 3D
function animate3D() {
    requestAnimationFrame(animate3D);
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;
    renderer.render(scene, camera3D);
}
animate3D();

// 3. Scroll Animations (GSAP)
const sections = document.querySelectorAll('.leader-section');
const activeYearEl = document.getElementById('active-year');

// Set initial state via JS (Fallback: if JS fails, CSS keeps them visible)
gsap.set(sections, { opacity: 0, y: 50 });

sections.forEach((section, i) => {
    const content = section.querySelector('.section-content');
    const img = section.querySelector('.parallax-img-container');
    const text = section.querySelector('.text-content');
    const year = section.getAttribute('data-year');

    // Reveal Animation
    gsap.to(section, {
        scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play reverse play reverse",
            onEnter: () => {
                updateYear(year);
            },
            onEnterBack: () => {
                updateYear(year);
            }
        },
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: "power4.out"
    });

    // Parallax on Images
    gsap.to(img, {
        scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true
        },
        y: -100,
        ease: "none"
    });

    // Parallax on Text
    gsap.to(text, {
        scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true
        },
        y: 50,
        ease: "none"
    });
});

// Update Year Indicator
function updateYear(targetYear) {
    gsap.to(activeYearEl, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
            activeYearEl.innerText = targetYear;
            gsap.to(activeYearEl, {
                opacity: 0.2,
                duration: 0.2
            });
        }
    });
}

// Progress Bar
gsap.to('.progress-bar', {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
        scrub: 0.3
    }
});

// 4. Hand Tracking Interaction
const videoElement = document.getElementById('webcam');
const debugCanvas = document.getElementById('debug-canvas');
const canvasCtx = debugCanvas.getContext('2d');
const handIndicator = document.getElementById('hand-indicator');
let isFist = false;

// MediaPipe Setup
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

function onResults(results) {
    // 1. Draw Debug Preview (Only landmarks, no video feed)
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    // canvasCtx.drawImage(results.image, 0, 0, debugCanvas.width, debugCanvas.height); // Removed video feed
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handIndicator.classList.add('active');
        const landmarks = results.multiHandLandmarks[0];
        
        // Draw landmarks for feedback
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#d4a017', lineWidth: 2});
        drawLandmarks(canvasCtx, landmarks, {color: '#ffffff', lineWidth: 1, radius: 2});

        // 2. Position Mapping
        const rawX = landmarks[9].x;
        const rawY = landmarks[9].y;
        const x = (1 - rawX) * window.innerWidth;
        const y = rawY * window.innerHeight;
        gsap.to(cursor, { x: x, y: y, duration: 0.1 });

        // 3. Scroll Control (Robust Joystick)
        const centerY = 0.5;
        const deadzone = 0.12; 
        const diff = rawY - centerY;

        if (Math.abs(diff) > deadzone) {
            const direction = diff > 0 ? 1 : -1;
            const sensitivity = isMobile ? 25 : 40;
            const scrollSpeed = Math.abs(diff) * sensitivity; 
            window.scrollBy(0, direction * scrollSpeed);
        }

        // 4. 3D Tilt
        const activeSection = document.querySelector('.leader-section');
        if (activeSection) {
            const content = activeSection.querySelector('.section-content');
            if (content) {
                gsap.to(content, { 
                    rotateY: (rawX - 0.5) * 30, 
                    rotateX: (rawY - 0.5) * -30, 
                    duration: 0.5 
                });
            }
        }

        // 5. Gesture Control for Modal
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinkyTip = landmarks[20];
        const distFist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        const distSpread = Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y);
        
        // Open with Fist
        if (distFist < 0.07 && !isFist && !modal.classList.contains('active')) {
            isFist = true;
            onFistGrip();
        } 
        // Close with Open Hand (Spread)
        else if (distSpread > 0.25 && modal.classList.contains('active')) {
            closeModal();
        }
        
        if (distFist > 0.1) {
            isFist = false;
        }

        // 6. Victory Gesture
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        if (isIndexUp && isMiddleUp && landmarks[16].y > landmarks[14].y) {
            triggerVictoryEffect();
        }

    } else {
        handIndicator.classList.remove('active');
    }
    canvasCtx.restore();
}

hands.onResults(onResults);

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: isMobile ? 320 : 640,
    height: isMobile ? 240 : 480,
    facingMode: 'user'
});

// Camera is started via the Intro Screen "Start Journey" button

// 5. Detailed Biographies Data
const leaderData = {
    "سەڵاحەدینی ئەیوبی": {
        img: "SS.jpg",
        subtitle: "دامەزرێنەری دەوڵەتی ئەیوبی",
        bio: "سەڵاحەدین یەکێکە لە ناودارترین کەسایەتییەکانی مێژووی ئیسلامی و کوردی. ئەو نەک هەر فەرماندەیەکی سەربازی بلیمەت بوو، بەڵکو بە دادپەروەری و لێبوردەیی بەرامبەر دوژمنەکانی ناسرابوو. توانی میسر و شام و جەزیرە یەک بخات و لە ساڵی ١١٨٧دا قودس لە چنگی خاچپەرستەکان ڕزگار بکات. سەڵاحەدین هەمیشە وەک هێمایەکی کوردایەتی و ئاییندۆستی دەمێنێتەوە."
    },
    "شەرەفخانی بدلیسی": {
        img: "SHA.jpg",
        subtitle: "مێژوونووس و میری بدلیس",
        bio: "شەرەفخان نەک هەر میرێکی سیاسی بوو، بەڵکو گەورەترین مێژوونووسی کوردە. کتێبی 'شەرەفنامە'ی لە ساڵی ١٥٩٧دا نووسیوە کە مێژووی هەموو میرنشین و هۆزە کوردییەکان لەخۆ دەگرێت. ئەم کتێبە بە یەکەمین بەڵگەی مێژوویی دادەنرێت کە ناسنامەی نەتەوەیی کوردی تێدا جێگیر کراوە."
    },
    "شێخ مەحموودی حەفید": {
        img: "MH.jpg",
        subtitle: "مەلیکی کوردستان",
        bio: "شێخ مەحموود ڕابەری چەندین شۆڕش بوو دژی داگیرکاریی بەریتانیا. ئەو لە سلێمانی حکومەتی کوردی ڕاگەیاند و دواتر وەک مەلیکی کوردستان ناسرا. شێخ مەحموود یەکەمین سەرکردە بوو کە داوای سەربەخۆیی تەواوەتی بۆ باشووری کوردستان کرد و ئاڵای و مۆرکی تایبەت بە حکومەتەکەی هەبوو."
    },
    "سمکۆی شکاک": {
        img: "SM.jpg",
        subtitle: "سەردار و شۆڕشگێڕی کورد",
        bio: "ئیسماعیل ئاغای شکاک ناسراو بە سمکۆ، یەکێک لە بەهێزترین سەرکردەکانی ڕۆژهەڵاتی کوردستان بوو. ئەو توانی ناوچەیەکی فراوان لە ژێر دەسەڵاتی ئێراندا ڕزگار بکات و بۆ ماوەی چەندین ساڵ ئیدارەیەکی کوردی سەربەخۆ بەڕێوە ببات. سمکۆ هەمیشە خەونی بە یەکگرتنی هەموو پارچەکانی کوردستانەوە دەبینی."
    },
    "قازی محەممەد": {
        img: "QM.jpg",
        subtitle: "سەرۆک کۆماری کوردستان",
        bio: "پێشەوا قازی محەممەد دامەزرێنەری کۆماری کوردستان بوو لە مەهاباد (١٩٤٦). ئەو کەسایەتییەکی ڕۆشنبیر و سیاسی بوو کە توانی بۆ یەکەمجار لە مێژووی هاوچەرخی کورددا کۆمارێکی دیموکراتی دابمەزرێنێت. وەسێتنامەکەی قازی محەممەد تا ئێستاش وەک نەخشەڕێگایەک بۆ یەکڕیزیی نەتەوەیی کورد دادەنرێت."
    },
    "مستەفا بارزانی": {
        img: "MB.jpg",
        subtitle: "باوکی ڕۆحی نەتەوەی کورد",
        bio: "مەلا مستەفا بارزانی ڕێبەر و جەنەراڵێکی بێ وێنە بوو کە زۆربەی ژیانی لە شاخ و خەباتدا بەسەر برد. ئەو ڕێبەرایەتی شۆڕشی مەزنی ئەیلوولی کرد کە گەورەترین شۆڕشی نەتەوەیی کورد بوو. بارزانی توانی دۆزی کورد بگەیەنێتە ناوەندە نێودەوڵەتییەکان و ڕێککەوتننامەی ١١ی ئازاری ١٩٧٠ بەدەست بهێنێت."
    },
    "لەیلا قاسم": {
        img: "LQ.jpg",
        subtitle: "بووکی کوردستان",
        bio: "لەیلا قاسم تێکۆشەرێکی زانکۆ و نیشتمانپەروەر بوو کە لە تەمەنێکی گەنجدا لەلایەن ڕژێمی بەعسەوە لەسێدارە درا. ئەو پێش شەهیدبوونی ئاڵای کوردستان و قژی خۆی وەک هێمایەک بۆ بەردەوامیی خەبات بەجێهێشت. لەیلا بووە یەکەمین ژن کە لە مێژووی سیاسی کورددا بەو شێوەیە گیانی خۆی فیدا بکات."
    },
    "ئیدریس بارزانی": {
        img: "DRIS.jpg",
        subtitle: "ئەندازیاری تەبایی و ئاشتی",
        bio: "ئیدریس بارزانی سەرکردەیەکی سیاسی و دیپلۆماتکار بوو کە ڕۆڵێکی کلیلی هەبوو لە یەکخستنی ماڵی کورد و دامەزراندنی بەرەی کوردستانی. ئەو بە کەسایەتییەکی هێمن و ئاشتیخواز ناسرابوو کە هەموو هەوڵێکی بۆ ئەوە بوو لایەنە کوردییەکان پێکەوە دژی داگیرکەران تێبکۆشن."
    },
    "مەسعوود بارزانی": {
        img: "KK.jpg",
        subtitle: "سەرۆکی پێشووی هەرێمی کوردستان",
        bio: "سەرۆک مەسعوود بارزانی لە ناو شۆڕشدا گەورە بووە و یەکێکە لە کاریزماتیکترین سەرکردەکانی ئێستای کورد. ئەو ڕێبەرایەتی هەرێمی کوردستانی کرد لە قۆناغە سەختەکاندا و بڕیاردەری سەرەکی بوو لە ئەنجامدانی ڕیفراندۆمی سەربەخۆیی کوردستان لە ساڵی ٢٠١٧دا."
    },
    "نێچیرڤان بارزانی": {
        img: "NE.jpg",
        subtitle: "سەرۆکی هەرێمی کوردستان",
        bio: "نێچیرڤان بارزانی بە نژیاروانی ئاوەدانی و دیپلۆماسی کوردستان دەناسرێت. ئەو توانی کوردستان بکاتە ناوەندێکی ئابووری و دیپلۆماسی گرنگ لە ناوچەکەدا. هەمیشە جەخت لەسەر پێکەوەژیانی ئایینی و نەتەوەیی دەکاتەوە و وەک سەرکردەیەکی میانڕەو لە ئاستی جیهاندا ناسراوە."
    },
    "مەسرور بارزانی": {
        img: "ASROUR.jpg",
        subtitle: "سەرۆکی حکومەتی هەرێمی کوردستان",
        bio: "مەسرور بارزانی سەرۆک وەزیرانی کابینەی نۆیەمە، کە کار دەکات بۆ گۆڕینی هەرێمی کوردستان بۆ کیانێکی بەهێز و دیجیتاڵی. پڕۆژەکانی چاکسازی و هەمەجۆرکردنی ئابووری لە ئەولەویەتەکانی کارەکانین تاوەکو کوردستان بگاتە ئاستی وڵاتە پێشکەوتووەکان."
    }
};

// Modal Elements
const modal = document.getElementById('details-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalBio = document.getElementById('modal-bio');
const closeBtn = document.querySelector('.modal-close');

// 6. Audio Control
const bgMusic = document.getElementById('bg-music');
const sfxOpen = document.getElementById('sfx-open');
const sfxClose = document.getElementById('sfx-close');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = soundToggle.querySelector('.sound-icon');
let isMuted = true;

soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
        bgMusic.pause();
        soundIcon.innerText = '🔇';
    } else {
        bgMusic.play();
        soundIcon.innerText = '🔊';
    }
});

// Auto-play music on first interaction
function initAudio() {
    if (isMuted) {
        isMuted = false;
        bgMusic.volume = 0.5;
        bgMusic.play();
        soundIcon.innerText = '🔊';
    }
    document.removeEventListener('click', initAudio);
}
document.addEventListener('click', initAudio);

function openModal(leaderName) {
    const data = leaderData[leaderName];
    if (data) {
        if (!isMuted) sfxOpen.play();
        modalImg.src = data.img;
        modalTitle.innerText = leaderName;
        modalSubtitle.innerText = data.subtitle;
        modalBio.innerText = data.bio;
        modal.classList.add('active');
    }
}

function closeModal() {
    if (!isMuted) sfxClose.play();
    modal.classList.remove('active');
}

closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Update Gesture Actions
function onFistGrip() {
    gsap.to(cursor, { scale: 4, duration: 0.2, yoyo: true, repeat: 1 });
    
    // Find visible section
    const sections = document.querySelectorAll('.leader-section');
    sections.forEach(s => {
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
            const name = s.querySelector('.leader-name').innerText;
            openModal(name);
        }
    });
}

let effectCooldown = false;
function triggerVictoryEffect() {
    if (effectCooldown) return;
    effectCooldown = true;
    const colors = ['#8b0000', '#ffffff', '#006400', '#d4a017'];
    let colorIdx = 0;
    const interval = setInterval(() => {
        if (typeof particlesMaterial !== 'undefined') particlesMaterial.color.set(colors[colorIdx++ % 4]);
    }, 200);

    const msg = document.createElement('div');
    msg.innerText = "بژی کوردستان";
    msg.className = "victory-msg";
    document.body.appendChild(msg);
    
    gsap.to(msg, { opacity: 1, scale: 1.5, duration: 0.5, yoyo: true, repeat: 1, onComplete: () => {
        msg.remove();
        if (typeof particlesMaterial !== 'undefined') particlesMaterial.color.set('#d4a017'); 
        setTimeout(() => effectCooldown = false, 2000);
        clearInterval(interval);
    }});
}

window.addEventListener('resize', () => {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 7. Security: Disable Right-click and Inspect shortcuts
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect)
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault();
        return false;
    }
    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
    }
    // Disable Ctrl+S (Save Page)
    if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
    }
});

