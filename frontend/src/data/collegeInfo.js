/**
 * Public information about Government College of Engineering, Srirangam, used by the landing page.
 *
 * Every fact below is taken from the college's official website (https://gces.edu.in), checked
 * November 2026. Nothing is estimated: where the site gives no figure, none is shown. Update this
 * file (not the components) when the official site changes.
 */

export const OFFICIAL_SITE = 'https://gces.edu.in';
const site = (path) => `${OFFICIAL_SITE}${path}`;

export const COLLEGE = {
  name: 'Government College of Engineering, Srirangam',
  shortName: 'GCE Srirangam',
  motto: 'Knowledge · Innovation · Service',
  location: 'Tiruchirappalli, Tamil Nadu',
  established: 2013,
  affiliation: 'Anna University, Chennai',
  // gces.edu.in home page, "Welcome to GCE Srirangam".
  about: [
    'Government College of Engineering, Srirangam, in Trichy, Tamil Nadu, was established in 2013 by the Government of Tamil Nadu. It is the tenth state-owned engineering institution in the state and is affiliated to Anna University, Chennai.',
    'The first batch was admitted in 2013–2014 to Civil, Mechanical, Electrical and Electronics, Electronics and Communication, and Computer Science Engineering. B.E. Mechatronics Engineering was added in 2025 for automation and robotics.',
    'Departments are supported by laboratories, smart classrooms, seminar halls and computing facilities with high-speed Internet, and the college is recognised by Anna University as a Research Centre for all its departments.',
  ],
  highlights: [
    { label: 'Tenth state-owned Government Engineering College in Tamil Nadu', source: site('/genesis') },
    { label: 'Anna University recognised Research Centre (code 2600300)', source: site('/research-centre') },
    { label: 'All B.E. programmes AICTE approved', source: site('/course-offered') },
  ],
};

/** Counters as published on the gces.edu.in home page. */
export const STATS = [
  { value: '2013', label: 'Established' },
  { value: '6', label: 'B.E. programmes' },
  { value: '50+', label: 'Faculty' },
  { value: '2000+', label: 'Students' },
  { value: '30+', label: 'Recruiters' },
];

/** gces.edu.in/vision-mission (verbatim). */
export const VISION =
  'To contribute to our Country through Excellence in Scientific and Technical Education and to serve as a valuable resource through application of Knowledge to benefit Industries and Society.';

export const MISSION = [
  'To provide Quality Engineering Education',
  'To provide State-of-Art Infrastructure',
  'To create innovative applications of Technology and develop Entrepreneurship Skills',
  'To develop Leadership and create Passion to work Wisely, Creatively and Effectively for the betterment of the Society',
];

/**
 * gces.edu.in/course-offered (intake, year started) and each department's "About" page.
 * Descriptions are condensed from those pages without adding claims.
 */
export const DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    started: 2013,
    intake: 60,
    summary:
      'Started in 2013, the department combines theory with practical work in modern laboratories, keeps long-term links with industry and works on students’ soft skills to prepare them for placement.',
    url: site('/15/department-computer-science-engineering-about-department'),
  },
  {
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    started: 2013,
    intake: 60,
    summary:
      'Laboratories include Electronic Devices, Electronic Circuits, Microprocessors and Microcontrollers, Linear Integrated Circuits and a computer simulation lab, with smart classrooms.',
    url: site('/19/department-electronics-and-communication-engineering-about-department'),
  },
  {
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    started: 2013,
    intake: 60,
    summary:
      'Laboratories include Electrical Circuits, DC Machines, AC Machines, Engineering Practice and Simulation, along with a computer laboratory and smart classroom.',
    url: site('/17/department-electrical-and-electronics-engineering-about-department'),
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    started: 2013,
    intake: 60,
    summary:
      'Industry-oriented learning through long-term industry associations: internships, industrial visits, guest lectures and joint projects keep the curriculum aligned with current technology.',
    url: site('/16/department-mechanical-engineering-about-department'),
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    started: 2013,
    intake: 60,
    summary:
      'Computing facilities in the CAD laboratory, smart classrooms, and Survey Practical I & II and Fluid Mechanics laboratories.',
    url: site('/18/department-civil-engineering-about-department'),
  },
  {
    code: 'MCT',
    name: 'Mechatronics Engineering',
    started: 2025,
    intake: 60,
    summary:
      'The newest programme, integrating mechanical, electronics and computer engineering for automation and robotics. Admission is through TNEA, with lateral entry into the second year.',
    url: site('/48/department-mechatronics-engineering-about-department'),
  },
];

export const SCIENCE_AND_HUMANITIES = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Tamil'];

/** gces.edu.in home page: what the Training and Placement Cell does. */
export const PLACEMENT_CELL_ROLE =
  'The Training and Placement Cell bridges the gap between academic learning and industry expectations through training programmes, soft-skill development, mock interviews and placement drives with reputed companies.';

export const PLACEMENT_SERVICES = [
  { key: 'training', title: 'Training programmes', text: 'Programmes that bridge academic learning and industry expectations.' },
  { key: 'softskills', title: 'Soft-skill development', text: 'Building the professional and communication skills employers expect.' },
  { key: 'mock', title: 'Mock interviews', text: 'Interview practice to prepare students for recruitment.' },
  { key: 'drives', title: 'Placement drives', text: 'Drives conducted in collaboration with reputed companies and organisations.' },
];

/** Recent training activities announced on gces.edu.in (title and date as published). */
export const TRAINING_EVENTS = [
  {
    title: 'Finishing School programme for final-year CSE students',
    date: '19–20 Feb 2026',
    url: site('/finishing-school-program-final-year-computer-science-and-engineering-students-february-19-and-20'),
  },
  {
    title: 'Generative AI (GenAI) skillset workshop by DoTE and GUVI–HCL',
    date: '19–23 Jan 2026',
    url: site('/department-technical-education-and-guvi-hcl-conducts-workshop-generative-aigenai-skillset-during'),
  },
  {
    title: 'Summer Training Program 2026 by the Indian Space Academy (ISA)',
    date: '2026',
    url: site('/summer-training-program-2026-organized-indian-space-academy-isa'),
  },
];

/** gces.edu.in/placement-cell-members */
export const PLACEMENT_TEAM = {
  officers: [
    { name: 'Dr. D. Karthickeyan', role: 'Training & Placement Officer', designation: 'Assistant Professor', email: 'danajoti2008@gces.edu.in' },
    { name: 'Dr. R. Ranjith', role: 'Training & Placement Officer', designation: 'Assistant Professor', email: 'r.ranjith@gces.edu.in' },
  ],
  coordinators: [
    { name: 'Dr. P. R. Dhevasenaa', designation: 'Assistant Professor' },
    { name: 'Dr. A. Baskaran', designation: 'Assistant Professor' },
    { name: 'Dr. M. Bhavani', designation: 'Assistant Professor' },
    { name: 'Dr. K. Bommaraju', designation: 'Assistant Professor' },
    { name: 'Dr. R. Bhavani', designation: 'Associate Professor' },
  ],
  url: site('/placement-cell-members'),
};

/**
 * Placed-student lists published on gces.edu.in, with companies named in each list.
 * Only companies recorded as placing students are listed ("shortlisted"/"on hold" entries are left out).
 */
export const PLACEMENT_RECORDS = [
  {
    year: '2025–26',
    url: site('/sites/gces.edu.in/files/Department%20File%20upload/List_of_Placed_students_2025-26.pdf'),
    companies: ['Brakes India', 'Mitsuba', 'MRF', 'Infosys', 'Zoho', 'Aquasub Engineering', 'Gana Outsourcing', 'REBAR D&D', 'DWB Design', 'Nizcare'],
  },
  {
    year: '2024–25',
    url: site('/sites/gces.edu.in/files/Department%20File%20upload/List_of_Placed_students_2024-25.pdf'),
    companies: ['Delphi-TVS', 'Foxconn', 'Mitsuba', 'ModPro Engineering Solutions', 'Pinaca Labs', 'Qspiders', 'TAP Academy', 'Reliance Nippon Life', 'Aarbee Structures', 'Anand Engineering'],
  },
  {
    year: '2023–24',
    url: site('/sites/gces.edu.in/files/Department%20File%20upload/List%20of%20Placed%20students_2023-24.pdf'),
    companies: ['TCS', 'Wipro', 'Tech Mahindra', 'Syncfusion', 'Dynatrace', 'Magna Automotive', 'ZF WABCO', 'DANA India', 'Syrma SGS', 'CCCL', 'Icanio Technologies', 'Saptang Labs', 'Delphi TVS'],
  },
  {
    year: '2021–22',
    url: site('/sites/gces.edu.in/files/Placement/List%20of%20students%20placed%20in%202021-2022-for%20website.pdf'),
    companies: ['TCS', 'Cognizant', 'Capgemini', 'Admindroid Solutions', 'Zentron Labs', 'Panacea Medical Technologies', 'One Bill Software', 'Enlighted Energy Systems'],
  },
];

/** Every distinct recruiter across the published lists, for the recruiter band. */
export const RECRUITERS = [...new Set(PLACEMENT_RECORDS.flatMap((r) => r.companies))];

/** Photographs from gces.edu.in, converted to WebP and served from public/campus/. */
export const CAMPUS_PHOTOS = [
  { src: '/campus/campus-main-block.webp', alt: 'Main block of GCE Srirangam with palm-lined approach', caption: 'Main block' },
  { src: '/campus/campus-entrance.webp', alt: 'Entrance gate and domed buildings of GCE Srirangam', caption: 'Campus entrance' },
  { src: '/campus/campus-admin-block.webp', alt: 'Administrative block of GCE Srirangam', caption: 'Administrative block' },
  { src: '/campus/campus-wide-view.webp', alt: 'Wide view of the GCE Srirangam academic buildings', caption: 'Academic buildings' },
  { src: '/campus/fluid-mechanics-lab.webp', alt: 'Students working in the Fluid Mechanics laboratory', caption: 'Fluid Mechanics laboratory' },
  { src: '/campus/campus-building.webp', alt: 'A campus building at GCE Srirangam', caption: 'Campus facilities' },
];

/** gces.edu.in/our-principal */
export const PRINCIPAL = {
  name: 'Dr. K. Manonmani',
  qualification: 'M.E., Ph.D.',
  photo: '/campus/principal.webp',
  quote:
    'Today, the role of an Institution is not only to pursue academic excellence but also to motivate and empower the students to be lifelong learners, critical thinkers, and productive Engineers.',
  url: site('/our-principal'),
};

/** gces.edu.in/contact */
export const CONTACT = {
  address: ['Trichy – Madurai Highway, Sethurappatti Road', 'Tiruchirappalli – 620 012, Tamil Nadu'],
  phones: [
    { label: 'Office', value: '9488008656', href: 'tel:+919488008656' },
    { label: 'Hostel', value: '9488091653', href: 'tel:+919488091653' },
    { label: 'Landline', value: '0431-2407517', href: 'tel:04312407517' },
  ],
  email: 'principal@gces.edu.in',
  mapUrl: site('/map'),
  directionsUrl: site('/how-get-gces'),
};

export const OFFICIAL_LINKS = [
  { label: 'Official website', url: OFFICIAL_SITE },
  { label: 'Courses offered', url: site('/course-offered') },
  { label: 'Placement cell members', url: site('/placement-cell-members') },
  { label: 'Academic calendar 2025–26', url: site('/sites/gces.edu.in/files/GCES%20Calendar%20Final.pdf') },
  { label: 'AICTE approval', url: site('/2025-2026') },
  { label: 'Alumni association', url: site('/alumni') },
  { label: 'Mandatory disclosure', url: site('/mandatory-disclosure') },
  { label: 'How to reach GCES', url: site('/how-get-gces') },
];
