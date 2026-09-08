const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'missilex-secret-key-2026';

// Database
const dbPath = path.join(__dirname, 'data');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

const users = Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true });
const projects = Datastore.create({ filename: path.join(dbPath, 'projects.db'), autoload: true });
const pitches = Datastore.create({ filename: path.join(dbPath, 'pitches.db'), autoload: true });
const certificates = Datastore.create({ filename: path.join(dbPath, 'certificates.db'), autoload: true });
const progress = Datastore.create({ filename: path.join(dbPath, 'progress.db'), autoload: true });
const initiatives = Datastore.create({ filename: path.join(dbPath, 'initiatives.db'), autoload: true });
const registrations = Datastore.create({ filename: path.join(dbPath, 'registrations.db'), autoload: true });
const teams = Datastore.create({ filename: path.join(dbPath, 'teams.db'), autoload: true });
const submissions = Datastore.create({ filename: path.join(dbPath, 'submissions.db'), autoload: true });
const announcements = Datastore.create({ filename: path.join(dbPath, 'announcements.db'), autoload: true });
const winners = Datastore.create({ filename: path.join(dbPath, 'winners.db'), autoload: true });
const teamInvites = Datastore.create({ filename: path.join(dbPath, 'teamInvites.db'), autoload: true });
const investors = Datastore.create({ filename: path.join(dbPath, 'investors.db'), autoload: true });
const startups = Datastore.create({ filename: path.join(dbPath, 'startups.db'), autoload: true });
const connections = Datastore.create({ filename: path.join(dbPath, 'connections.db'), autoload: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ========== AUTH ROUTES ==========

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await users.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await users.insert({
      name, email, password: hashed,
      role: 'student',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      joinedAt: new Date().toISOString(),
      enrolledPrograms: [],
      completedProjects: []
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const welcomeHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#ffffff;">
      <div style="background:linear-gradient(135deg,#00d4ff,#ff6b35);padding:30px;text-align:center;">
        <h1 style="margin:0;font-size:1.5rem;color:#000;letter-spacing:2px;">WELCOME TO MISSILEX!</h1>
        <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:0.85rem;">Your space & defence journey begins now</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">Hi <strong>${name}</strong>,</p>
        <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">Welcome to <strong style="color:#00d4ff;">MissileX RocketSpace</strong>! Your account has been created successfully.</p>

        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0;color:#00d4ff;font-size:0.8rem;letter-spacing:1px;">WHAT YOU CAN DO</p>
          <p style="margin:8px 0 0;color:#ccc;font-size:0.85rem;">🚀 Join hackathons &amp; challenges</p>
          <p style="margin:4px 0 0;color:#ccc;font-size:0.85rem;">🏆 Compete in ISRO/DRDO/IAF projects</p>
          <p style="margin:4px 0 0;color:#ccc;font-size:0.85rem;">📜 Earn certificates</p>
          <p style="margin:4px 0 0;color:#ccc;font-size:0.85rem;">💰 Win prizes up to ₹2,00,000</p>
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="http://localhost:5000/index.html#initiatives" style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000;text-decoration:none;padding:14px 40px;border-radius:6px;font-family:'Orbitron',monospace;font-size:0.8rem;font-weight:700;letter-spacing:1px;">
            EXPLORE EVENTS
          </a>
        </div>

        <hr style="border:1px solid #333;margin:20px 0;">
        <p style="color:#555;font-size:0.7rem;">This is an automated email from MissileX RocketSpace. Do not reply.</p>
      </div>
    </div>`;

    await sendEmail(email, 'Welcome to MissileX RocketSpace! 🚀', welcomeHtml);

    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await users.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const loginHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#ffffff;">
      <div style="background:linear-gradient(135deg,#00d4ff,#0099cc);padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:1.2rem;color:#000;letter-spacing:2px;">LOGIN ALERT</h1>
      </div>
      <div style="padding:20px;">
        <p style="color:#ccc;font-size:0.85rem;line-height:1.6;">Hi <strong>${user.name}</strong>,</p>
        <p style="color:#ccc;font-size:0.85rem;line-height:1.6;">You have successfully logged in to <strong style="color:#00d4ff;">MissileX RocketSpace</strong>.</p>
        <p style="color:#888;font-size:0.8rem;margin-top:10px;">📅 ${new Date().toLocaleString('en-IN')}</p>
        <p style="color:#ff6b35;font-size:0.8rem;margin-top:10px;">⚠️ If this wasn't you, please change your password immediately.</p>
      </div>
    </div>`;

    sendEmail(email, 'Login Alert — MissileX RocketSpace', loginHtml);

    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    const user = await users.findOne({ _id: req.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    await users.update({ _id: req.userId }, { $set: updates });
    const user = await users.findOne({ _id: req.userId });
    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DASHBOARD ==========

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const user = await users.findOne({ _id: req.userId });
    const userProgress = await progress.find({ userId: req.userId });
    const userCerts = await certificates.find({ userId: req.userId });

    const programsEnrolled = userProgress.filter(p => p.type === 'program').length;
    const projectsCompleted = userProgress.filter(p => p.type === 'project' && p.completed).length;
    const certificatesEarned = userCerts.length;

    res.json({
      user: { name: user.name, email: user.email, avatar: user.avatar, role: user.role, joinedAt: user.joinedAt },
      stats: { programsEnrolled, projectsCompleted, certificatesEarned, hoursLogged: projectsCompleted * 12 + certificatesEarned * 8 },
      recentActivity: userProgress.slice(-5).reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PROGRAMS ==========

const programsData = [
  { id: 'space-research', title: 'Space Research Programme', category: 'SPACE', duration: '12 Weeks', level: 'Advanced', description: 'Satellite design, orbital mechanics, mission planning.', modules: 8 },
  { id: 'defence-tech', title: 'Defence Technology Programme', category: 'DEFENCE', duration: '10 Weeks', level: 'Intermediate', description: 'Guidance systems, radar tech, defence electronics.', modules: 7 },
  { id: 'ai-ml', title: 'AI & Machine Learning Programme', category: 'AI/ML', duration: '8 Weeks', level: 'Intermediate', description: 'Neural networks, computer vision, NLP for aerospace.', modules: 6 },
  { id: 'rocket-propulsion', title: 'Rocket Propulsion Programme', category: 'PROPULSION', duration: '14 Weeks', level: 'Advanced', description: 'Liquid/solid propulsion, nozzle design, combustion.', modules: 9 },
  { id: 'cyber-security', title: 'Cyber Security Programme', category: 'CYBER', duration: '8 Weeks', level: 'Intermediate', description: 'Network security, cryptography, ethical hacking.', modules: 6 },
  { id: 'drone-tech', title: 'Drone Technology Programme', category: 'UAV', duration: '10 Weeks', level: 'Intermediate', description: 'UAV design, flight control, autonomous navigation.', modules: 7 }
];

app.get('/api/programs', (req, res) => res.json(programsData));
app.get('/api/programs/:id', (req, res) => {
  const program = programsData.find(p => p.id === req.params.id);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  res.json(program);
});

app.post('/api/programs/:id/enroll', auth, async (req, res) => {
  try {
    const existing = await progress.findOne({ userId: req.userId, itemId: req.params.id, type: 'program' });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });

    await progress.insert({
      userId: req.userId, itemId: req.params.id, type: 'program',
      completed: false, progress: 0, enrolledAt: new Date().toISOString()
    });
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PROJECTS ==========

const projectsData = [
  { id: 'lunar-rover', title: 'Lunar Rover Navigation', agency: 'ISRO', category: 'ISRO', difficulty: 'Advanced', duration: '8 weeks', description: 'Autonomous navigation system for lunar surface exploration.', tech: ['Python', 'ROS2', 'Computer Vision'] },
  { id: 'mars-atmo', title: 'Mars Atmosphere Analyzer', agency: 'NASA', category: 'NASA', difficulty: 'Advanced', duration: '10 weeks', description: 'Spectroscopic analysis of Mars atmospheric composition.', tech: ['MATLAB', 'Python', 'Data Analysis'] },
  { id: 'radar-sys', title: 'Radar Signal Processing', agency: 'DRDO', category: 'DRDO', difficulty: 'Intermediate', duration: '6 weeks', description: 'Digital signal processing for modern radar systems.', tech: ['C++', 'DSP', 'FPGA'] },
  { id: 'jet-sim', title: 'Jet Fighter Flight Sim', agency: 'IAF', category: 'IAF', difficulty: 'Intermediate', duration: '8 weeks', description: 'Flight dynamics simulation for Su-30MKI aircraft.', tech: ['C#', 'Unity', 'Physics'] },
  { id: 'sub-sonar', title: 'Submarine Sonar Array', agency: 'Navy', category: 'Navy', difficulty: 'Advanced', duration: '10 weeks', description: 'Passive sonar array signal processing for ASW.', tech: ['Python', 'MATLAB', 'DSP'] },
  { id: 'tank-fire', title: 'Tank Fire Control System', agency: 'Army', category: 'Army', difficulty: 'Intermediate', duration: '6 weeks', description: 'Ballistic computer and fire control automation.', tech: ['C', 'Embedded', 'Control Systems'] },
  { id: 'ai-nav', title: 'AI Navigation System', agency: 'MissileX', category: 'AI', difficulty: 'Advanced', duration: '12 weeks', description: 'Neural network based autonomous navigation for missiles.', tech: ['Python', 'TensorFlow', 'C++'] },
  { id: 'missile-gps', title: 'Missile GPS Guidance', agency: 'DRDO', category: 'Missile', difficulty: 'Advanced', duration: '10 weeks', description: 'GPS/INS integrated guidance for precision strike.', tech: ['C', 'GPS', 'INS', 'Kalman Filter'] }
];

app.get('/api/projects', (req, res) => res.json(projectsData));
app.get('/api/projects/:id', (req, res) => {
  const project = projectsData.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

app.post('/api/projects/:id/complete', auth, async (req, res) => {
  try {
    const existing = await progress.findOne({ userId: req.userId, itemId: req.params.id, type: 'project' });
    if (existing) {
      await progress.update({ _id: existing._id }, { $set: { completed: true, progress: 100, completedAt: new Date().toISOString() } });
    } else {
      await progress.insert({
        userId: req.userId, itemId: req.params.id, type: 'project',
        completed: true, progress: 100,
        enrolledAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });
    }
    res.json({ message: 'Project completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/progress', auth, async (req, res) => {
  try {
    const userProgress = await progress.find({ userId: req.userId });
    res.json(userProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PITCHES ==========

app.post('/api/pitches', upload.array('files', 5), async (req, res) => {
  try {
    const { startupName, founderName, email, phone, stage, category, problemStatement, solution, marketSize, teamSize, fundingRequired, pitchDeck } = req.body;
    const files = req.files?.map(f => ({ name: f.originalname, path: f.path, size: f.size })) || [];

    const pitch = await pitches.insert({
      startupName, founderName, email, phone, stage, category,
      problemStatement, solution, marketSize, teamSize, fundingRequired,
      pitchDeck, files,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    res.json({ id: pitch._id, message: 'Pitch submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pitches', async (req, res) => {
  try {
    const allPitches = await pitches.find({}).sort({ submittedAt: -1 });
    res.json(allPitches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CERTIFICATES ==========

app.post('/api/certificates/generate', auth, async (req, res) => {
  try {
    const { recipientName, programName, completionDate } = req.body;
    const certId = 'MX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const cert = await certificates.insert({
      userId: req.userId,
      certId,
      recipientName,
      programName,
      completionDate: completionDate || new Date().toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      signatories: [
        { name: 'Aniket Singh', title: 'Program Director' },
        { name: 'Ritesh Singh', title: 'Chief Research Officer' }
      ]
    });
    res.json(cert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/certificates', auth, async (req, res) => {
  try {
    const certs = await certificates.find({ userId: req.userId });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ORG DATA ==========

const orgData = {
  isro: {
    name: 'Indian Space Research Organisation',
    vehicles: [
      { name: 'PSLV', fullForm: 'Polar Satellite Launch Vehicle', type: 'Launch Vehicle', status: 'Active', launches: 56, description: 'Workhorse of ISRO, known for reliability. Used for IRS satellites and commercial launches.' },
      { name: 'GSLV Mk III', fullForm: 'Geosynchronous Satellite Launch Vehicle Mk III', type: 'Launch Vehicle', status: 'Active', launches: 7, description: 'Heavy-lift vehicle capable of launching 4-ton class satellites to GTO. Used for Chandrayaan missions.' },
      { name: 'SSLV', fullForm: 'Small Satellite Launch Vehicle', type: 'Launch Vehicle', status: 'Active', launches: 3, description: 'Quick-launch vehicle for small satellites. Designed for commercial smallsat market.' },
      { name: 'LVM3', fullForm: 'Launch Vehicle Mark-3', type: 'Launch Vehicle', status: 'Active', launches: 5, description: 'Next-gen heavy lifter. Successfully launched Chandrayaan-3 and commercial missions.' },
      { name: 'RLV-TD', fullForm: 'Reusable Launch Vehicle Technology Demonstrator', type: 'RLV', status: 'Testing', launches: 1, description: 'Space shuttle-like reusable vehicle for cost-effective access to space.' },
      { name: 'Chandrayaan-3', fullForm: 'Moon Mission', type: 'Mission', status: 'Completed', launches: 1, description: 'Successful lunar south pole landing. Pragyan rover explored 100m of surface.' },
      { name: 'Gaganyaan', fullForm: 'Human Spaceflight Programme', type: 'Mission', status: 'Upcoming', launches: 0, description: 'India\'s first crewed spaceflight. Will send 3 astronauts to 400km orbit.' },
      { name: 'Aditya-L1', fullForm: 'Solar Observatory Mission', type: 'Mission', status: 'Active', launches: 1, description: 'First Indian solar observatory at Lagrange point L1. Studying sun-earth dynamics.' },
      { name: 'Mangalyaan-2', fullForm: 'Mars Orbiter Mission 2', type: 'Mission', status: 'Planned', launches: 0, description: 'Follow-up Mars mission with advanced instruments for atmospheric study.' }
    ]
  },
  drdo: {
    name: 'Defence Research and Development Organisation',
    missiles: [
      { name: 'Agni-V', type: 'ICBM', range: '5,000+ km', status: 'Operational', description: 'India\'s most advanced ICBM with MIRV capability.' },
      { name: 'Agni-IV', type: 'IRBM', range: '4,000 km', status: 'Operational', description: 'Intermediate range ballistic missile for strategic deterrence.' },
      { name: 'Agni-P', type: 'MRBM', range: '1,000-2,000 km', status: 'Operational', description: 'Next-gen canisterised missile with advanced guidance.' },
      { name: 'Prithvi-II', type: 'SRBM', range: '350 km', status: 'Operational', description: 'Surface-to-surface tactical missile for battlefield use.' },
      { name: 'BrahMos', type: 'Cruise Missile', range: '450 km', status: 'Operational', description: 'Supersonic cruise missile with Mach 2.8 speed. Indo-Russian JV.' },
      { name: 'BrahMos-NG', type: 'Cruise Missile', range: '500 km', status: 'Development', description: 'Next-gen lighter, smaller BrahMos with extended range.' },
      { name: 'Nirbhay', type: 'Cruise Missile', range: '1,000 km', status: 'Testing', description: 'Subsonic long-range cruise missile with terrain-hugging capability.' },
      { name: 'Shaurya', type: 'HBM', range: '700 km', status: 'Operational', description: 'Hypersonic boost-glide missile for strategic strike.' },
      { name: 'K-4', type: 'SLBM', range: '3,500 km', status: 'Testing', description: 'Submarine-launched ballistic missile for nuclear deterrence.' },
      { name: 'MRSAM', type: 'SAM', range: '70 km', status: 'Operational', description: 'Medium range surface-to-air missile for air defence.' }
    ]
  },
  iaf: {
    name: 'Indian Air Force',
    aircraft: [
      { name: 'Su-30MKI', type: '4.5 Gen Multirole', origin: 'India/Russia', status: 'Active', count: 262, description: 'Air superiority fighter, backbone of IAF.' },
      { name: 'Rafale', type: '4.5 Gen Multirole', origin: 'France', status: 'Active', count: 36, description: 'Omnirole fighter with advanced BVR and EW capabilities.' },
      { name: 'Tejas Mk1A', type: '4th Gen Multirole', origin: 'India', status: 'Order', count: 83, description: 'Indigenous LCA with AESA radar and advanced EW suite.' },
      { name: 'Tejas Mk2', type: '4.5 Gen Multirole', origin: 'India', status: 'Development', count: 0, description: 'Upgraded LCA with GE F414 engine and improved payload.' },
      { name: 'AMCA', type: '5th Gen Stealth', origin: 'India', status: 'Development', count: 0, description: 'Advanced Medium Combat Aircraft, India\'s stealth fighter.' },
      { name: 'MiG-29', type: '4th Gen Air Superiority', origin: 'Russia', status: 'Active', count: 66, description: 'Point defense interceptor being upgraded to UPG standard.' },
      { name: 'Jaguar DARIN III', type: 'Strike', origin: 'India/UK', status: 'Upgrading', count: 120, description: 'Deep penetration strike aircraft with modern avionics.' },
      { name: 'S-400', type: 'SAM System', origin: 'Russia', status: 'Operational', count: 5, description: 'Advanced long-range air defence missile system.' },
      { name: 'Netra AEW&C', type: 'AWACS', origin: 'India', status: 'Operational', count: 3, description: 'Indigenous airborne early warning and control system.' }
    ]
  },
  navy: {
    name: 'Indian Navy',
    vessels: [
      { name: 'INS Vikrant', type: 'Aircraft Carrier', origin: 'India', status: 'Active', description: 'India\'s first indigenous carrier, 40,000 tons.' },
      { name: 'INS Vikramaditya', type: 'Aircraft Carrier', origin: 'Russia', status: 'Active', description: 'Modified Kiev-class carrier operating MiG-29K.' },
      { name: 'INS Arighat', type: 'Nuclear Submarine', origin: 'India', status: 'Commissioned', description: 'Second Arihant-class SSBN for nuclear deterrent.' },
      { name: 'INS Kalvari', type: 'Diesel Submarine', origin: 'India/France', status: 'Active', description: 'Scorpene-class submarine with AIP potential.' },
      { name: 'INS Visakhapatnam', type: 'Destroyer', origin: 'India', status: 'Active', description: 'Project 15B guided missile destroyer with BrahMos.' },
      { name: 'INS Nilgiri', type: 'Frigate', origin: 'India', status: 'Active', description: 'Project 17A stealth frigate with advanced sensors.' },
      { name: 'INS Sumangli', type: 'Replenishment Tanker', origin: 'India', status: 'Active', description: 'Fleet support ship for extended operations.' },
      { name: 'INS Garuda', type: 'LPD', origin: 'India', status: 'Construction', description: 'Indigenous landing platform dock for amphibious ops.' }
    ]
  },
  army: {
    name: 'Indian Army',
    vehicles: [
      { name: 'Arjun Mk1A', type: 'Main Battle Tank', origin: 'India', status: 'Production', count: 118, description: 'Indigenous MBT with 120mm rifled gun and Kanchan armour.' },
      { name: 'T-90S Bhishma', type: 'Main Battle Tank', origin: 'Russia', status: 'Active', count: 1100, description: 'Primary battle tank with 125mm smoothbore gun.' },
      { name: 'T-72M1', type: 'Main Battle Tank', origin: 'Russia', status: 'Upgrading', count: 1900, description: 'Legacy MBT being upgraded to CIWS standard.' },
      { name: 'Pinaka MBRL', type: 'Rocket System', origin: 'India', status: 'Operational', count: 0, description: 'Multi-barrel rocket launcher with 75km range variants.' },
      { name: 'K-9 Vajra', type: 'Self-Propelled Howitzer', origin: 'India/South Korea', status: 'Active', count: 100, description: '155mm/52 cal tracked SP gun for artillery support.' },
      { name: 'Dhanush', type: 'Towed Howitzer', origin: 'India', status: 'Active', count: 180, description: 'Indigenous 155mm/45 cal howitzer based on Bofors design.' },
      { name: 'BMP-2 Sarath', type: 'IFV', origin: 'Russia', status: 'Active', count: 1500, description: 'Infantry fighting vehicle with 30mm cannon and ATGM.' },
      { name: 'Nag ATGM', type: 'Anti-Tank Missile', origin: 'India', status: 'Operational', count: 0, description: 'Fire-and-forget top-attack anti-tank guided missile.' }
    ]
  }
};

app.get('/api/org/:org', (req, res) => {
  const data = orgData[req.params.org];
  if (!data) return res.status(404).json({ error: 'Organization not found' });
  res.json(data);
});

// ========== CONTACT ==========

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const contacts = Datastore.create({ filename: path.join(dbPath, 'contacts.db'), autoload: true });
    await contacts.insert({ name, email, subject, message, createdAt: new Date().toISOString() });
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== INITIATIVES (Hackathons / Internships / Projects) ==========

const defaultInitiatives = [
  {
    title: 'AI Builder Cup 2026',
    type: 'hackathon',
    mode: 'Hybrid',
    fee: 'Free',
    banner: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    description: 'Build AI-powered solutions for real-world problems. Open to students and developers across India.',
    organizer: 'MissileX × Google Cloud',
    startDate: '2026-10-01',
    endDate: '2026-10-04',
    regDeadline: '2026-09-30',
    venue: 'Online + Noida Campus',
    teamSize: '2-4 members',
    prizes: '₹2,00,000 total prize pool',
    challenges: ['AI for Defence', 'Space Tech', 'Cyber Security', 'Drone Systems'],
    timeline: [
      { date: 'Oct 01', event: 'Registration Opens', status: 'upcoming' },
      { date: 'Oct 04', event: 'Hackathon Starts', status: 'upcoming' },
      { date: 'Oct 05', event: 'Mid-check Review', status: 'upcoming' },
      { date: 'Oct 06', event: 'Submission Deadline', status: 'upcoming' },
      { date: 'Oct 08', event: 'Results Announcement', status: 'upcoming' }
    ],
    faqs: [
      { q: 'Who can participate?', a: 'Any student or developer currently enrolled in or graduated from an Indian institution.' },
      { q: 'Is it free?', a: 'Yes, registration is completely free.' },
      { q: 'Can I participate solo?', a: 'Teams of 2-4 members are required. You can find teammates on our Discord.' }
    ],
    status: 'upcoming',
    registrations: 0
  },
  {
    title: 'Space Research Internship',
    type: 'internship',
    mode: 'Remote',
    fee: 'Free',
    banner: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800',
    description: '3-month research internship in satellite data analysis, orbital mechanics, and mission planning under ISRO-guided mentors.',
    organizer: 'MissileX Research Lab',
    startDate: '2026-11-01',
    endDate: '2027-01-31',
    regDeadline: '2026-10-25',
    venue: 'Remote',
    teamSize: 'Individual',
    prizes: 'Certificate + Letter of Recommendation',
    challenges: ['Satellite Image Processing', 'Orbital Mechanics', 'Mission Planning'],
    timeline: [
      { date: 'Oct 15', event: 'Applications Open', status: 'upcoming' },
      { date: 'Oct 25', event: 'Application Deadline', status: 'upcoming' },
      { date: 'Oct 28', event: 'Shortlist Announcement', status: 'upcoming' },
      { date: 'Nov 01', event: 'Internship Begins', status: 'upcoming' },
      { date: 'Jan 31', event: 'Internship Ends', status: 'upcoming' }
    ],
    faqs: [
      { q: 'What is the stipend?', a: 'This is a research internship with certificate and LOR. Stipend may be offered based on performance.' },
      { q: 'What skills are required?', a: 'Python, MATLAB, and basic understanding of aerospace concepts.' },
      { q: 'How many hours per week?', a: '15-20 hours per week, flexible schedule.' }
    ],
    status: 'upcoming',
    registrations: 0
  },
  {
    title: 'Missile Guidance Challenge',
    type: 'hackathon',
    mode: 'Virtual',
    fee: 'Free',
    banner: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800',
    description: 'Design and simulate inertial guidance algorithms for precision strike. Open to engineering students and defence enthusiasts.',
    organizer: 'MissileX × DRDO',
    startDate: '2026-09-15',
    endDate: '2026-09-20',
    regDeadline: '2026-09-12',
    venue: 'Online',
    teamSize: '1-3 members',
    prizes: '₹1,00,000 + Internship Offer',
    challenges: ['Inertial Navigation', 'Trajectory Optimization', 'Control Systems'],
    timeline: [
      { date: 'Sep 01', event: 'Registration Opens', status: 'active' },
      { date: 'Sep 12', event: 'Registration Closes', status: 'upcoming' },
      { date: 'Sep 15', event: 'Challenge Starts', status: 'upcoming' },
      { date: 'Sep 20', event: 'Submission Deadline', status: 'upcoming' },
      { date: 'Sep 22', event: 'Results', status: 'upcoming' }
    ],
    faqs: [
      { q: 'What tools can I use?', a: 'Python, C++, MATLAB, or any simulation tool of your choice.' },
      { q: 'Do I need prior defence knowledge?', a: 'Basic understanding of physics and control systems is helpful but not mandatory.' }
    ],
    status: 'active',
    registrations: 47
  },
  {
    title: 'Drone Tech Project Sprint',
    type: 'project',
    mode: 'Hybrid',
    fee: 'Free',
    banner: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    description: 'Build autonomous drone navigation systems using computer vision and reinforcement learning in a 4-week project sprint.',
    organizer: 'MissileX × IAF',
    startDate: '2026-10-10',
    endDate: '2026-11-07',
    regDeadline: '2026-10-08',
    venue: 'Remote + Noida Lab',
    teamSize: '2-3 members',
    prizes: '₹50,000 + Drone Kit',
    challenges: ['Visual SLAM', 'Path Planning', 'Obstacle Avoidance'],
    timeline: [
      { date: 'Oct 01', event: 'Registration Opens', status: 'upcoming' },
      { date: 'Oct 08', event: 'Registration Closes', status: 'upcoming' },
      { date: 'Oct 10', event: 'Sprint Starts', status: 'upcoming' },
      { date: 'Oct 24', event: 'Mid-review', status: 'upcoming' },
      { date: 'Nov 07', event: 'Final Demo', status: 'upcoming' }
    ],
    faqs: [
      { q: 'Do I need a drone?', a: 'No, simulation environments will be provided. Hardware access available at Noida lab.' },
      { q: 'What programming language?', a: 'Python primarily, with ROS2 integration.' }
    ],
    status: 'upcoming',
    registrations: 23
  }
];

app.get('/api/initiatives', async (req, res) => {
  try {
    let all = await initiatives.find({}).sort({ createdAt: -1 });
    if (all.length === 0) {
      for (const init of defaultInitiatives) {
        await initiatives.insert({ ...init, createdAt: new Date().toISOString() });
      }
      all = await initiatives.find({}).sort({ createdAt: -1 });
    }
    res.json(all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id', async (req, res) => {
  try {
    const item = await initiatives.findOne({ _id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/initiatives', async (req, res) => {
  try {
    const item = await initiatives.insert({ ...req.body, registrations: 0, createdAt: new Date().toISOString() });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/initiatives/:id/register', auth, async (req, res) => {
  try {
    const item = await initiatives.findOne({ _id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Initiative not found' });

    const existing = await registrations.findOne({ initiativeId: req.params.id, userId: req.userId });
    if (existing) return res.status(400).json({ error: 'Already registered' });

    const user = await users.findOne({ _id: req.userId });
    await registrations.insert({
      initiativeId: req.params.id,
      userId: req.userId,
      userName: user.name,
      userEmail: user.email,
      teamName: req.body.teamName || '',
      teamMembers: req.body.teamMembers || [],
      registeredAt: new Date().toISOString(),
      status: 'registered'
    });

    await initiatives.update({ _id: req.params.id }, { $inc: { registrations: 1 } });
    res.json({ message: 'Registered successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id/registrations', auth, async (req, res) => {
  try {
    const regs = await registrations.find({ initiativeId: req.params.id });
    res.json(regs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/initiatives', auth, async (req, res) => {
  try {
    const regs = await registrations.find({ userId: req.userId });
    const initiativeIds = regs.map(r => r.initiativeId);
    const inits = await initiatives.find({ _id: { $in: initiativeIds } });
    const result = regs.map(r => ({
      ...r,
      initiative: inits.find(i => i._id === r.initiativeId)
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== TEAM MANAGEMENT ==========

app.post('/api/initiatives/:id/teams', auth, async (req, res) => {
  try {
    const { teamName, members } = req.body;
    const user = await users.findOne({ _id: req.userId });
    const teamMembers = (members && members.length > 0)
      ? members.map((m, i) => ({
          userId: i === 0 ? req.userId : undefined,
          name: m.name,
          email: m.email,
          phone: m.phone || '',
          college: m.college || '',
          role: i === 0 ? 'leader' : (m.role || 'member'),
          skills: m.skills || [],
          bio: m.bio || '',
          joinedAt: new Date().toISOString()
        }))
      : [{ userId: req.userId, name: user.name, email: user.email, phone: '', college: '', role: 'leader', skills: [], bio: 'Team Leader', joinedAt: new Date().toISOString() }];

    const team = await teams.insert({
      initiativeId: req.params.id,
      name: teamName,
      leaderId: req.userId,
      leaderName: user.name,
      leaderEmail: user.email,
      members: teamMembers,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    await registrations.update({ initiativeId: req.params.id, userId: req.userId }, { $set: { teamId: team._id, teamName } });
    res.json(team);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id/teams', async (req, res) => {
  try {
    const allTeams = await teams.find({ initiativeId: req.params.id });
    res.json(allTeams);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/teams', auth, async (req, res) => {
  try {
    const myTeams = await teams.find({ leaderId: req.userId });
    const memberTeams = await teams.find({ 'members.userId': req.userId });
    const all = [...myTeams, ...memberTeams.filter(t => !myTeams.find(m => m._id === t._id))];
    res.json(all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/teams/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const invitedUser = await users.findOne({ email });
    if (!invitedUser) return res.status(404).json({ error: 'User not found. They must register first on MissileX.' });
    const teamData = await teams.findOne({ _id: req.params.id });
    if (!teamData) return res.status(404).json({ error: 'Team not found' });

    const alreadyMember = teamData.members.some(m => m.email === email);
    if (alreadyMember) return res.status(400).json({ error: 'User is already a team member' });

    const existing = await teamInvites.findOne({ teamId: req.params.id, invitedUserId: invitedUser._id, status: 'pending' });
    if (existing) return res.status(400).json({ error: 'Already invited. Waiting for response.' });

    await teamInvites.update(
      { teamId: req.params.id, invitedUserId: invitedUser._id },
      { $set: { status: 'revoked' } },
      { multi: true }
    );

    const inviter = await users.findOne({ _id: req.userId });
    const initiative = await initiatives.findOne({ _id: teamData.initiativeId });
    const inviteRecord = await teamInvites.insert({
      teamId: req.params.id,
      initiativeId: teamData.initiativeId,
      inviterId: req.userId,
      inviterName: inviter.name,
      invitedUserId: invitedUser._id,
      invitedUserName: invitedUser.name,
      invitedUserEmail: email,
      teamName: teamData.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    const dashboardUrl = `http://localhost:5000/dashboard-initiative.html?id=${teamData.initiativeId}`;
    const emailHtml = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#ffffff;">
        <div style="background:linear-gradient(135deg,#00d4ff,#ff6b35);padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:1.5rem;color:#000;letter-spacing:2px;">MISSILEX ROCKETSPACE</h1>
          <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:0.85rem;">Team Invitation</p>
        </div>
        <div style="padding:30px;">
          <h2 style="color:#00d4ff;font-size:1.1rem;">You've been invited to join a team!</h2>
          <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">Hi <strong>${invitedUser.name}</strong>,</p>
          <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">
            <strong>${inviter.name}</strong> has invited you to join team <strong>"${teamData.name}"</strong>
            for the event <strong>"${initiative ? initiative.title : 'MissileX Event'}"</strong>.
          </p>

          <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0;color:#00d4ff;font-size:0.8rem;letter-spacing:1px;">EVENT DETAILS</p>
            <p style="margin:8px 0 0;color:#ccc;font-size:0.85rem;">📅 ${initiative ? initiative.startDate + ' to ' + initiative.endDate : 'TBA'}</p>
            <p style="margin:4px 0 0;color:#ccc;font-size:0.85rem;">👥 Team Size: ${initiative ? initiative.teamSize : 'TBA'}</p>
            <p style="margin:4px 0 0;color:#ccc;font-size:0.85rem;">🏆 Prizes: ${initiative ? initiative.prizes : 'TBA'}</p>
          </div>

          <div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000;text-decoration:none;padding:14px 40px;border-radius:6px;font-family:'Orbitron',monospace;font-size:0.8rem;font-weight:700;letter-spacing:1px;">
              ACCEPT INVITATION
            </a>
          </div>

          <p style="color:#888;font-size:0.8rem;line-height:1.5;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${dashboardUrl}" style="color:#00d4ff;">${dashboardUrl}</a>
          </p>

          <hr style="border:1px solid #333;margin:20px 0;">
          <p style="color:#555;font-size:0.7rem;">This is an automated email from MissileX RocketSpace. Do not reply.</p>
        </div>
      </div>`;

    await sendEmail(email, `Team Invitation: ${teamData.name} — ${initiative ? initiative.title : 'MissileX Event'}`, emailHtml);

    res.json({ message: 'Invitation sent to ' + invitedUser.name + ' via email' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/teams/:id/remove-member', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const teamData = await teams.findOne({ _id: req.params.id });
    if (!teamData) return res.status(404).json({ error: 'Team not found' });
    if (teamData.leaderId !== req.userId) return res.status(403).json({ error: 'Only team leader can remove members' });
    if (email === teamData.leaderEmail) return res.status(400).json({ error: 'Cannot remove team leader' });

    await teams.update({ _id: req.params.id }, { $pull: { members: { email: email } } });
    const updatedTeam = await teams.findOne({ _id: req.params.id });
    res.json({ message: 'Member removed', team: updatedTeam });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/invites', auth, async (req, res) => {
  try {
    const invites = await teamInvites.find({ invitedUserId: req.userId });
    res.json(invites);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invites/:id/accept', auth, async (req, res) => {
  try {
    const invite = await teamInvites.findOne({ _id: req.params.id });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite already processed' });

    await teamInvites.update({ _id: req.params.id }, { $set: { status: 'accepted' } });
    const user = await users.findOne({ _id: req.userId });
    await teams.update({ _id: invite.teamId }, {
      $push: {
        members: {
          userId: req.userId,
          name: user.name,
          email: user.email,
          phone: '',
          college: '',
          role: 'member',
          skills: [],
          bio: '',
          joinedAt: new Date().toISOString()
        }
      }
    });

    const teamData = await teams.findOne({ _id: invite.teamId });
    const acceptEmail = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#ffffff;">
      <div style="background:linear-gradient(135deg,#00ff88,#00cc6a);padding:30px;text-align:center;">
        <h1 style="margin:0;font-size:1.5rem;color:#000;letter-spacing:2px;">WELCOME TO THE TEAM!</h1>
      </div>
      <div style="padding:30px;">
        <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">Hi <strong>${user.name}</strong>,</p>
        <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">You have successfully joined team <strong>"${invite.teamName}"</strong>!</p>
        <p style="color:#ccc;font-size:0.9rem;line-height:1.6;">Team Members: ${teamData ? teamData.members.map(m => m.name).join(', ') : ''}</p>
        <p style="color:#888;font-size:0.8rem;margin-top:20px;">Good luck with the challenge!</p>
      </div>
    </div>`;
    await sendEmail(user.email, `Welcome to team "${invite.teamName}"!`, acceptEmail);

    res.json({ message: 'Joined team successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invites/:id/reject', auth, async (req, res) => {
  try {
    await teamInvites.update({ _id: req.params.id }, { $set: { status: 'rejected' } });
    res.json({ message: 'Invite rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== SUBMISSIONS ==========

app.post('/api/initiatives/:id/submissions', auth, async (req, res) => {
  try {
    const user = await users.findOne({ _id: req.userId });
    const reg = await registrations.findOne({ initiativeId: req.params.id, userId: req.userId });
    const sub = await submissions.insert({
      initiativeId: req.params.id,
      userId: req.userId,
      userName: user.name,
      userEmail: user.email,
      teamId: reg?.teamId || null,
      teamName: reg?.teamName || 'Individual',
      title: req.body.title,
      challenge: req.body.challenge || '',
      description: req.body.description,
      repoUrl: req.body.repoUrl || '',
      demoUrl: req.body.demoUrl || '',
      videoUrl: req.body.videoUrl || '',
      linkedinUrl: req.body.linkedinUrl || '',
      presentationUrl: req.body.presentationUrl || '',
      techUsed: req.body.techUsed || '',
      duration: req.body.duration || '',
      teamMembers: req.body.teamMembers || '',
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id/submissions', async (req, res) => {
  try {
    const subs = await submissions.find({ initiativeId: req.params.id });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/submissions', auth, async (req, res) => {
  try {
    const subs = await submissions.find({ userId: req.userId });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ANNOUNCEMENTS ==========

app.post('/api/initiatives/:id/announcements', auth, async (req, res) => {
  try {
    const ann = await announcements.insert({
      initiativeId: req.params.id,
      title: req.body.title,
      content: req.body.content,
      type: req.body.type || 'general',
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    });
    res.json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id/announcements', async (req, res) => {
  try {
    const anns = await announcements.find({ initiativeId: req.params.id }).sort({ createdAt: -1 });
    res.json(anns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== WINNERS ==========

app.post('/api/initiatives/:id/winners', auth, async (req, res) => {
  try {
    const win = await winners.insert({
      initiativeId: req.params.id,
      rank: req.body.rank,
      teamName: req.body.teamName,
      memberNames: req.body.memberNames || [],
      projectTitle: req.body.projectTitle,
      prize: req.body.prize,
      createdAt: new Date().toISOString()
    });
    res.json(win);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/initiatives/:id/winners', async (req, res) => {
  try {
    const wins = await winners.find({ initiativeId: req.params.id }).sort({ rank: 1 });
    res.json(wins);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/winners/:id', auth, async (req, res) => {
  try {
    await winners.remove({ _id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== INVESTOR-STARTUP PLATFORM ==========

const investorAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userType = decoded.type || 'student';
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Investor Signup
app.post('/api/investor/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = await investors.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const investor = await investors.insert({
      name, email, password: hashed, phone: phone || '',
      investorType: '', sectors: [], investmentRange: { min: 0, max: 0 },
      pastInvestments: '', kycDocuments: '', linkedin: '', website: '',
      firmName: '', avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      verified: false, createdAt: new Date().toISOString()
    });
    const token = jwt.sign({ id: investor._id, type: 'investor' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...data } = investor;
    res.json({ token, user: data, type: 'investor' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Investor Login
app.post('/api/investor/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const investor = await investors.findOne({ email });
    if (!investor) return res.status(400).json({ error: 'Investor not found' });
    const valid = await bcrypt.compare(password, investor.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: investor._id, type: 'investor' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...data } = investor;
    res.json({ token, user: data, type: 'investor' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Investor Profile
app.get('/api/investor/profile', investorAuth, async (req, res) => {
  try {
    const inv = await investors.findOne({ _id: req.userId });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const { password: _, ...data } = inv;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/investor/profile', investorAuth, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; delete updates._id;
    await investors.update({ _id: req.userId }, { $set: updates });
    const inv = await investors.findOne({ _id: req.userId });
    const { password: _, ...data } = inv;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Browse Startups (Investor)
app.get('/api/investor/startups', investorAuth, async (req, res) => {
  try {
    const { sector, stage, search } = req.query;
    let query = {};
    if (sector) query.sector = sector;
    if (stage) query.fundingStage = stage;
    let all = await startups.find(query).sort({ createdAt: -1 });
    if (search) {
      const s = search.toLowerCase();
      all = all.filter(st => st.startupName.toLowerCase().includes(s) || st.sector.toLowerCase().includes(s) || st.description.toLowerCase().includes(s));
    }
    const safe = all.map(({ password, ...rest }) => rest);
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Express Interest
app.post('/api/investor/interest', investorAuth, async (req, res) => {
  try {
    const { startupId, message } = req.body;
    const startup = await startups.findOne({ _id: startupId });
    if (!startup) return res.status(404).json({ error: 'Startup not found' });
    const inv = await investors.findOne({ _id: req.userId });
    const existing = await connections.findOne({ investorId: req.userId, startupId });
    if (existing && existing.status !== 'rejected') return res.status(400).json({ error: 'Already expressed interest' });
    if (existing) {
      await connections.update({ _id: existing._id }, { $set: { status: 'pending', message: message || '', updatedAt: new Date().toISOString() } });
    } else {
      await connections.insert({
        investorId: req.userId, investorName: inv.name, investorEmail: inv.email,
        investorFirm: inv.firmName || '', investorType: inv.investorType || '',
        startupId, startupName: startup.startupName, founderEmail: startup.email,
        founderId: startup.userId, message: message || '',
        status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    }
    await sendEmail(startup.email, `New Investor Interest — ${inv.name}`, `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:20px;"><h2 style="color:#00d4ff;">New Investor Interest!</h2><p><strong>${inv.name}</strong> (${inv.firmName || 'Individual'}) is interested in your startup <strong>"${startup.startupName}"</strong>.</p><p style="color:#888;">${message || ''}</p><p style="margin-top:20px;"><a href="http://localhost:5000/startup-dashboard.html" style="background:#00d4ff;color:#000;padding:10px 20px;text-decoration:none;border-radius:5px;">View in Dashboard</a></p></div>`);
    res.json({ message: 'Interest expressed! Founder will be notified.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Investor Connections
app.get('/api/investor/connections', investorAuth, async (req, res) => {
  try {
    const conns = await connections.find({ investorId: req.userId }).sort({ createdAt: -1 });
    res.json(conns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Startup Signup
app.post('/api/startup/signup', async (req, res) => {
  try {
    const { name, email, password, phone, startupName } = req.body;
    if (!name || !email || !password || !startupName) return res.status(400).json({ error: 'All fields required' });
    const existing = await startups.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const startup = await startups.insert({
      founderName: name, email, password: hashed, phone: phone || '',
      startupName, sector: '', logo: '', description: '', website: '',
      pitchVideo: '', pitchDeck: '', fundingStage: '', fundingAmount: 0,
      useOfFunds: '', govtBenefits: '', societyBenefits: '',
      teamDetails: '', traction: '', nature: '',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      verified: false, createdAt: new Date().toISOString()
    });
    const token = jwt.sign({ id: startup._id, type: 'startup' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...data } = startup;
    res.json({ token, user: data, type: 'startup' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Startup Login
app.post('/api/startup/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const startup = await startups.findOne({ email });
    if (!startup) return res.status(400).json({ error: 'Startup not found' });
    const valid = await bcrypt.compare(password, startup.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: startup._id, type: 'startup' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...data } = startup;
    res.json({ token, user: data, type: 'startup' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Startup Profile
app.get('/api/startup/profile', investorAuth, async (req, res) => {
  try {
    const st = await startups.findOne({ _id: req.userId });
    if (!st) return res.status(404).json({ error: 'Not found' });
    const { password: _, ...data } = st;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/startup/profile', investorAuth, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; delete updates._id;
    await startups.update({ _id: req.userId }, { $set: updates });
    const st = await startups.findOne({ _id: req.userId });
    const { password: _, ...data } = st;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All Startups (public listing)
app.get('/api/startups', async (req, res) => {
  try {
    const { sector, stage, search } = req.query;
    let query = {};
    if (sector) query.sector = sector;
    if (stage) query.fundingStage = stage;
    let all = await startups.find(query).sort({ createdAt: -1 });
    if (search) {
      const s = search.toLowerCase();
      all = all.filter(st => st.startupName.toLowerCase().includes(s) || st.sector.toLowerCase().includes(s) || (st.description||'').toLowerCase().includes(s));
    }
    const safe = all.map(({ password, ...rest }) => rest);
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single Startup (public)
app.get('/api/startups/:id', async (req, res) => {
  try {
    const st = await startups.findOne({ _id: req.params.id });
    if (!st) return res.status(404).json({ error: 'Not found' });
    const { password, ...data } = st;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Startup Connections (investors interested)
app.get('/api/startup/connections', investorAuth, async (req, res) => {
  try {
    const conns = await connections.find({ startupId: req.userId }).sort({ createdAt: -1 });
    res.json(conns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Accept/Reject Connection
app.post('/api/startup/connections/:id/respond', investorAuth, async (req, res) => {
  try {
    const { status } = req.body; // accepted or rejected
    const conn = await connections.findOne({ _id: req.params.id });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.startupId !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    await connections.update({ _id: req.params.id }, { $set: { status, updatedAt: new Date().toISOString() } });
    const inv = await investors.findOne({ _id: conn.investorId });
    if (status === 'accepted' && inv) {
      await sendEmail(inv.email, `Connection Accepted — ${conn.startupName}`, `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:20px;"><h2 style="color:#00ff88;">Connection Accepted!</h2><p>Great news! <strong>${conn.startupName}</strong> has accepted your interest request.</p><p>Founder Email: <strong>${conn.founderEmail}</strong></p><p style="margin-top:20px;"><a href="http://localhost:5000/investor-dashboard.html" style="background:#00d4ff;color:#000;padding:10px 20px;text-decoration:none;border-radius:5px;">View in Dashboard</a></p></div>`);
    }
    res.json({ message: 'Connection ' + status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== EMAIL (Simple log-based) ==========

// ========== EMAIL SERVICE ==========

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'missilexrocketspace@gmail.com',
    pass: 'YOUR_APP_PASSWORD'
  }
});

async function sendEmail(to, subject, htmlBody) {
  try {
    await emailTransporter.sendMail({
      from: '"MissileX RocketSpace" <missilexrocketspace@gmail.com>',
      to, subject,
      html: htmlBody
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.log(`📧 Email (log): To=${to} | Subject=${subject}`);
    return false;
  }
}

app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:#0a0a0f;padding:30px;border-radius:10px;"><h1 style="color:#00d4ff;font-size:1.5rem;">MISSILEX ROCKETSPACE</h1><p style="color:#888;font-size:0.9rem;">${subject}</p><hr style="border:1px solid #333;"><p style="color:#ccc;font-size:0.9rem;line-height:1.6;">${body}</p><hr style="border:1px solid #333;"><p style="color:#555;font-size:0.75rem;">This is an automated email from MissileX RocketSpace. Do not reply.</p></div></div>`;
  await sendEmail(to, subject, html);
  res.json({ message: 'Email sent', to, subject });
});

// ========== ADMIN APIs ==========

app.post('/api/admin/initiatives/:id/announcements', auth, async (req, res) => {
  try {
    const ann = await announcements.insert({
      initiativeId: req.params.id,
      title: req.body.title,
      content: req.body.content,
      type: req.body.type || 'general',
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    });
    res.json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/initiatives/:id/winners', auth, async (req, res) => {
  try {
    const win = await winners.insert({
      initiativeId: req.params.id,
      rank: req.body.rank,
      teamName: req.body.teamName,
      memberNames: req.body.memberNames || [],
      projectTitle: req.body.projectTitle,
      prize: req.body.prize,
      createdAt: new Date().toISOString()
    });
    res.json(win);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/winners/:id', auth, async (req, res) => {
  try {
    await winners.remove({ _id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/initiatives/:id/submissions', auth, async (req, res) => {
  try {
    const subs = await submissions.find({ initiativeId: req.params.id });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== SEED DATA ==========

async function seedData() {
  const userCount = await users.count({});
  if (userCount > 0) return;

  const demoUsers = [
    { name: 'Rahul Sharma', email: 'rahul@student.com', password: await bcrypt.hash('password123', 10), role: 'student', avatar: 'RS', joinedAt: '2026-01-15T00:00:00.000Z', enrolledPrograms: ['space-research', 'ai-ml'], completedProjects: ['lunar-rover', 'ai-nav'] },
    { name: 'Priya Patel', email: 'priya@student.com', password: await bcrypt.hash('password123', 10), role: 'student', avatar: 'PP', joinedAt: '2026-02-20T00:00:00.000Z', enrolledPrograms: ['defence-tech'], completedProjects: ['radar-sys'] }
  ];
  for (const u of demoUsers) await users.insert(u);

  console.log('Seed data inserted');
}

// ========== START ==========

app.listen(PORT, () => {
  console.log(`\n  MissileX Backend running on http://localhost:${PORT}\n`);
  seedData();
});
