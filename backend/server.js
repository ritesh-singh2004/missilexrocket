const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

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
    const { teamName } = req.body;
    const user = await users.findOne({ _id: req.userId });
    const team = await teams.insert({
      initiativeId: req.params.id,
      name: teamName,
      leaderId: req.userId,
      leaderName: user.name,
      leaderEmail: user.email,
      members: [{ userId: req.userId, name: user.name, email: user.email, role: 'leader' }],
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
    if (!invitedUser) return res.status(404).json({ error: 'User not found' });
    const teamData = await teams.findOne({ _id: req.params.id });
    if (!teamData) return res.status(404).json({ error: 'Team not found' });

    const existing = await teamInvites.findOne({ teamId: req.params.id, invitedUserId: invitedUser._id });
    if (existing) return res.status(400).json({ error: 'Already invited' });

    await teamInvites.insert({
      teamId: req.params.id,
      initiativeId: teamData.initiativeId,
      inviterId: req.userId,
      inviterName: (await users.findOne({ _id: req.userId })).name,
      invitedUserId: invitedUser._id,
      invitedUserName: invitedUser.name,
      invitedUserEmail: email,
      teamName: teamData.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    res.json({ message: 'Invitation sent' });
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
    await teamInvites.update({ _id: req.params.id }, { $set: { status: 'accepted' } });
    const user = await users.findOne({ _id: req.userId });
    await teams.update({ _id: invite.teamId }, { $push: { members: { userId: req.userId, name: user.name, email: user.email, role: 'member' } } });
    res.json({ message: 'Joined team' });
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
      description: req.body.description,
      repoUrl: req.body.repoUrl || '',
      demoUrl: req.body.demoUrl || '',
      presentationUrl: req.body.presentationUrl || '',
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

// ========== EMAIL (Simple log-based) ==========

app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  console.log(`\n📧 EMAIL SENT TO: ${to}\n   SUBJECT: ${subject}\n   BODY: ${body}\n`);
  res.json({ message: 'Email sent', to, subject });
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
