gsap.registerPlugin(ScrollTrigger);

const API = 'http://localhost:5000/api';
let authToken = localStorage.getItem('missilex_token') || null;

async function apiFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    const res = await fetch(API + path, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

let scene, camera, renderer, earth, stars, particles, missileScene;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

let currentUser = null;
let myProjects = [];
let myCertificates = [];
let deployAuth = { github: false, vercel: false, vscode: false };

const missileData = {
    agni5: { name: 'Agni-V', range: '5,000+ km', type: 'ICBM', payload: '1,000 kg', stages: '3' },
    agni4: { name: 'Agni-IV', range: '4,000+ km', type: 'IRBM', payload: '1,000 kg', stages: '3' },
    prithvi: { name: 'Prithvi', range: '350 km', type: 'SRBM', payload: '1,000 kg', stages: '1' },
    brahmos: { name: 'BrahMos', range: '290 km', type: 'Cruise', payload: '300 kg', stages: '2' }
};

const projectsData = {
    p1: { title: 'Mars Rover Navigation AI', category: 'NASA', duration: '12 weeks', difficulty: 'Advanced', desc: 'Develop autonomous navigation algorithms for Mars surface exploration using computer vision and sensor fusion.', modules: [
        { title: 'Introduction to Mars Navigation', tasks: ['Study Mars terrain characteristics', 'Review NASA JPL navigation papers', 'Set up development environment'] },
        { title: 'Computer Vision Basics', tasks: ['Learn OpenCV fundamentals', 'Implement feature detection', 'Build image preprocessing pipeline'] },
        { title: 'SLAM Algorithm Implementation', tasks: ['Study SLAM theory', 'Implement visual SLAM', 'Test with simulated Mars data'] },
        { title: 'Sensor Fusion Integration', tasks: ['Combine camera + IMU data', 'Implement Kalman filtering', 'Validate sensor fusion accuracy'] },
        { title: 'Final Testing & Deployment', tasks: ['Run full navigation simulation', 'Optimize performance', 'Document project results'] }
    ]},
    p2: { title: 'Chandrayaan Landing Simulation', category: 'ISRO', duration: '8 weeks', difficulty: 'Intermediate', desc: 'Build a real-time simulation of the soft landing sequence using physics-based modeling and control systems.', modules: [
        { title: 'Lunar Physics Fundamentals', tasks: ['Study lunar gravity model', 'Learn orbital mechanics basics', 'Set up physics engine'] },
        { title: 'Descent Phase Modeling', tasks: ['Implement powered descent', 'Build throttle control system', 'Simulate thruster firing'] },
        { title: 'Navigation & Control', tasks: ['Develop guidance algorithms', 'Implement attitude control', 'Test landing site selection'] },
        { title: 'Final Landing Sequence', tasks: ['Integrate all subsystems', 'Run full simulation', 'Analyze landing accuracy'] }
    ]},
    p3: { title: 'Tejas MK2 Flight Simulator', category: 'IAF', duration: '10 weeks', difficulty: 'Advanced', desc: 'Build a real-time flight simulator for the indigenous Tejas MK2 fighter jet with aerodynamic modeling.', modules: [
        { title: 'Aerodynamics Fundamentals', tasks: ['Study Tejas MK2 specifications', 'Learn flight dynamics equations', 'Model lift and drag coefficients'] },
        { title: 'Flight Physics Engine', tasks: ['Implement 6-DOF simulation', 'Build engine thrust model', 'Model control surface responses'] },
        { title: 'Cockpit Interface', tasks: ['Design HUD display', 'Implement instrument panel', 'Build heads-up display overlay'] },
        { title: 'Mission Scenarios', tasks: ['Create combat scenarios', 'Implement weapon systems', 'Test pilot workload metrics'] },
        { title: 'Final Validation', tasks: ['Compare with IAF data', 'Optimize frame rate', 'Complete flight manual'] }
    ]},
    p4: { title: 'Submarine Sonar Analysis', category: 'Navy', duration: '8 weeks', difficulty: 'Intermediate', desc: 'Analyze sonar data patterns for underwater object detection and classification using machine learning.', modules: [
        { title: 'Sonar Signal Processing', tasks: ['Study acoustic propagation', 'Learn sonar equation basics', 'Set up signal processing pipeline'] },
        { title: 'Data Collection & Labeling', tasks: ['Gather sonar datasets', 'Label target signatures', 'Create training data splits'] },
        { title: 'ML Model Development', tasks: ['Build classification CNN', 'Train on sonar spectrograms', 'Implement real-time detection'] },
        { title: 'Testing & Optimization', tasks: ['Validate against test data', 'Reduce false positive rate', 'Deploy model to edge device'] }
    ]},
    p5: { title: 'Tank Target Tracking AI', category: 'ARMY', duration: '6 weeks', difficulty: 'Intermediate', desc: 'Develop real-time target acquisition and tracking algorithms for Arjun MK1A armored systems.', modules: [
        { title: 'Target Recognition Fundamentals', tasks: ['Study armored vehicle signatures', 'Learn thermal imaging basics', 'Set up detection pipeline'] },
        { title: 'Object Detection Model', tasks: ['Train YOLO on military vehicles', 'Implement multi-target tracking', 'Add bounding box optimization'] },
        { title: 'Tracking & Prediction', tasks: ['Build Kalman tracker', 'Implement trajectory prediction', 'Handle occlusion scenarios'] },
        { title: 'Integration & Testing', tasks: ['Test with video feeds', 'Measure detection latency', 'Optimize for edge deployment'] }
    ]},
    p6: { title: 'Satellite Image Classification', category: 'AI', duration: '6 weeks', difficulty: 'Intermediate', desc: 'Train deep learning models to classify satellite imagery for terrain analysis and disaster response.', modules: [
        { title: 'Remote Sensing Basics', tasks: ['Study spectral bands', 'Learn image preprocessing', 'Set up data pipeline'] },
        { title: 'Model Architecture', tasks: ['Design classification CNN', 'Implement transfer learning', 'Train on satellite datasets'] },
        { title: 'Disaster Response Module', tasks: ['Build damage detection model', 'Implement change detection', 'Test on disaster imagery'] },
        { title: 'Deployment', tasks: ['Optimize model size', 'Deploy to web interface', 'Document usage guidelines'] }
    ]},
    p7: { title: 'Guidance System Prototype', category: 'MISSILE', duration: '10 weeks', difficulty: 'Advanced', desc: 'Design and simulate inertial guidance systems for precision missile trajectory computation.', modules: [
        { title: 'Inertial Navigation Theory', tasks: ['Study IMU sensors', 'Learn navigation equations', 'Model error propagation'] },
        { title: 'Trajectory Computation', tasks: ['Implement numerical integration', 'Build gravity model', 'Calculate optimal trajectories'] },
        { title: 'Control Systems', tasks: ['Design autopilot logic', 'Implement fin actuator model', 'Test steering commands'] },
        { title: 'Simulation & Validation', tasks: ['Run Monte Carlo analysis', 'Validate CEP accuracy', 'Document test results'] }
    ]},
    p8: { title: 'Exoplanet Habitability Analysis', category: 'NASA', duration: '4 weeks', difficulty: 'Beginner', desc: 'Analyze telescope data to identify potentially habitable exoplanets using spectroscopic analysis.', modules: [
        { title: 'Exoplanet Detection Methods', tasks: ['Study transit photometry', 'Learn radial velocity method', 'Explore direct imaging'] },
        { title: 'Data Analysis Pipeline', tasks: ['Access NASA exoplanet archive', 'Clean and process light curves', 'Identify transit signals'] },
        { title: 'Habitability Assessment', tasks: ['Calculate habitable zone', 'Analyze atmospheric spectra', 'Score planet habitability'] }
    ]},
    p9: { title: 'PSLV Launch Data Analytics', category: 'ISRO', duration: '4 weeks', difficulty: 'Beginner', desc: 'Analyze historical launch data to optimize future mission parameters and fuel efficiency.', modules: [
        { title: 'Launch Vehicle Fundamentals', tasks: ['Study PSLV architecture', 'Learn rocket equation', 'Understand staging'] },
        { title: 'Data Collection', tasks: ['Gather ISRO launch records', 'Structure mission parameters', 'Create analysis database'] },
        { title: 'Optimization Analysis', tasks: ['Build parameter optimization', 'Identify fuel efficiency patterns', 'Generate recommendations'] }
    ]},
    p10: { title: 'AEW&C Radar Processing', category: 'IAF', duration: '12 weeks', difficulty: 'Advanced', desc: 'Process and analyze radar data from AWACS aircraft for threat detection and tracking systems.', modules: [
        { title: 'Radar Signal Processing', tasks: ['Study pulse-Doppler radar', 'Learn MTI filtering', 'Implement range-Doppler maps'] },
        { title: 'Target Detection', tasks: ['Build CFAR detector', 'Implement constant false alarm', 'Reduce clutter effects'] },
        { title: 'Track Management', tasks: ['Develop multi-target tracker', 'Implement track initiation', 'Handle track deletion'] },
        { title: 'Threat Assessment', tasks: ['Build threat classification', 'Implement priority scoring', 'Create situational display'] },
        { title: 'System Integration', tasks: ['Integrate all modules', 'Test with live data', 'Validate detection range'] }
    ]},
    p11: { title: 'INS Vikrant Deck Operations', category: 'Navy', duration: '10 weeks', difficulty: 'Advanced', desc: 'Simulate aircraft carrier deck operations including launch, recovery, and maintenance scheduling.', modules: [
        { title: 'Carrier Operations Fundamentals', tasks: ['Study Vikrant specifications', 'Learn deck layout', 'Understand launch/recovery cycles'] },
        { title: 'Deck Simulation', tasks: ['Build 3D deck model', 'Implement aircraft movement', 'Add constraint checking'] },
        { title: 'Scheduling Algorithm', tasks: ['Design launch schedule', 'Optimize deck utilization', 'Handle priority aircraft'] },
        { title: 'Recovery Operations', tasks: ['Model arresting gear', 'Implement approach patterns', 'Test recovery sequences'] }
    ]},
    p12: { title: 'Battlefield Drone Swarm', category: 'ARMY', duration: '12 weeks', difficulty: 'Advanced', desc: 'Design autonomous drone swarm coordination for battlefield reconnaissance and surveillance.', modules: [
        { title: 'Swarm Intelligence Basics', tasks: ['Study bio-inspired algorithms', 'Learn consensus protocols', 'Model communication networks'] },
        { title: 'Formation Control', tasks: ['Implement leader-follower', 'Build obstacle avoidance', 'Test formation flying'] },
        { title: 'Mission Planning', tasks: ['Design area coverage', 'Implement task allocation', 'Build path optimization'] },
        { title: 'Field Deployment', tasks: ['Test with real drones', 'Validate coordination', 'Document operational manual'] }
    ]},
    p13: { title: 'ISS Experiment Designer', category: 'NASA', duration: '5 weeks', difficulty: 'Beginner', desc: 'Design microgravity experiments for the International Space Station using physics simulation tools.', modules: [
        { title: 'Microgravity Science', tasks: ['Study fluid behavior in space', 'Learn crystal growth basics', 'Understand heat transfer'] },
        { title: 'Experiment Design', tasks: ['Define research objectives', 'Design experiment hardware', 'Calculate resource needs'] },
        { title: 'Simulation & Proposal', tasks: ['Run physics simulations', 'Create experiment proposal', 'Present to review board'] }
    ]},
    p14: { title: 'Autonomous Drone Navigation', category: 'AI', duration: '10 weeks', difficulty: 'Advanced', desc: 'Build GPS-denied navigation for drones using visual SLAM and reinforcement learning.', modules: [
        { title: 'Visual SLAM Implementation', tasks: ['Study ORB-SLAM paper', 'Implement feature extraction', 'Build map generation'] },
        { title: 'Reinforcement Learning', tasks: ['Design reward function', 'Train navigation policy', 'Implement PPO algorithm'] },
        { title: 'Sensor Integration', tasks: ['Fuse camera + IMU data', 'Implement state estimation', 'Test on real hardware'] },
        { title: 'Field Testing', tasks: ['Test indoor navigation', 'Handle dynamic obstacles', 'Validate flight performance'] }
    ]},
    p15: { title: 'Missile Trajectory Optimizer', category: 'MISSILE', duration: '8 weeks', difficulty: 'Advanced', desc: 'Optimize multi-stage rocket trajectories using genetic algorithms and numerical methods.', modules: [
        { title: 'Trajectory Optimization Theory', tasks: ['Study optimal control', 'Learn Pontryagin principle', 'Understand gravity turns'] },
        { title: 'Genetic Algorithm Implementation', tasks: ['Design chromosome encoding', 'Implement crossover/mutation', 'Build fitness function'] },
        { title: 'Numerical Methods', tasks: ['Implement Runge-Kutta', 'Build atmospheric model', 'Add Earth rotation effects'] },
        { title: 'Optimization & Validation', tasks: ['Run optimization trials', 'Compare with analytical solutions', 'Document results'] }
    ]}
};

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('space-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    createStarfield(); createEarth(); createParticles(); createNebula(); createMissile3D(); createMiniRockets();
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    animate();
}

function createStarfield() {
    const g = new THREE.BufferGeometry(), v = [];
    for (let i = 0; i < 15000; i++) v.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 }));
    scene.add(stars);
}

function createEarth() {
    const earthMaterial = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, glowColor: { value: new THREE.Color(0x00d4ff) } },
        vertexShader: `varying vec2 vUv; varying vec3 vNormal; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 glowColor; varying vec2 vUv; varying vec3 vNormal; float noise(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); } void main() { vec3 light = normalize(vec3(1.0, 1.0, 1.0)); float diff = max(dot(vNormal, light), 0.0); float continents = smoothstep(0.5, 0.52, noise(vUv * 10.0 + time * 0.01)); vec3 landColor = vec3(0.1, 0.4, 0.2); vec3 waterColor = vec3(0.0, 0.1, 0.3); vec3 baseColor = mix(waterColor, landColor, continents); float atmosphere = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0); vec3 finalColor = baseColor * diff + glowColor * 0.5 * atmosphere; float grid = smoothstep(0.98, 1.0, sin(vUv.x * 50.0) * sin(vUv.y * 50.0)); finalColor += vec3(0.0, 0.5, 1.0) * grid * 0.3; gl_FragColor = vec4(finalColor, 1.0); }`
    });
    earth = new THREE.Mesh(new THREE.SphereGeometry(8, 64, 64), earthMaterial);
    earth.position.set(15, 0, -10);
    scene.add(earth);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(0x00d4ff) } },
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 glowColor; varying vec3 vNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(glowColor, intensity * 0.5); }`,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
    });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(8.5, 32, 32), glowMaterial));
    const sg = new THREE.Group();
    for (let i = 0; i < 8; i++) {
        const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: 0xff6b35 }));
        sat.userData = { orbitRadius: 10 + Math.random() * 3, orbitSpeed: 0.001 + Math.random() * 0.002, orbitTilt: Math.random() * Math.PI, orbitPhase: Math.random() * Math.PI * 2 };
        sg.add(sat);
        const oc = new THREE.EllipseCurve(0, 0, sat.userData.orbitRadius, sat.userData.orbitRadius * 0.3, 0, 2 * Math.PI, false, 0);
        const ol = new THREE.Line(new THREE.BufferGeometry().setFromPoints(oc.getPoints(100)), new THREE.LineBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.2 }));
        ol.rotation.x = sat.userData.orbitTilt; sg.add(ol);
    }
    sg.userData.update = function(time) { sg.children.forEach(c => { if (c.isMesh) { const d = c.userData, a = time * d.orbitSpeed + d.orbitPhase; c.position.x = Math.cos(a) * d.orbitRadius; c.position.z = Math.sin(a) * d.orbitRadius * 0.3; c.position.y = Math.sin(d.orbitTilt) * Math.sin(a) * 2; c.rotation.x += 0.02; c.rotation.y += 0.01; } }); };
    earth.add(sg);
}

function createParticles() {
    const g = new THREE.BufferGeometry(), p = new Float32Array(6000), c = new Float32Array(6000);
    const c1 = new THREE.Color(0xff6b35), c2 = new THREE.Color(0x00d4ff);
    for (let i = 0; i < 6000; i += 3) { p[i] = (Math.random() - 0.5) * 100; p[i + 1] = (Math.random() - 0.5) * 100; p[i + 2] = (Math.random() - 0.5) * 100; const co = c1.clone().lerp(c2, Math.random()); c[i] = co.r; c[i + 1] = co.g; c[i + 2] = co.b; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    particles = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    scene.add(particles);
}

function createNebula() {
    const nm = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; varying vec2 vUv; float noise(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); } float fbm(vec2 st) { float value = 0.0, amplitude = 0.5; for (int i = 0; i < 5; i++) { value += amplitude * noise(st); st *= 2.0; amplitude *= 0.5; } return value; } void main() { vec2 st = vUv; float n = fbm(st * 3.0 + time * 0.05); vec3 finalColor = mix(vec3(0.1, 0.0, 0.2), vec3(0.0, 0.2, 0.4), n); finalColor = mix(finalColor, vec3(0.3, 0.0, 0.1), fbm(st * 2.0 - time * 0.03)); gl_FragColor = vec4(finalColor, n * 0.3); }`,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), nm);
    nebula.position.z = -50; scene.add(nebula);
}

function createMissile3D() {
    const container = document.getElementById('missile-container');
    if (!container) return;
    missileScene = new THREE.Scene();
    const mc = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    mc.position.set(5, 2, 10);
    const mr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    mr.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(mr.domElement);
    const mg = new THREE.Group();
    mg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 5, 32), new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 100 })));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 32), new THREE.MeshPhongMaterial({ color: 0xff6b35, shininess: 100 }));
    nose.position.y = 3.1; mg.add(nose);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.6), new THREE.MeshPhongMaterial({ color: 0xff6b35 })); f.position.set(Math.cos(i * Math.PI / 2) * 0.45, -2, Math.sin(i * Math.PI / 2) * 0.45); f.rotation.y = i * Math.PI / 2; mg.add(f); }
    mg.position.y = -1; missileScene.add(mg);
    missileScene.add(new THREE.AmbientLight(0x404040, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(5, 5, 5); missileScene.add(dl);
    (function anim() { requestAnimationFrame(anim); mg.rotation.y += 0.005; mg.position.y = -1 + Math.sin(Date.now() * 0.002) * 0.1; mr.render(missileScene, mc); })();
}

function createMiniRockets() {
    ['rocket-mini-1', 'rocket-mini-2', 'rocket-mini-3'].forEach((id, idx) => {
        const container = document.getElementById(id);
        if (!container) return;
        const ms = new THREE.Scene(), mc = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        mc.position.set(3, 1, 5);
        const mr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        mr.setSize(100, 150); container.appendChild(mr.domElement);
        const mg = new THREE.Group();
        mg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2, 16), new THREE.MeshPhongMaterial({ color: 0xcccccc })));
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 16), new THREE.MeshPhongMaterial({ color: [0xff6b35, 0x00d4ff, 0xff3366][idx] }));
        nose.position.y = 1.4; mg.add(nose); ms.add(mg);
        ms.add(new THREE.AmbientLight(0x404040, 0.5));
        const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(3, 3, 3); ms.add(dl);
        (function anim() { requestAnimationFrame(anim); mg.rotation.y += 0.01; mg.position.y = Math.sin(Date.now() * 0.003 + idx) * 0.05; mr.render(ms, mc); })();
    });
}

function onMouseMove(e) { mouseX = (e.clientX - windowHalfX) * 0.5; mouseY = (e.clientY - windowHalfY) * 0.5; }
function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    targetX += (mouseX - targetX) * 0.02; targetY += (mouseY - targetY) * 0.02;
    if (stars) { stars.rotation.y += 0.0002; stars.rotation.x += 0.0001; }
    if (earth) { earth.rotation.y += 0.002; earth.material.uniforms.time.value = time; earth.children.forEach(c => { if (c.userData && c.userData.update) c.userData.update(time); }); }
    if (particles) { particles.rotation.y += 0.0005; particles.rotation.x += 0.0002; }
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
    gsap.to('.hero-links', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 1.8 });
    gsap.to('.mission-status', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 2 });
    document.querySelectorAll('.stat-number').forEach(s => gsap.to(s, { innerHTML: parseInt(s.getAttribute('data-target')), duration: 2, snap: { innerHTML: 1 }, ease: 'power2.out', delay: 1.5 }));
    ScrollTrigger.create({ trigger: '#about', start: 'top center', onEnter: () => { gsap.to('.about-card', { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.7)' }); } });
    ScrollTrigger.create({ trigger: '#programs', start: 'top center', onEnter: () => gsap.to('.program-item', { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }) });
    ScrollTrigger.create({ trigger: '#projects', start: 'top center', onEnter: () => gsap.to('.project-card', { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }) });
    ScrollTrigger.create({ trigger: '#missiles', start: 'top center', onEnter: () => { gsap.to('.spec', { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.3 }); } });
    ScrollTrigger.create({ trigger: '#gallery', start: 'top center', onEnter: () => gsap.to('.gallery-item', { opacity: 1, scale: 1, rotateZ: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.7)' }) });
    ScrollTrigger.create({ trigger: '#milestones', start: 'top center', onEnter: () => gsap.to('.timeline-item', { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' }) });
    ScrollTrigger.create({ trigger: '#contact', start: 'top center', onEnter: () => { gsap.to('.info-item', { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' }); gsap.to('.form-input, .form-textarea', { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.3 }); } });
    document.querySelectorAll('.missile-btn').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.missile-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); updateMissileSpecs(b.getAttribute('data-missile')); }));
    document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); filterProjects(b.getAttribute('data-filter')); }));
}

function updateMissileSpecs(m) {
    const d = missileData[m];
    gsap.to('#missile-name', { opacity: 0, y: -20, duration: 0.3, onComplete: () => { document.getElementById('missile-name').textContent = d.name; gsap.to('#missile-name', { opacity: 1, y: 0, duration: 0.3 }); } });
    setTimeout(() => { document.getElementById('spec-range').textContent = d.range; document.getElementById('spec-type').textContent = d.type; document.getElementById('spec-payload').textContent = d.payload; document.getElementById('spec-missile-stages').textContent = d.stages; }, 150);
}

function filterProjects(cat) {
    document.querySelectorAll('.project-card').forEach(c => {
        if (cat === 'all' || c.getAttribute('data-category') === cat) { c.style.display = 'block'; gsap.fromTo(c, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }); }
        else c.style.display = 'none';
    });
}

function viewProject(id) {
    if (!currentUser) { openModal('loginModal'); return; }
    const p = projectsData[id]; if (!p) return;
    const started = myProjects.find(x => x.id === id);
    const progress = started ? (started.progress || 0) : 0;
    const completedTasks = started ? (started.completedTasks || []) : [];
    const content = document.getElementById('projectModalContent');

    let modulesHTML = '';
    if (p.modules) {
        modulesHTML = p.modules.map((mod, mi) => {
            const taskCount = mod.tasks.length;
            const completedCount = mod.tasks.filter((_, ti) => completedTasks.includes(`${mi}-${ti}`)).length;
            const isModuleComplete = completedCount === taskCount;
            return `
                <div class="lms-module ${isModuleComplete ? 'completed' : ''}" onclick="toggleModule(this, event)">
                    <div class="lms-module-header">
                        <div class="lms-module-left">
                            <div class="lms-module-number">${isModuleComplete ? '&#10003;' : (mi + 1)}</div>
                            <div class="lms-module-title">${mod.title}</div>
                        </div>
                        <div class="lms-module-status">${completedCount}/${taskCount} TASKS</div>
                    </div>
                    <div class="lms-module-body">
                        ${mod.tasks.map((task, ti) => {
                            const isDone = completedTasks.includes(`${mi}-${ti}`);
                            return `
                                <div class="lms-task ${isDone ? 'done' : ''}">
                                    <div class="lms-task-check ${isDone ? 'done' : ''}" onclick="toggleTask('${id}', ${mi}, ${ti}, event)"></div>
                                    <div class="lms-task-text">${task}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    content.innerHTML = `
        <div class="lms-project-view">
            <div class="lms-project-header">
                <div>
                    <div class="project-badge ${p.category.toLowerCase()}">${p.category}</div>
                    <div class="lms-project-info">
                        <h2>${p.title}</h2>
                        <p>${p.desc}</p>
                    </div>
                </div>
                <div class="project-meta" style="flex-direction:column;align-items:flex-end;gap:8px;">
                    <span class="project-difficulty">${p.difficulty}</span>
                    <span class="project-duration">${p.duration}</span>
                </div>
            </div>
            ${started ? `
                <div class="lms-progress-bar">
                    <div class="lms-progress-fill" style="width:${progress}%"></div>
                </div>
                <div class="lms-progress-text">PROGRESS: ${progress}% COMPLETE</div>
            ` : ''}
            <div class="lms-modules">
                ${modulesHTML}
            </div>
            <div class="lms-project-actions">
                ${started ? `
                    <button class="lms-action-btn primary" onclick="goToDashboard()">GO TO DASHBOARD</button>
                    <button class="lms-action-btn secondary" onclick="closeModal('projectModal')">CLOSE</button>
                ` : `
                    <button class="lms-action-btn primary" onclick="startProject('${id}')">START THIS PROJECT</button>
                    <button class="lms-action-btn secondary" onclick="closeModal('projectModal')">CANCEL</button>
                `}
            </div>
        </div>
    `;
    openModal('projectModal');
}

function toggleModule(el, e) {
    if (e.target.closest('.lms-task-check')) return;
    el.classList.toggle('open');
}

function toggleTask(projectId, moduleIndex, taskIndex, e) {
    e.stopPropagation();
    const p = myProjects.find(x => x.id === projectId);
    if (!p) return;
    if (!p.completedTasks) p.completedTasks = [];
    const key = `${moduleIndex}-${taskIndex}`;
    const idx = p.completedTasks.indexOf(key);
    if (idx === -1) p.completedTasks.push(key);
    else p.completedTasks.splice(idx, 1);

    const project = projectsData[projectId];
    let totalTasks = 0;
    let completedTasks = 0;
    project.modules.forEach((mod, mi) => {
        mod.tasks.forEach((_, ti) => {
            totalTasks++;
            if (p.completedTasks.includes(`${mi}-${ti}`)) completedTasks++;
        });
    });
    p.progress = Math.round((completedTasks / totalTasks) * 100);
    saveUserData();
    viewProject(projectId);
    updateDashboard();
}

function goToDashboard() {
    closeModal('projectModal');
    setTimeout(() => { document.getElementById('dashboard').style.display = 'block'; document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' }); }, 300);
}

async function startProject(id) {
    if (!currentUser) return;
    const p = projectsData[id]; if (!p || myProjects.find(x => x.id === id)) return;
    try {
        await apiFetch('/programs/' + id + '/enroll', { method: 'POST' });
    } catch (err) {
        if (err.message !== 'Already enrolled') {
            console.error('Enroll error:', err);
        }
    }
    myProjects.push({ id, title: p.title, category: p.category, startDate: new Date().toLocaleDateString(), progress: 0, completedTasks: [] });
    updateDashboard(); closeModal('projectModal');
    showNotification('Project started successfully! Go to Dashboard to view.');
}

async function completeProject(id) {
    if (!currentUser) return;
    const idx = myProjects.findIndex(x => x.id === id);
    if (idx === -1) return;
    const p = myProjects[idx];

    try {
        await apiFetch('/projects/' + id + '/complete', { method: 'POST' });
        const cert = await apiFetch('/certificates/generate', {
            method: 'POST',
            body: JSON.stringify({
                recipientName: currentUser.name,
                programName: p.title || p.category,
                completionDate: new Date().toISOString().split('T')[0]
            })
        });
        await loadUserData();
        updateDashboard();
        showNotification('Project completed! Certificate earned!');
        showCertificate(cert.certId);
    } catch (err) {
        console.error('Complete project error:', err);
        showNotification('Error saving progress. Try again.');
    }
}

function showCertificate(id) {
    const c = myCertificates.find(x => x.id === id); if (!c) return;
    document.getElementById('certStudentName').textContent = currentUser?.name || c.student || 'Student';
    document.getElementById('certProjectName').textContent = c.project || c.programName || 'Program';
    document.getElementById('certDate').textContent = 'Date: ' + (c.date || c.completionDate || new Date().toLocaleDateString());
    document.getElementById('certId').textContent = c.id || c.certId || id;
    openModal('certificateModal');
}

function downloadCertificate() {
    const certStudent = document.getElementById('certStudentName').textContent;
    const certProject = document.getElementById('certProjectName').textContent;
    const certDate = document.getElementById('certDate').textContent;
    const certId = document.getElementById('certId').textContent;

    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 850;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = 'rgba(255,107,53,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 28px Orbitron, monospace';
    ctx.textAlign = 'center'; ctx.fillText('MISSILEX ROCKET SPACE', canvas.width / 2, 100);
    ctx.fillStyle = '#8892b0'; ctx.font = '14px Orbitron, monospace';
    ctx.fillText('DEFENCE RESEARCH ORGANIZATION', canvas.width / 2, 130);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 190);

    ctx.fillStyle = '#8892b0'; ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillText('This is to certify that', canvas.width / 2, 250);

    ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 42px Orbitron, monospace';
    ctx.fillText(certStudent, canvas.width / 2, 310);
    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 200, 320); ctx.lineTo(canvas.width / 2 + 200, 320); ctx.stroke();

    ctx.fillStyle = '#8892b0'; ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillText('has successfully completed the research project', canvas.width / 2, 370);

    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillText(certProject, canvas.width / 2, 420);

    ctx.fillStyle = '#8892b0'; ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillText(certDate, canvas.width / 2, 470);

    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText(certId, canvas.width / 2, 520);

    ctx.strokeStyle = '#8892b0'; ctx.lineWidth = 1;

    ctx.beginPath(); ctx.moveTo(100, 620); ctx.lineTo(280, 620); ctx.stroke();
    ctx.fillStyle = '#D4A574'; ctx.font = 'italic bold 32px "Dancing Script", cursive';
    ctx.fillText('Aniket Singh', 190, 600);
    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText('Program Director', 190, 650);

    ctx.beginPath(); ctx.moveTo(920, 620); ctx.lineTo(1100, 620); ctx.stroke();
    ctx.fillStyle = '#D4A574'; ctx.font = 'italic bold 32px "Dancing Script", cursive';
    ctx.fillText('Ritesh Singh', 1010, 600);
    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText('Chief Research Officer', 1010, 650);

    const link = document.createElement('a');
    link.download = 'MissileX_Certificate_' + certId + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('Certificate downloaded successfully!');
}

async function updateDashboard() {
    if (!currentUser || !authToken) return;
    try {
        const data = await apiFetch('/dashboard');
        document.getElementById('dashboardName').textContent = data.user.name;
        document.getElementById('dashboardEmail').textContent = data.user.email;
        document.getElementById('userAvatar').textContent = data.user.avatar || data.user.name.charAt(0).toUpperCase();
        document.getElementById('projectsStarted').textContent = data.stats.programsEnrolled;
        document.getElementById('projectsCompleted').textContent = data.stats.projectsCompleted;
        document.getElementById('certificatesEarned').textContent = data.stats.certificatesEarned;
    } catch (err) {
        document.getElementById('dashboardName').textContent = currentUser.name;
        document.getElementById('dashboardEmail').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('projectsStarted').textContent = '0';
        document.getElementById('projectsCompleted').textContent = '0';
        document.getElementById('certificatesEarned').textContent = '0';
    }
    const mpe = document.getElementById('myProjects');
    mpe.innerHTML = myProjects.length === 0 ? '<p class="no-projects">No projects started yet. Go to Projects section to begin!</p>' :
        myProjects.map(p => `<div class="my-project-item"><div class="my-project-info"><h4>${p.title}</h4><p>${p.category} | Started: ${p.startDate}</p><div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:8px;"><div style="width:${p.progress || 0}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:2px;"></div></div><p style="font-size:0.7rem;margin-top:4px;">${p.progress || 0}% COMPLETE</p></div><div style="display:flex;gap:10px;"><button class="complete-project-btn" onclick="viewProject('${p.id}')" style="background:var(--primary);">CONTINUE</button><button class="complete-project-btn" onclick="completeProject('${p.id}')">MARK COMPLETE</button></div></div>`).join('');
    const mce = document.getElementById('myCertificates');
    mce.innerHTML = myCertificates.length === 0 ? '<p class="no-projects">No certificates earned yet. Complete a project to earn one!</p>' :
        myCertificates.map(c => `<div class="my-certificate-item"><div class="my-project-info"><h4>${c.project}</h4><p>ID: ${c.id} | ${c.date}</p></div><button class="view-cert-btn" onclick="showCertificate('${c.id}')">VIEW CERTIFICATE</button></div>`).join('');
}

function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function switchToRegister() { closeModal('loginModal'); setTimeout(() => openModal('registerModal'), 300); }
function switchToLogin() { closeModal('registerModal'); setTimeout(() => openModal('loginModal'), 300); }

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value, password = document.getElementById('loginPassword').value;
    try {
        const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('missilex_token', authToken);
        loadUserData(); updateUserUI(); updateDashboard();
        closeModal('loginModal'); showNotification('Login successful!');
        document.getElementById('dashboard').style.display = 'block';
    } catch (err) {
        showNotification(err.message || 'Invalid email or password!');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value, email = document.getElementById('regEmail').value, password = document.getElementById('regPassword').value, role = document.getElementById('regRole').value;
    try {
        const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('missilex_token', authToken);
        updateUserUI(); updateDashboard();
        closeModal('registerModal'); showNotification('Account created successfully!');
        document.getElementById('dashboard').style.display = 'block';
    } catch (err) {
        showNotification(err.message || 'Registration failed!');
    }
}

function handleLogout() {
    currentUser = null; myProjects = []; myCertificates = [];
    authToken = null;
    localStorage.removeItem('missilex_token');
    updateUserUI(); document.getElementById('dashboard').style.display = 'none';
    showNotification('Logged out successfully!');
}

function updateUserUI() {
    const na = document.querySelector('.nav-actions');
    if (currentUser) {
        na.innerHTML = `<div class="nav-user-menu active" onclick="document.getElementById('dashboard').scrollIntoView({behavior:'smooth'})"><div class="user-avatar-nav">${currentUser.name.charAt(0).toUpperCase()}</div><span class="user-name-nav">${currentUser.name.split(' ')[0]}</span></div>`;
    } else {
        na.innerHTML = `<button class="nav-login-btn" onclick="openModal('loginModal')">LOGIN</button><button class="nav-register-btn" onclick="openModal('registerModal')">CREATE ACCOUNT</button>`;
    }
}

async function loadUserData() {
    if (!currentUser || !authToken) return;
    try {
        const data = await apiFetch('/user/progress');
        myProjects = data.filter(p => p.type === 'project').map(p => ({
            id: p.itemId, title: p.itemId, category: p.itemId,
            startDate: p.enrolledAt?.split('T')[0] || '', progress: p.progress || 0
        }));
        const certs = await apiFetch('/certificates');
        myCertificates = certs.map(c => ({ id: c.certId, project: c.programName, date: c.completionDate }));
    } catch (err) { console.error('Failed to load user data:', err); }
}
function saveUserData() { /* Data saved via API calls */ }

function showNotification(msg) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 30px;background:#ff6b35;color:white;font-family:Orbitron,monospace;font-size:0.8rem;letter-spacing:0.1em;border-radius:5px;z-index:100000;box-shadow:0 5px 20px rgba(255,107,53,0.4);';
    n.textContent = msg; document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s ease'; setTimeout(() => n.remove(), 300); }, 3000);
}

function handleSubmitProject(e) {
    e.preventDefault();
    const title = document.getElementById('newProjectTitle').value, category = document.getElementById('newProjectCategory').value, desc = document.getElementById('newProjectDesc').value, duration = document.getElementById('newProjectDuration').value, difficulty = document.getElementById('newProjectDifficulty').value;
    const newId = 'p' + (Object.keys(projectsData).length + 1);
    projectsData[newId] = { title, category: category.toUpperCase(), duration, difficulty, desc };
    const grid = document.getElementById('projectsGrid');
    const card = document.createElement('div'); card.className = 'project-card'; card.setAttribute('data-category', category); card.setAttribute('data-id', newId);
    card.innerHTML = `<div class="project-badge ${category}">${category.toUpperCase()}</div><h3>${title}</h3><p>${desc}</p><div class="project-meta"><span class="project-difficulty">${difficulty}</span><span class="project-duration">${duration}</span></div><button class="project-start-btn" onclick="viewProject('${newId}')">VIEW PROJECT</button>`;
    grid.appendChild(card); gsap.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    closeModal('submitProjectModal'); document.getElementById('submitProjectForm').reset(); showNotification('Project submitted successfully!');
}

function authenticateGitHub() {
    deployAuth.github = true;
    document.getElementById('githubStatus').textContent = 'Connected!';
    document.getElementById('githubStatus').style.color = '#00ff88';
    showNotification('GitHub authenticated successfully!');
    checkDeployReady();
}

function authenticateVercel() {
    deployAuth.vercel = true;
    document.getElementById('vercelStatus').textContent = 'Connected!';
    document.getElementById('vercelStatus').style.color = '#00ff88';
    showNotification('Vercel authenticated successfully!');
    checkDeployReady();
}

function authenticateVSCode() {
    deployAuth.vscode = true;
    document.getElementById('vscodeStatus').textContent = 'Connected!';
    document.getElementById('vscodeStatus').style.color = '#00ff88';
    showNotification('VS Code / Claude authenticated successfully!');
    checkDeployReady();
}

function checkDeployReady() {
    if (deployAuth.github && deployAuth.vercel && deployAuth.vscode) {
        document.getElementById('deploySubmitSection').style.display = 'block';
        gsap.fromTo('#deploySubmitSection', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    }
}

function submitForReview() {
    showNotification('Project submitted for review! You will receive an email once approved.');
    deployAuth = { github: false, vercel: false, vscode: false };
    document.getElementById('githubStatus').textContent = 'Not Connected'; document.getElementById('githubStatus').style.color = 'var(--gray)';
    document.getElementById('vercelStatus').textContent = 'Not Connected'; document.getElementById('vercelStatus').style.color = 'var(--gray)';
    document.getElementById('vscodeStatus').textContent = 'Not Connected'; document.getElementById('vscodeStatus').style.color = 'var(--gray)';
    document.getElementById('deploySubmitSection').style.display = 'none';
}

function initNavigation() {
    const h = document.querySelector('.nav-hamburger'), nl = document.querySelector('.nav-links');
    h.addEventListener('click', () => { h.classList.toggle('active'); nl.classList.toggle('active'); });
    document.querySelectorAll('.nav-link, .nav-dropdown-link').forEach(l => l.addEventListener('click', (e) => {
        const href = l.getAttribute('href');
        if (href && !href.startsWith('#')) { window.location.href = href; return; }
        e.preventDefault();
        h.classList.remove('active'); nl.classList.remove('active');
        const target = document.querySelector(href);
        if (target) {
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }));
    window.addEventListener('scroll', () => {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
        const sections = ['home','about','isro-section','drdo-section','iaf-section','army-section','navy-section','contact'];
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

const orgData = {
    isro: [
        { name: 'SLV', category: 'Satellite Launch Vehicle', payload: 'Up to 40 kg to LEO', stages: '4', status: 'retired', desc: 'India\'s first experimental satellite launch vehicle. The SLV-3 was a 4-stage solid-fuel rocket developed by ISRO in the 1970s. It successfully placed the Rohini satellite into orbit in 1980, making India the sixth nation capable of orbital launch.', specs: { weight: '17 tonnes', height: '22 m', diameter: '0.8 m', fuel: 'Solid (HTPB-based)', firstFlight: '1979', lastFlight: '1983' }, highlights: ['First Indian orbital launch vehicle', 'Successfully launched Rohini RS-1 satellite', 'Led to development of ASLV', 'Proved India\'s indigenous launch capability'] },
        { name: 'ASLV', category: 'Augmented Satellite Launch Vehicle', payload: 'Up to 150 kg to LEO', stages: '5', status: 'retired', desc: 'Augmented SLV with strap-on boosters. ASLV was designed to augment the payload capability of SLV-3. It used 5 stages with solid propulsion and strap-on motors.', specs: { weight: '40 tonnes', height: '23.8 m', diameter: '1 m', fuel: 'Solid (APCP)', firstFlight: '1987', lastFlight: '1994' }, highlights: ['Derived from SLV-3 technology', 'Featured strap-on booster concept', 'Tested payload fairing separation', 'Paved way for PSLV development'] },
        { name: 'PSLV', category: 'Polar Satellite Launch Vehicle', payload: 'Up to 3,800 kg to polar orbit', stages: '4', status: 'active', desc: 'Workhorse of ISRO with 95%+ success rate. PSLV has launched Chandrayaan-1, Mars Orbiter Mission, and numerous international satellites. It uses alternating solid and liquid stages.', specs: { weight: '320 tonnes', height: '44.4 m', diameter: '2.8 m', fuel: 'Solid + Liquid', firstFlight: '1993', lastFlight: 'Ongoing (50+ missions)' }, highlights: ['Highest success rate globally (95%+)', 'Launched Chandrayaan-1 to Moon', 'Launched Mangalyaan to Mars', 'Launches 104 satellites in single mission (2017)', 'International commercial launches'] },
        { name: 'GSLV', category: 'Geosynchronous Satellite Launch Vehicle', payload: 'Up to 2,500 kg to GTO', stages: '3', status: 'active', desc: 'GSLV uses cryogenic upper stage for heavier payloads to geosynchronous transfer orbit. The indigenous cryogenic engine was developed after technology denial.', specs: { weight: '414 tonnes', height: '49 m', diameter: '3.4 m', fuel: 'Solid + Liquid + Cryogenic', firstFlight: '2001', lastFlight: 'Ongoing' }, highlights: ['Indigenous cryogenic engine success', 'Launched GSAT series satellites', 'Overcame technology denial challenge', 'Key for heavy satellite launches'] },
        { name: 'LVM3', category: 'Launch Vehicle Mark-3', payload: 'Up to 4,000 kg to GTO / 8,000 kg to LEO', stages: '2 + strap-ons', status: 'active', desc: 'Formerly GSLV Mk-III, now called LVM3. India\'s heaviest launch vehicle used for Chandrayaan-2 and Chandrayaan-3 missions. Features semi-cryogenic engine development.', specs: { weight: '640 tonnes', height: '43.5 m', diameter: '5 m', fuel: 'Solid + Semi-cryogenic + Cryogenic', firstFlight: '2014', lastFlight: 'Ongoing' }, highlights: ['Launched Chandrayaan-2 and Chandrayaan-3', 'India\'s most powerful rocket', 'Used for Gaganyaan crew module test', 'Semi-cryogenic engine under development'] },
        { name: 'SSLV', category: 'Small Satellite Launch Vehicle', payload: 'Up to 500 kg to LEO', stages: '3', status: 'active', desc: 'Small Satellite Launch Vehicle for quick and low-cost launches of small satellites. Designed for commercial small satellite market with rapid turnaround time.', specs: { weight: '120 tonnes', height: '34 m', diameter: '2 m', fuel: 'Solid', firstFlight: '2022', lastFlight: 'Ongoing' }, highlights: ['Low-cost small satellite launches', 'Quick turnaround time (72 hours)', 'Designed for commercial market', 'Indigenous guidance system'] },
        { name: 'Aryabhata', category: 'Satellite', payload: 'Scientific', stages: 'N/A', status: 'retired', desc: 'India\'s first satellite, named after the ancient Indian mathematician. Launched on 19 April 1975 from Kapustin Yar, Soviet Union. It was used for X-ray astronomy and solar physics.', specs: { weight: '360 kg', orbit: 'LEO 563 x 611 km', mission: 'X-ray Astronomy', firstFlight: '1975', lastFlight: '1992 (de-orbited)' }, highlights: ['India\'s first satellite', 'Named after mathematician Aryabhata', 'Built with Soviet assistance', 'Operational for 4 years'] },
        { name: 'Chandrayaan-3', category: 'Lunar Mission', payload: 'Lander + Rover', stages: 'N/A', status: 'active', desc: 'India\'s third lunar mission that successfully soft-landed near the Moon\'s south pole on 23 August 2023. Made India the fourth nation to soft-land on the Moon.', specs: { weight: '3,900 kg (lander+rover)', destination: 'Moon South Pole', rover: 'Pragyan (26 kg)', lander: 'Vikram', firstFlight: '2023', lastFlight: 'Mission Active' }, highlights: ['First soft landing near Moon\'s south pole', 'India became 4th nation on Moon', 'Pragyan rover explored lunar surface', 'Successfully completed 14-day mission'] },
        { name: 'Mangalyaan', category: 'Mars Orbiter Mission', payload: 'Scientific instruments', stages: 'N/A', status: 'retired', desc: 'India\'s first interplanetary mission. Launched on 5 November 2013, it entered Mars orbit on 24 September 2014. India became the first nation to reach Mars on its first attempt.', specs: { weight: '1,337 kg', destination: 'Mars Orbit', instruments: '5 scientific', firstFlight: '2013', lastFlight: '2022 (contact lost)' }, highlights: ['First Asian nation at Mars', 'First nation to reach Mars on first attempt', 'Lowest cost Mars mission ever ($74M)', 'Studied Martian atmosphere and surface'] }
    ],
    drdo: [
        { name: 'Prithvi-I', type: 'Short-Range Ballistic Missile', range: '150 km', payload: '1,000 kg', status: 'active', desc: 'India\'s first indigenously developed ballistic missile. Prithvi was developed under the Integrated Guided Missile Development Programme (IGMDP). It is a single-stage, liquid-fueled missile.', specs: { weight: '5,000 kg', length: '9 m', diameter: '1 m', fuel: 'Liquid (UDMH + N2O4)', firstFlight: '1988', guidance: 'Inertial + Terminal' }, highlights: ['India\'s first indigenous ballistic missile', 'Developed under IGMDP', 'Used by Indian Army and Air Force', 'Successfully tested multiple times'] },
        { name: 'Prithvi-II', type: 'Short-Range Ballistic Missile', range: '350 km', payload: '500-1,000 kg', status: 'active', desc: 'Air-launched variant of Prithvi with improved accuracy. Features liquid propulsion with terminal guidance for precision strikes.', specs: { weight: '4,600 kg', length: '9 m', diameter: '1.1 m', fuel: 'Liquid', firstFlight: '1996', guidance: 'Inertial + GPS' }, highlights: ['Improved accuracy over Prithvi-I', 'Can be air-launched from Su-30MKI', 'GPS-aided navigation', 'Inducted into Indian Air Force'] },
        { name: 'Prithvi-III', type: 'Short-Range Ballistic Missile', range: '350-600 km', payload: '1,000 kg', status: 'active', desc: 'Solid-fueled variant with extended range. Two-stage missile with enhanced maneuverability and reduced reaction time.', specs: { weight: '5,200 kg', length: '9.5 m', diameter: '1.1 m', fuel: 'Solid', firstFlight: '2004', guidance: 'Inertial + Terminal' }, highlights: ['Solid-fueled for faster response', 'Extended range capability', 'Improved maneuverability', 'Reduced preparation time'] },
        { name: 'Agni-I', type: 'Short-Range Ballistic Missile', range: '700 km', payload: '1,000 kg', status: 'active', desc: 'First missile in the Agni series. Single-stage solid-fueled missile derived from the SLV-3 rocket technology. Quick reaction capability for tactical strikes.', specs: { weight: '12,000 kg', length: '15 m', diameter: '1.0 m', fuel: 'Solid (HTPB)', firstFlight: '2002', guidance: 'Inertial + Terminal' }, highlights: ['First Agni missile', 'Derived from SLV-3 technology', 'Quick reaction time (15 minutes)', 'Nuclear-capable'] },
        { name: 'Agni-II', type: 'Medium-Range Ballistic Missile', range: '2,000 km', payload: '1,000 kg', status: 'active', desc: 'Two-stage solid-fueled MRBM. Enhanced range and payload capacity over Agni-I. Primary weapon of India\'s strategic forces.', specs: { weight: '18,000 kg', length: '20 m', diameter: '1.0 m', fuel: 'Solid', firstFlight: '2004', guidance: 'Inertial + Ring Laser Gyro' }, highlights: ['Two-stage solid propulsion', 'Ring laser gyro guidance', 'Canisterized for mobility', 'Nuclear-capable'] },
        { name: 'Agni-III', type: 'Intermediate-Range Ballistic Missile', range: '3,000-5,000 km', payload: '1,500-2,000 kg', status: 'active', desc: 'IRBM with capabilities to reach deep targets. Two-stage solid-fueled missile with advanced navigation and guidance systems.', specs: { weight: '22,000 kg', length: '16.7 m', diameter: '1.8 m', fuel: 'Solid', firstFlight: '2007', guidance: 'Inertial + Terminal' }, highlights: ['IRBM capability', 'Advanced navigation systems', 'Nuclear warhead capable', 'Canisterized launch'] },
        { name: 'Agni-IV', type: 'Intermediate-Range Ballistic Missile', range: '4,000 km', payload: '1,000 kg', status: 'active', desc: 'Four-stage missile with advanced composite rocket motor. Features re-entry vehicle with maneuvering capability.', specs: { weight: '20,000 kg', length: '20 m', diameter: '1.0 m', fuel: 'Solid', firstFlight: '2011', guidance: 'Inertial + GPS + Terminal' }, highlights: ['Composite rocket motor', 'Re-entry vehicle capability', 'GPS-aided navigation', 'High accuracy'] },
        { name: 'Agni-V', type: 'Intercontinental Ballistic Missile', range: '5,000-8,000 km', payload: '1,500 kg', status: 'active', desc: 'India\'s most powerful missile. Three-stage solid-fueled ICBM with MIRV capability. Can reach targets across Asia and Europe.', specs: { weight: '50,000 kg', length: '17.5 m', diameter: '2.0 m', fuel: 'Solid', firstFlight: '2012', guidance: 'Inertial + GPS + Terminal' }, highlights: ['ICBM capability', 'MIRV warhead capable', 'Canisterized for mobility', 'Range covers all of Asia'] },
        { name: 'Agni-P', type: 'Medium-Range Ballistic Missile', range: '1,000-2,000 km', payload: 'MIRV', status: 'active', desc: 'Next-generation missile with canisterized launch and MIRV capability. Features advanced composite materials and improved accuracy.', specs: { weight: '15,000 kg', length: '12 m', diameter: '1.5 m', fuel: 'Solid', firstFlight: '2021', guidance: 'Advanced INS + GPS' }, highlights: ['Next-gen canisterized missile', 'MIRV capable', 'Composite construction', 'Reduced weight and size'] },
        { name: 'BrahMos', type: 'Supersonic Cruise Missile', range: '290 km', payload: '300 kg', status: 'active', desc: 'Joint India-Russia supersonic cruise missile. Flies at Mach 2.8-3.0, making it one of the fastest cruise missiles in the world. Available in land, sea, air, and submarine variants.', specs: { weight: '3,000 kg', length: '8.4 m', diameter: '0.67 m', fuel: 'Solid + Ramjet', firstFlight: '2001', guidance: 'INS + GPS + Terminal' }, highlights: ['Mach 3.0 speed', 'Joint India-Russia project', 'All-platform variants', 'BrahMos-II hypersonic variant under development'] }
    ],
    iaf: [
        { name: 'Sukhoi Su-30MKI', type: 'Multi-Role Fighter', origin: 'Russia/India', role: 'Air Superiority', status: 'active', desc: 'The backbone of the Indian Air Force. Su-30MKI is a heavily modified variant of the Russian Su-27, customized with Indian avionics, Israeli电子, and French components.', specs: { maxSpeed: 'Mach 2.0', range: '3,000 km', engine: '2x AL-31FP', weapons: '12 hardpoints', firstFlight: '2000', manufacturer: 'HAL + UAC' }, highlights: ['Most numerous fighter in IAF fleet', 'Canard-delta configuration', 'Thrust vectoring nozzles', 'Advanced radar and avionics', 'Operational in Kargil and standoff situations'] },
        { name: 'Dassault Rafale', type: 'Multi-Role Fighter', origin: 'France', role: 'Omni-Role', status: 'active', desc: 'Fourth-generation omni-role fighter acquired in 2016. Equipped with Meteor BVR missiles, SCALP cruise missiles, and advanced AESA radar.', specs: { maxSpeed: 'Mach 1.8', range: '3,700 km', engine: '2x M88-2', weapons: '14 hardpoints', firstFlight: '2019 (India)', manufacturer: 'Dassault Aviation' }, highlights: ['Most advanced fighter in IAF', 'Meteor BVR missile capability', 'SCALP cruise missile carrier', 'AESA radar technology', 'Omni-role capability'] },
        { name: 'HAL Tejas MK1', type: 'Light Combat Aircraft', origin: 'India', role: 'Multi-Role', status: 'active', desc: 'India\'s first indigenous supersonic fighter. Developed by HAL with DRDO laboratories. Features composite airframe and fly-by-wire controls.', specs: { maxSpeed: 'Mach 1.8', range: '1,670 km', engine: '1x GE F404', weapons: '8 hardpoints', firstFlight: '2001', manufacturer: 'HAL' }, highlights: ['India\'s first indigenous LCA', 'Composite airframe', 'Fly-by-wire controls', 'In production for IAF'] },
        { name: 'HAL Tejas MK2', type: 'Medium Combat Aircraft', origin: 'India', role: 'Multi-Role', status: 'dev', desc: 'Enhanced version of Tejas MK1 with more powerful engine, longer range, and improved avionics. Features a larger airframe and additional fuel capacity.', specs: { maxSpeed: 'Mach 1.8', range: '2,500 km', engine: '1x GE F414', weapons: '11 hardpoints', firstFlight: '2025 (expected)', manufacturer: 'HAL' }, highlights: ['Larger and more capable', 'GE F414 engine', 'Increased payload capacity', 'Advanced AESA radar', 'Expected to enter service soon'] },
        { name: 'MiG-29', type: 'Multi-Role Fighter', origin: 'Russia', role: 'Air Superiority', status: 'active', desc: 'Russian-origin air superiority fighter. Upgraded to MiG-29UPG standard with improved avionics, fuel capacity, and weapons capability.', specs: { maxSpeed: 'Mach 2.25', range: '1,500 km', engine: '2x RD-33', weapons: '7 hardpoints', firstFlight: '1982', manufacturer: 'Mikoyan' }, highlights: ['Air superiority fighter', 'Upgraded to UPG standard', 'R-77 BVR missile capable', 'Reliable platform'] },
        { name: 'Mirage 2000', type: 'Multi-Role Fighter', origin: 'France', role: 'Strike', status: 'active', desc: 'French-origin delta-wing fighter. Used in the Balakot strikes in 2019. Known for its precision strike capability.', specs: { maxSpeed: 'Mach 2.2', range: '1,800 km', engine: '1x M53-P2', weapons: '9 hardpoints', firstFlight: '1984 (India)', manufacturer: 'Dassault' }, highlights: ['Precision strike capability', 'Used in Balakot strikes', 'Nuclear-capable', 'Upgraded with new avionics'] },
        { name: 'C-17 Globemaster III', type: 'Transport Aircraft', origin: 'USA', role: 'Strategic Lift', status: 'active', desc: 'Heavy strategic airlifter for rapid deployment of troops and cargo. Can operate from short and austere airfields.', specs: { maxSpeed: 'Mach 0.89', range: '10,400 km', engine: '4x F117-PW-100', payload: '77,500 kg', firstFlight: '2013 (India)', manufacturer: 'Boeing' }, highlights: ['Strategic airlift capability', 'Can operate from rough runways', 'Rapid deployment of forces', 'Used for humanitarian missions'] },
        { name: 'AH-64E Apache', type: 'Attack Helicopter', origin: 'USA', role: 'Attack', status: 'active', desc: 'World\'s most advanced attack helicopter. Equipped with Hellfire missiles, rocket pods, and a 30mm chain gun.', specs: { maxSpeed: '300 km/h', range: '480 km', engine: '2x T700-GE-701D', weapons: 'Hellfire + Hydra', firstFlight: '2019 (India)', manufacturer: 'Boeing' }, highlights: ['Most lethal attack helicopter', 'Night vision capability', 'Hellfire anti-tank missiles', 'All-weather operations'] },
        { name: 'HAL TEDBF', type: 'Twin Engine Deck Based Fighter', origin: 'India', role: 'Naval Fighter', status: 'dev', desc: 'Next-generation carrier-based fighter being developed for the Indian Navy. Features twin engines and folding wings for carrier operations.', specs: { maxSpeed: 'Mach 2.15', range: '1,500 km', engine: '2x Kaveri-derivative', weapons: '10 hardpoints', firstFlight: '2027 (expected)', manufacturer: 'HAL' }, highlights: ['India\'s first indigenous naval fighter', 'Carrier-based operations', 'Folding wing design', 'Twin-engine configuration'] }
    ],
    army: [
        { name: 'T-90S Bhishma', type: 'Main Battle Tank', origin: 'Russia/India', role: 'MBT', status: 'active', desc: 'India\'s main battle tank, manufactured under license by Heavy Vehicles Factory, Avadi. Features advanced fire control, thermal imaging, and Kontakt-5 ERA armor.', specs: { weight: '46.2 tonnes', armament: '125mm smoothbore', engine: 'V-92S2 1000hp', speed: '65 km/h', armor: 'Composite + ERA', firstProduced: '2001' }, highlights: ['Main battle tank of Indian Army', 'Manufactured under license in India', 'Advanced fire control system', 'Kontakt-5 explosive reactive armor', 'Over 1,000 units in service'] },
        { name: 'Arjun MK1', type: 'Main Battle Tank', origin: 'India', role: 'MBT', status: 'active', desc: 'India\'s indigenous main battle tank developed by DRDO. Features a 125mm rifled gun, composite armor, and kanchan armor technology.', specs: { weight: '58.5 tonnes', armament: '125mm rifled gun', engine: 'MTU 838 Ka-501 1400hp', speed: '70 km/h', armor: 'Kanchan composite', firstProduced: '2004' }, highlights: ['Indigenous Indian MBT', 'Kanchan composite armor', '125mm rifled gun with autoloader', 'Fire-and-forget missile capability', 'Made in India'] },
        { name: 'T-72 Ajeya', type: 'Main Battle Tank', origin: 'Russia', role: 'MBT', status: 'active', desc: 'Workhorse of Indian armored forces. Large fleet of upgraded T-72M1 tanks with modern fire control, ERA, and thermal imaging systems.', specs: { weight: '41.5 tonnes', armament: '125mm smoothbore', engine: 'V-46-6 780hp', speed: '60 km/h', armor: 'Composite + ERA', firstProduced: '1970s (upgraded)' }, highlights: ['Largest tank fleet in IAF', 'Multiple upgrade programs', 'Battle-proven platform', 'Cost-effective solution'] },
        { name: 'BMP-2 Sarath', type: 'Infantry Combat Vehicle', origin: 'Russia', role: 'IFV', status: 'active', desc: 'Primary infantry combat vehicle of the Indian Army. Provides mechanized infantry with protected mobility and fire support.', specs: { weight: '14.6 tonnes', armament: '30mm cannon + Konkurs', engine: 'UTD-20 300hp', speed: '65 km/h', armor: 'Welded steel', firstProduced: '1980s' }, highlights: ['Primary IFV of Indian Army', '30mm automatic cannon', 'Konkurs ATGM capability', 'Amphibious capability', 'Manufactured in India'] },
        { name: 'K9 Vajra-T', type: 'Self-Propelled Howitzer', origin: 'South Korea/India', role: 'SP Artillery', status: 'active', desc: '155mm/52 caliber self-propelled howitzer manufactured under license by L&T. Designed for desert operations with high rate of fire.', specs: { weight: '47 tonnes', armament: '155mm/52cal', engine: 'MTU 881 Ka-500 1000hp', range: '40 km', rateOfFire: '6-8 rpm', firstProduced: '2018' }, highlights: ['First SP howitzer in Indian Army', 'Manufactured under license', 'Desert warfare optimized', 'High rate of fire', 'Rapid deployment capability'] },
        { name: 'Dhanush Howitzer', type: 'Towed Howitzer', origin: 'India', role: 'Artillery', status: 'active', desc: 'India\'s first indigenous 155mm/45 caliber howitzer. Based on the proven Bofors FH77B design with indigenous modifications.', specs: { weight: '5.7 tonnes', armament: '155mm/45cal', range: '30 km', rateOfFire: '5 rpm', firstProduced: '2019', manufacturer: 'Bofors/BEML' }, highlights: ['Indigenous howitzer', 'Based on Bofors design', 'Advanced muzzle velocity radar', 'GPS-aided navigation', 'Battlefield proven'] },
        { name: 'Pinaka MBRL', type: 'Multi-Barrel Rocket Launcher', origin: 'India', role: 'Rocket Artillery', status: 'active', desc: 'Indigenous multi-barrel rocket launcher system. Capable of firing 12 rockets in 44 seconds with a range of 75 km.', specs: { range: '75 km (Pinaka Mk-II)', rockets: '12 per salvo', timeOfFire: '44 seconds', mobility: 'Tatra truck', firstProduced: '1999', guidance: 'GPS + INS (Mk-II)' }, highlights: ['Indigenous MBRL system', 'Used in Kargil War', 'Pinaka Mk-II with guidance', 'Pinaka Mk-III with 90km range', 'Quick reaction capability'] },
        { name: 'NAG ATGM', type: 'Anti-Tank Guided Missile', origin: 'India', role: 'ATGM', status: 'active', desc: 'Third-generation fire-and-forget anti-tank guided missile. Uses imaging infrared seeker for day/night operations.', specs: { range: '4 km', warhead: 'Tandem HEAT', guidance: 'IIR fire-and-forget', platform: 'Namica/NAMICA', firstProduced: '2015', speed: 'Subsonic' }, highlights: ['Fire-and-forget capability', 'Imaging infrared seeker', 'Tandem warhead for ERA', 'Can be launched from multiple platforms', 'Indigenous development'] }
    ],
    navy: [
        { name: 'INS Vikrant', type: 'Aircraft Carrier', origin: 'India', role: 'Fleet Carrier', status: 'active', desc: 'India\'s first indigenous aircraft carrier, commissioned in 2022. Built by Cochin Shipyard, it can operate MiG-29K fighters and helicopters.', specs: { displacement: '45,000 tonnes', length: '262 m', aircraft: '30+', speed: '28 knots', firstCommissioned: '2022', manufacturer: 'Cochin Shipyard' }, highlights: ['First indigenous aircraft carrier', 'Commissioned in 2022', 'Can operate 30+ aircraft', 'STOBAR configuration', 'Pride of Indian Navy'] },
        { name: 'INS Vikramaditya', type: 'Aircraft Carrier', origin: 'Russia', role: 'Fleet Carrier', status: 'active', desc: 'Modified Kiev-class carrier acquired from Russia. Major refit at Sevmash shipyard before commissioning. Operates MiG-29K fighters.', specs: { displacement: '45,000 tonnes', length: '284 m', aircraft: '30+', speed: '32 knots', firstCommissioned: '2013', manufacturer: 'Sevmash' }, highlights: ['Modified Kiev-class carrier', 'Major refit at Russia', 'MiG-29K fighter operations', 'Flagship of Indian Navy', 'STOBAR configuration'] },
        { name: 'INS Arihant', type: 'Nuclear Submarine', origin: 'India', role: 'SSBN', status: 'active', desc: 'India\'s first indigenous nuclear-powered ballistic missile submarine. Part of India\'s nuclear deterrent triad. Can launch K-15 and K-4 missiles.', specs: { displacement: '6,000 tonnes', length: '111 m', armament: 'K-15/K-4 SLBMs', speed: '24 knots (surfaced)', firstCommissioned: '2016', manufacturer: 'Shipbuilding Centre' }, highlights: ['India\'s first SSBN', 'Nuclear triad capability', 'K-15 SLBM range: 750 km', 'K-4 SLBM range: 3,500 km', 'Indigenous nuclear submarine'] },
        { name: 'Kalvari Class', type: 'Attack Submarine', origin: 'France/India', role: 'SSK', status: 'active', desc: 'Scorpene-class conventional attack submarines built under license by Mazagon Dock. Features advanced stealth and weapon systems.', specs: { displacement: '1,615 tonnes', length: '67.5 m', armament: '18 torpedoes/missiles', speed: '20 knots (submerged)', firstCommissioned: '2017', manufacturer: 'Mazagon Dock' }, highlights: ['Scorpene-class design', 'Built under license in India', 'Advanced stealth features', 'Anti-ship and anti-submarine', '6 submarines planned'] },
        { name: 'Kolkata Class', type: 'Guided Missile Destroyer', origin: 'India', role: 'Destroyer', status: 'active', desc: 'Project 15A destroyers built at Mazagon Dock. Features Barak-8 SAM system and BrahMos supersonic cruise missiles.', specs: { displacement: '7,500 tonnes', length: '163 m', armament: 'BrahMos + Barak-8', speed: '32 knots', firstCommissioned: '2014', manufacturer: 'Mazagon Dock' }, highlights: ['First guided missile destroyer', 'BrahMos supersonic missiles', 'Barak-8 SAM system', 'Advanced combat management', 'Indigenous construction'] },
        { name: 'Visakhapatnam Class', type: 'Guided Missile Destroyer', origin: 'India', role: 'Destroyer', status: 'active', desc: 'Project 15B destroyers, improved version of Kolkata class. Features enhanced stealth, weapons, and sensors.', specs: { displacement: '7,400 tonnes', length: '163 m', armament: 'BrahMos + Barak-8', speed: '30 knots', firstCommissioned: '2021', manufacturer: 'Mazagon Dock' }, highlights: ['Improved Kolkata-class design', 'Enhanced stealth features', 'BrahMos and Barak-8 missiles', 'Advanced radar systems', 'Next-gen destroyers'] },
        { name: 'Shivalik Class', type: 'Stealth Frigate', origin: 'India', role: 'Frigate', status: 'active', desc: 'Project 17 stealth frigates with reduced radar signature. Features multi-role capability with anti-air, anti-submarine, and anti-ship weapons.', specs: { displacement: '6,200 tonnes', length: '149 m', armament: 'BrahMos + Barak-1', speed: '32 knots', firstCommissioned: '2010', manufacturer: 'Mazagon Dock/Garden Reach' }, highlights: ['First Indian stealth frigate', 'Reduced radar signature', 'Multi-role capability', 'Advanced sensor suite', 'Indigenous construction'] },
        { name: 'Talwar Class', type: 'Guided Missile Frigate', origin: 'Russia/India', role: 'Frigate', status: 'active', desc: 'Modified Krivak III-class frigates built in Russia for Indian Navy. Armed with BrahMos missiles and advanced weapon systems.', specs: { displacement: '4,035 tonnes', length: '124.5 m', armament: 'BrahMos + Klub', speed: '30 knots', firstCommissioned: '2003', manufacturer: 'Yantar Shipyard' }, highlights: ['Modified Krivak III design', 'BrahMos missile armed', 'Anti-submarine warfare', 'Klub-N cruise missiles', '6 ships in service'] }
    ]
};

// ========== INITIATIVES ==========
let allInitiatives = [];
let userRegistrations = [];

async function loadInitiatives() {
    try {
        allInitiatives = await apiFetch('/initiatives');
        renderInitiatives(allInitiatives);
    } catch (err) { console.error('Failed to load initiatives:', err); }
}

function renderInitiatives(list) {
    const grid = document.getElementById('initiativesGrid');
    if (!grid) return;
    if (list.length === 0) {
        grid.innerHTML = '<p style="color:var(--gray);text-align:center;grid-column:1/-1;">No initiatives found.</p>';
        return;
    }
    grid.innerHTML = list.map(init => {
        const isRegistered = userRegistrations.some(r => r.initiativeId === init._id);
        const spotsLeft = init.teamSize === 'Individual' ? '' : ` | ${init.registrations || 0} teams joined`;
        return `
        <div class="initiative-card" onclick="openInitiative('${init._id}')">
            <img class="initiative-banner" src="${init.banner}" alt="${init.title}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1a0a2e,#0f3460)';this.alt='Banner';">
            <div class="initiative-body">
                <div class="initiative-meta">
                    <span class="initiative-type-badge ${init.type}">${init.type}</span>
                    <span class="initiative-mode">${init.mode}</span>
                    <span class="initiative-fee">${init.fee}</span>
                </div>
                <h3 class="initiative-title">${init.title}</h3>
                <p class="initiative-desc">${init.description}</p>
                <div class="initiative-info">
                    <div class="initiative-info-row"><span class="label">Organizer</span><span class="value">${init.organizer}</span></div>
                    <div class="initiative-info-row"><span class="label">Deadline</span><span class="value">${new Date(init.regDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                    <div class="initiative-info-row"><span class="label">Team Size</span><span class="value">${init.teamSize}</span></div>
                    <div class="initiative-info-row"><span class="label">Prizes</span><span class="value">${init.prizes}</span></div>
                </div>
                <div class="initiative-footer">
                    <span class="initiative-reg-count">${init.registrations || 0} registered${spotsLeft}</span>
                    <button class="initiative-register-btn ${isRegistered ? 'registered' : ''}" onclick="event.stopPropagation();${isRegistered ? '' : `registerForInitiative('${init._id}')`}">
                        ${isRegistered ? 'REGISTERED ✓' : 'REGISTER NOW'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openInitiative(id) {
    window.location.href = 'initiative.html?id=' + id;
}

async function registerForInitiative(id) {
    if (!currentUser) { openModal('loginModal'); return; }
    const init = allInitiatives.find(i => i._id === id);
    if (!init) return;

    const modal = document.getElementById('initiativeRegModal');
    document.getElementById('regInitTitle').textContent = init.title;
    document.getElementById('regInitId').value = id;
    document.getElementById('regInitTeamSize').textContent = init.teamSize;

    const teamSection = document.getElementById('regTeamSection');
    teamSection.style.display = init.teamSize === 'Individual' ? 'none' : 'block';

    document.getElementById('initiativeRegForm').style.display = 'block';
    document.getElementById('initiativeRegSuccess').style.display = 'none';
    openModal('initiativeRegModal');
}

async function handleInitiativeRegistration(e) {
    e.preventDefault();
    const id = document.getElementById('regInitId').value;
    try {
        await apiFetch('/initiatives/' + id + '/register', {
            method: 'POST',
            body: JSON.stringify({
                teamName: document.getElementById('regTeamName')?.value || ''
            })
        });
        document.getElementById('initiativeRegForm').style.display = 'none';
        document.getElementById('initiativeRegSuccess').style.display = 'block';
        await loadUserRegistrations();
        renderInitiatives(allInitiatives);
    } catch (err) {
        showNotification(err.message || 'Registration failed');
    }
}

async function loadUserRegistrations() {
    if (!currentUser || !authToken) { userRegistrations = []; return; }
    try {
        userRegistrations = await apiFetch('/user/initiatives');
    } catch (err) { userRegistrations = []; }
}

function initInitiativeFilters() {
    document.querySelectorAll('[data-ifilter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-ifilter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.ifilter;
            if (filter === 'all') renderInitiatives(allInitiatives);
            else renderInitiatives(allInitiatives.filter(i => i.type === filter));
        });
    });
}

function initOrgSections() {
    Object.keys(orgData).forEach(org => {
        const tbody = document.getElementById(org + '-table-body');
        if (!tbody) return;
        orgData[org].forEach((item, idx) => {
            const row = document.createElement('tr');
            const statusClass = item.status === 'active' ? 'status-active' : item.status === 'dev' ? 'status-dev' : 'status-retired';
            const statusText = item.status === 'active' ? 'ACTIVE' : item.status === 'dev' ? 'IN DEV' : 'RETIRED';
            row.innerHTML = `
                <td class="vehicle-name">${item.name}</td>
                <td>${item.category || item.type}</td>
                <td>${item.payload || item.range}</td>
                <td>${item.stages || item.role}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td><button class="org-details-btn" onclick="showOrgDetail('${org}', ${idx})">DETAILS</button></td>
            `;
            tbody.appendChild(row);
        });
    });
}

function showOrgDetail(org, idx) {
    const item = orgData[org][idx];
    const content = document.getElementById('orgDetailContent');

    let specsHTML = '';
    if (item.specs) {
        specsHTML = '<div class="org-detail-specs">';
        Object.entries(item.specs).forEach(([key, val]) => {
            specsHTML += `<div class="org-detail-spec"><span class="spec-label">${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span><span class="spec-value">${val}</span></div>`;
        });
        specsHTML += '</div>';
    }

    let highlightsHTML = '';
    if (item.highlights) {
        highlightsHTML = '<div class="org-detail-section"><h4>KEY HIGHLIGHTS</h4><ul>';
        item.highlights.forEach(h => { highlightsHTML += `<li>${h}</li>`; });
        highlightsHTML += '</ul></div>';
    }

    content.innerHTML = `
        <div class="org-detail-content">
            <h2>${item.name}</h2>
            <div class="detail-category">${item.category || item.type}</div>
            <div class="detail-desc">${item.desc}</div>
            ${specsHTML}
            ${highlightsHTML}
        </div>
    `;
    openModal('orgDetailModal');
}

function initScrollProgress() {
    const pb = document.querySelector('.progress'); let p = 0;
    const iv = setInterval(() => { p += Math.random() * 15; if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => { document.getElementById('loading-screen').classList.add('hidden'); initAnimations(); }, 500); } pb.style.width = p + '%'; }, 200);
}

function initEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtnNav').addEventListener('click', () => openModal('registerModal'));
    document.getElementById('submitProjectBtn').addEventListener('click', () => { if (!currentUser) { openModal('loginModal'); return; } openModal('submitProjectModal'); });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) { o.classList.remove('active'); document.body.style.overflow = ''; } }));
}

let pitchData = {};

async function handlePitchSubmit(e) {
    e.preventDefault();
    if (!currentUser) { openModal('loginModal'); return; }
    const startupName = document.getElementById('pitchStartupName').value;
    const founderName = document.getElementById('pitchFounderName').value;
    const email = document.getElementById('pitchEmail').value;
    const domain = document.getElementById('pitchDomain').value;
    const description = document.getElementById('pitchDescription').value;
    const stage = document.getElementById('pitchStage').value;

    const pitchId = 'PITCH-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    pitchData = { startupName, founderName, email, domain, description, stage, pitchId, date: new Date().toLocaleDateString() };

    try {
        await apiFetch('/pitches', {
            method: 'POST',
            body: JSON.stringify({ startupName, founderName, email, stage, category: domain, problemStatement: description, solution: description })
        });
    } catch (err) { console.error('Pitch API error:', err); }

    document.getElementById('pitchAgreeName').textContent = founderName;
    document.getElementById('pitchAgreeStartup').textContent = startupName;
    document.getElementById('pitchAgreeDate').textContent = 'Date: ' + pitchData.date;
    document.getElementById('pitchAgreeId').textContent = pitchId;

    openModal('pitchAgreementModal');
    document.getElementById('pitchForm').reset();
    showNotification('Pitch submitted successfully!');
}

async function downloadPitchCertificate() {
    if (authToken && pitchData.startupName) {
        try {
            await apiFetch('/certificates/generate', {
                method: 'POST',
                body: JSON.stringify({
                    recipientName: pitchData.founderName,
                    programName: pitchData.startupName + ' - Pitch Submission',
                    completionDate: pitchData.date
                })
            });
            await loadUserData();
            updateDashboard();
        } catch (err) { console.error('Certificate save error:', err); }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 850;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = 'rgba(0,212,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 28px Orbitron, monospace';
    ctx.textAlign = 'center'; ctx.fillText('MISSILEX ROCKET SPACE', canvas.width / 2, 100);
    ctx.fillStyle = '#8892b0'; ctx.font = '14px Orbitron, monospace';
    ctx.fillText('STARTUP PITCH PROGRAM', canvas.width / 2, 130);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillText('CERTIFICATE OF PITCH SUBMISSION', canvas.width / 2, 190);

    ctx.fillStyle = '#8892b0'; ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillText('This is to certify that', canvas.width / 2, 250);

    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 42px Orbitron, monospace';
    ctx.fillText(pitchData.founderName, canvas.width / 2, 310);
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 200, 320); ctx.lineTo(canvas.width / 2 + 200, 320); ctx.stroke();

    ctx.fillStyle = '#8892b0'; ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillText('has submitted a startup pitch titled', canvas.width / 2, 370);

    ctx.fillStyle = '#ff6b35'; ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillText(pitchData.startupName, canvas.width / 2, 420);

    ctx.fillStyle = '#8892b0'; ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillText('Domain: ' + pitchData.domain.toUpperCase() + ' | Stage: ' + pitchData.stage.toUpperCase(), canvas.width / 2, 460);
    ctx.fillText(pitchData.date, canvas.width / 2, 490);

    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText(pitchData.pitchId, canvas.width / 2, 520);

    ctx.beginPath(); ctx.moveTo(100, 620); ctx.lineTo(280, 620); ctx.stroke();
    ctx.fillStyle = '#D4A574'; ctx.font = 'italic bold 32px "Dancing Script", cursive';
    ctx.fillText('Aniket Singh', 190, 600);
    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText('Program Director', 190, 650);

    ctx.beginPath(); ctx.moveTo(920, 620); ctx.lineTo(1100, 620); ctx.stroke();
    ctx.fillStyle = '#D4A574'; ctx.font = 'italic bold 32px "Dancing Script", cursive';
    ctx.fillText('Ritesh Singh', 1010, 600);
    ctx.fillStyle = '#8892b0'; ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillText('Chief Research Officer', 1010, 650);

    const link = document.createElement('a');
    link.download = 'MissileX_PitchCertificate_' + pitchData.pitchId + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('Pitch certificate downloaded!');
}

document.addEventListener('DOMContentLoaded', async () => {
    init(); initNavigation(); initScrollProgress(); initEventListeners(); initOrgSections(); initInitiativeFilters();
    loadInitiatives();
    document.querySelectorAll('.org-img img').forEach(img => {
        img.onerror = function() { this.classList.add('broken'); };
        if (img.complete && img.naturalWidth === 0) img.classList.add('broken');
    });
    if (authToken) {
        try {
            const profile = await apiFetch('/auth/profile');
            currentUser = profile;
            updateUserUI();
            document.getElementById('dashboard').style.display = 'block';
            await loadUserData();
            await loadUserRegistrations();
            renderInitiatives(allInitiatives);
            updateDashboard();
            if (document.getElementById('regParticipantName')) {
                document.getElementById('regParticipantName').value = currentUser.name;
                document.getElementById('regParticipantEmail').value = currentUser.email;
            }
        } catch (err) {
            authToken = null;
            localStorage.removeItem('missilex_token');
            updateUserUI();
        }
    } else {
        updateUserUI();
    }
});
