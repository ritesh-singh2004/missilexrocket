gsap.registerPlugin(ScrollTrigger);

let scene, camera, renderer, hand3D, stars, particles;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('space-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    createStarfield();
    createHand3D();
    createParticles();
    createNebula();
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    animate();
}

function createStarfield() {
    const g = new THREE.BufferGeometry(), v = [];
    for (let i = 0; i < 12000; i++) {
        v.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 }));
    scene.add(stars);
}

function createHand3D() {
    const handGroup = new THREE.Group();
    
    const palmGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const palmMaterial = new THREE.MeshPhongMaterial({
        color: 0x00d4ff,
        shininess: 100,
        transparent: true,
        opacity: 0.8,
        wireframe: false
    });
    const palm = new THREE.Mesh(palmGeometry, palmMaterial);
    palm.scale.set(1.2, 0.8, 0.4);
    handGroup.add(palm);

    const fingerPositions = [
        { x: -1.2, y: 1.5, z: 0 },
        { x: -0.4, y: 2.0, z: 0 },
        { x: 0.4, y: 2.0, z: 0 },
        { x: 1.2, y: 1.5, z: 0 },
        { x: 1.8, y: 0.3, z: 0 }
    ];

    fingerPositions.forEach((pos, i) => {
        const fingerGroup = new THREE.Group();
        
        const joint1 = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0x06ffa5, shininess: 100 })
        );
        joint1.position.set(pos.x, pos.y, pos.z);
        fingerGroup.add(joint1);

        const joint2 = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0x06ffa5, shininess: 100 })
        );
        joint2.position.set(pos.x, pos.y + 0.6, pos.z);
        fingerGroup.add(joint2);

        const joint3 = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0x06ffa5, shininess: 100 })
        );
        joint3.position.set(pos.x, pos.y + 1.1, pos.z);
        fingerGroup.add(joint3);

        const boneGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
        const boneMat = new THREE.MeshPhongMaterial({ color: 0x7c3aed, shininess: 100 });
        
        const bone1 = new THREE.Mesh(boneGeom, boneMat);
        bone1.position.set(pos.x, pos.y + 0.3, pos.z);
        bone1.rotation.z = Math.PI / 2;
        fingerGroup.add(bone1);

        const bone2 = new THREE.Mesh(boneGeom, boneMat);
        bone2.position.set(pos.x, pos.y + 0.85, pos.z);
        bone2.rotation.z = Math.PI / 2;
        fingerGroup.add(bone2);

        handGroup.add(fingerGroup);
    });

    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(0x00d4ff) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(glowColor, intensity * 0.5);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    handGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 32), glowMaterial));

    for (let i = 0; i < 20; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x06ffa5, transparent: true, opacity: 0.6 })
        );
        particle.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2
        );
        particle.userData = {
            speed: Math.random() * 0.02 + 0.01,
            radius: Math.random() * 0.5 + 0.3,
            angle: Math.random() * Math.PI * 2
        };
        handGroup.add(particle);
    }

    handGroup.position.set(-10, 2, -5);
    hand3D = handGroup;
    scene.add(handGroup);
}

function createParticles() {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(5000);
    const c = new Float32Array(5000);
    const c1 = new THREE.Color(0x00d4ff);
    const c2 = new THREE.Color(0x06ffa5);
    
    for (let i = 0; i < 5000; i += 3) {
        p[i] = (Math.random() - 0.5) * 100;
        p[i + 1] = (Math.random() - 0.5) * 100;
        p[i + 2] = (Math.random() - 0.5) * 100;
        const co = c1.clone().lerp(c2, Math.random());
        c[i] = co.r;
        c[i + 1] = co.g;
        c[i + 2] = co.b;
    }
    
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    particles = new THREE.Points(g, new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    }));
    scene.add(particles);
}

function createNebula() {
    const nm = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            float noise(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            float fbm(vec2 st) {
                float value = 0.0, amplitude = 0.5;
                for (int i = 0; i < 5; i++) {
                    value += amplitude * noise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            void main() {
                vec2 st = vUv;
                float n = fbm(st * 3.0 + time * 0.05);
                vec3 finalColor = mix(vec3(0.0, 0.1, 0.2), vec3(0.0, 0.2, 0.4), n);
                finalColor = mix(finalColor, vec3(0.0, 0.3, 0.2), fbm(st * 2.0 - time * 0.03));
                gl_FragColor = vec4(finalColor, n * 0.3);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), nm);
    nebula.position.z = -50;
    scene.add(nebula);
}

function onMouseMove(e) {
    mouseX = (e.clientX - windowHalfX) * 0.5;
    mouseY = (e.clientY - windowHalfY) * 0.5;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;
    
    if (stars) {
        stars.rotation.y += 0.0002;
        stars.rotation.x += 0.0001;
    }
    
    if (hand3D) {
        hand3D.rotation.y += 0.005;
        hand3D.position.y = 2 + Math.sin(time * 0.5) * 0.5;
        
        hand3D.children.forEach((child, i) => {
            if (child.isGroup && child.children.length > 3) {
                child.children.forEach((joint, j) => {
                    if (joint.isMesh) {
                        joint.position.y += Math.sin(time * 2 + i * 0.5 + j * 0.3) * 0.002;
                    }
                });
            }
        });
    }
    
    if (particles) {
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;
    }
    
    camera.position.x += (targetX * 0.1 - camera.position.x) * 0.02;
    camera.position.y += (-targetY * 0.1 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

function initAnimations() {
    gsap.to('.hero-badge', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.3 });
    gsap.to('.title-line', { opacity: 1, y: 0, skewY: 0, duration: 1.2, stagger: 0.2, ease: 'power4.out', delay: 0.5 });
    gsap.to('.hero-description', { opacity: 1, y: 0, skewY: 0, duration: 1, ease: 'power3.out', delay: 1.2 });
    gsap.to('.hero-stats', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 1.4 });
    gsap.to('.hero-buttons', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 1.6 });
    gsap.to('.mission-status', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 2 });
    
    document.querySelectorAll('.stat-number').forEach(s => {
        gsap.to(s, {
            innerHTML: parseInt(s.getAttribute('data-target')),
            duration: 2,
            snap: { innerHTML: 1 },
            ease: 'power2.out',
            delay: 1.5
        });
    });

    ScrollTrigger.create({
        trigger: '#about',
        start: 'top center',
        onEnter: () => {
            gsap.to('.about-card', { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.7)' });
            gsap.to('#about .section-label', { opacity: 1, y: 0, duration: 0.6 });
            gsap.to('#about .section-title', { opacity: 1, y: 0, skewY: 0, duration: 0.8, delay: 0.2 });
            gsap.to('#about .section-subtitle', { opacity: 1, y: 0, duration: 0.8, delay: 0.4 });
        }
    });

    ScrollTrigger.create({
        trigger: '#features',
        start: 'top center',
        onEnter: () => {
            gsap.to('.feature-card', { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
            gsap.to('#features .section-label', { opacity: 1, y: 0, duration: 0.6 });
            gsap.to('#features .section-title', { opacity: 1, y: 0, skewY: 0, duration: 0.8, delay: 0.2 });
        }
    });

    ScrollTrigger.create({
        trigger: '#demo',
        start: 'top center',
        onEnter: () => {
            gsap.to('#demo .section-label', { opacity: 1, y: 0, duration: 0.6 });
            gsap.to('#demo .section-title', { opacity: 1, y: 0, skewY: 0, duration: 0.8, delay: 0.2 });
            gsap.to('#demo .section-subtitle', { opacity: 1, y: 0, duration: 0.8, delay: 0.4 });
            gsap.fromTo('.demo-container', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, delay: 0.6 });
        }
    });

    ScrollTrigger.create({
        trigger: '#tech',
        start: 'top center',
        onEnter: () => {
            gsap.to('.tech-item', { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
            gsap.to('#tech .section-label', { opacity: 1, y: 0, duration: 0.6 });
            gsap.to('#tech .section-title', { opacity: 1, y: 0, skewY: 0, duration: 0.8, delay: 0.2 });
        }
    });

    ScrollTrigger.create({
        trigger: '#contact',
        start: 'top center',
        onEnter: () => {
            gsap.to('.info-item', { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' });
            gsap.to('.form-input, .form-textarea', { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.3 });
            gsap.to('.submit-btn', { opacity: 1, y: 0, duration: 0.6, delay: 0.6 });
            gsap.to('#contact .section-label', { opacity: 1, y: 0, duration: 0.6 });
            gsap.to('#contact .section-title', { opacity: 1, y: 0, skewY: 0, duration: 0.8, delay: 0.2 });
        }
    });
}

function initNavigation() {
    const h = document.querySelector('.nav-hamburger');
    const nl = document.querySelector('.nav-links');
    
    h.addEventListener('click', () => {
        h.classList.toggle('active');
        nl.classList.toggle('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(l => {
        l.addEventListener('click', (e) => {
            e.preventDefault();
            h.classList.remove('active');
            nl.classList.remove('active');
            const href = l.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
    
    window.addEventListener('scroll', () => {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
        const sections = ['home', 'about', 'features', 'demo', 'tech', 'contact'];
        let current = 'home';
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.getBoundingClientRect().top <= 150) current = id;
        });
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === '#' + current);
        });
    });
}

function initDemo() {
    const startBtn = document.getElementById('startDemo');
    const stopBtn = document.getElementById('stopDemo');
    const video = document.getElementById('demo-video');
    const canvas = document.getElementById('demo-canvas');
    const gestureName = document.getElementById('gesture-name');
    let stream = null;
    let animFrame = null;

    const gestures = ['None', 'Open Palm', 'Fist', 'Point', 'Peace', 'Thumbs Up', 'Swipe Left', 'Swipe Right', 'Pinch', 'Wave'];

    startBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
            video.srcObject = stream;
            startBtn.textContent = 'CAMERA ACTIVE';
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            
            simulateGestureDetection();
        } catch (err) {
            console.error('Camera access denied:', err);
            gestureName.textContent = 'Camera access denied';
        }
    });

    stopBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            startBtn.textContent = 'START CAMERA';
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            gestureName.textContent = 'None';
            if (animFrame) cancelAnimationFrame(animFrame);
        }
    });

    function simulateGestureDetection() {
        let lastGesture = 'None';
        let counter = 0;
        
        function detect() {
            counter++;
            if (counter % 60 === 0) {
                const newGesture = gestures[Math.floor(Math.random() * gestures.length)];
                if (newGesture !== lastGesture) {
                    lastGesture = newGesture;
                    gestureName.textContent = newGesture;
                    gestureName.style.transform = 'scale(1.2)';
                    setTimeout(() => { gestureName.style.transform = 'scale(1)'; }, 200);
                }
            }
            animFrame = requestAnimationFrame(detect);
        }
        detect();
    }
}

function initContactForm() {
    const form = document.querySelector('.contact-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('Message sent successfully!');
        form.reset();
    });
}

function showNotification(msg) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 30px;background:var(--primary);color:white;font-family:Orbitron,monospace;font-size:0.8rem;letter-spacing:0.1em;border-radius:5px;z-index:100000;box-shadow:0 5px 20px rgba(0,212,255,0.4);';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transition = 'opacity 0.3s ease';
        setTimeout(() => n.remove(), 300);
    }, 3000);
}

window.addEventListener('load', () => {
    init();
    initNavigation();
    initDemo();
    initContactForm();
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        initAnimations();
    }, 2000);
});
