import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle,
  Calendar,
  Building2,
  Share2,
  Bookmark,
  Send,
  X,
} from 'lucide-react';

const JOBS_DB = {
  1: {
    id: 1,
    company: 'Google',
    logo: 'GO',
    logoColor: 'bg-blue-100 text-blue-700',
    role: 'Software Engineer',
    cgpa: '8.5+',
    deadline: 'Nov 15, 2026',
    location: 'Bangalore',
    type: 'Full Time',
    ctc: '24 LPA',
    status: 'Open',
    bond: 'None',
    vacancies: 15,
    department: ['CSE', 'IT', 'ECE'],
    about: `Google LLC is an American multinational technology company that specializes in Internet-related services and products. The company is known for its search engine, advertising technologies, cloud computing, software, and hardware.`,
    description: `We are looking for passionate Software Engineers to join our Engineering team in Bangalore. You will work on challenging problems that affect millions of users worldwide, contributing to Google's core products including Search, Maps, and Cloud.`,
    responsibilities: [
      'Design, develop, and maintain scalable software solutions',
      'Collaborate with cross-functional teams including PMs and designers',
      'Write clean, efficient, and well-documented code',
      'Participate in code reviews and technical discussions',
      'Contribute to engineering best practices and culture',
    ],
    requirements: [
      'B.E/B.Tech in CSE, IT, or related field',
      'Minimum CGPA of 8.5',
      'Strong problem-solving skills and knowledge of data structures & algorithms',
      'Proficiency in at least one: C++, Java, Python, Go',
      'Good understanding of OOPs, OS, DBMS, and Computer Networks',
      'No active backlogs',
    ],
    selectionProcess: [
      'Online Coding Test (90 min)',
      'Technical Interview — Round 1',
      'Technical Interview — Round 2',
      'Hiring Manager Interview',
      'HR Discussion',
    ],
    perks: ['Health insurance', 'Free meals', 'Gym membership', 'Relocation assistance', 'Stock options'],
    postedOn: 'Oct 15, 2026',
  },
  2: {
    id: 2,
    company: 'Amazon',
    logo: 'AM',
    logoColor: 'bg-orange-100 text-orange-700',
    role: 'Data Analyst',
    cgpa: '7.5+',
    deadline: 'Nov 01, 2026',
    location: 'Hyderabad',
    type: 'Full Time',
    ctc: '18 LPA',
    status: 'Open',
    bond: 'None',
    vacancies: 20,
    department: ['CSE', 'IT', 'ECE', 'EEE'],
    about: `Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.`,
    description: `Join Amazon's Data team to drive insights that power business decisions across Amazon's global operations. You will analyze large datasets, build dashboards, and present findings to leadership.`,
    responsibilities: [
      'Analyze large-scale datasets to uncover actionable insights',
      'Build and maintain analytics dashboards',
      'Work with engineering teams to define data pipelines',
      'Present findings clearly to technical and non-technical stakeholders',
    ],
    requirements: [
      'B.E/B.Tech in any engineering discipline',
      'Minimum CGPA of 7.5',
      'Proficiency in SQL and Python (Pandas, NumPy)',
      'Experience with data visualization tools (Tableau, Power BI)',
      'Strong analytical and problem-solving skills',
    ],
    selectionProcess: [
      'Online Assessment (Aptitude + Coding)',
      'Technical Interview',
      'Bar Raiser Interview',
      'HR Round',
    ],
    perks: ['Health insurance', 'Employee discounts', 'Meal vouchers', 'Learning credits'],
    postedOn: 'Oct 12, 2026',
  },
  3: {
    id: 3,
    company: 'Microsoft',
    logo: 'MS',
    logoColor: 'bg-indigo-100 text-indigo-700',
    role: 'Cloud Engineer',
    cgpa: '8.0+',
    deadline: 'Oct 30, 2026',
    location: 'Hyderabad',
    type: 'Full Time',
    ctc: '22 LPA',
    status: 'Open',
    bond: 'None',
    vacancies: 10,
    department: ['CSE', 'IT'],
    about: `Microsoft Corporation is an American multinational technology corporation producing computer software, consumer electronics, personal computers, and related services.`,
    description: `Be part of Microsoft Azure's growing engineering team. You will design and implement cloud infrastructure, build scalable services, and help customers migrate to the cloud.`,
    responsibilities: [
      'Design and implement cloud-native solutions on Azure',
      'Work with CI/CD pipelines and DevOps tools',
      'Monitor system performance and optimize infrastructure',
      'Collaborate with product teams to deliver customer-facing features',
    ],
    requirements: [
      'B.E/B.Tech in CSE or IT',
      'Minimum CGPA of 8.0',
      'Understanding of cloud concepts (IaaS, PaaS, SaaS)',
      'Knowledge of Linux, networking fundamentals',
      'Proficiency in Python or PowerShell',
    ],
    selectionProcess: ['Online Test', 'Technical Interview — 2 Rounds', 'HR Interview'],
    perks: ['Health & dental insurance', 'Work from home flexibility', 'Learning & development budget'],
    postedOn: 'Oct 10, 2026',
  },
};

const DEFAULT_JOB = {
  id: 99,
  company: 'TCS',
  logo: 'TC',
  logoColor: 'bg-purple-100 text-purple-700',
  role: 'Systems Engineer',
  cgpa: '6.5+',
  deadline: 'Nov 10, 2026',
  location: 'Pan India',
  type: 'Full Time',
  ctc: '7 LPA',
  status: 'Open',
  bond: '2 years',
  vacancies: 100,
  department: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'],
  about: `Tata Consultancy Services is an Indian multinational IT services and consulting company. TCS is one of the largest employers in India and a global IT giant.`,
  description: `TCS is hiring Systems Engineers for its Next Gen Campus Hiring drive for GCE Srirangam 2026 batch. You will work across diverse domains including banking, retail, healthcare, and government.`,
  responsibilities: [
    'Develop and maintain software applications',
    'Understand and translate client requirements into technical solutions',
    'Participate in testing, debugging, and deployment',
    'Work in agile teams with daily stand-ups and sprint reviews',
  ],
  requirements: [
    'B.E/B.Tech/M.E/M.Tech in any discipline',
    'Minimum CGPA of 6.5',
    'No active backlogs during application',
    'Not more than 2 years of gap in education',
  ],
  selectionProcess: ['TCS NQT (National Qualifier Test)', 'Technical Interview', 'HR Interview'],
  perks: ['Health insurance', 'PF & gratuity', 'Performance bonus', 'Internal mobility'],
  postedOn: 'Oct 05, 2026',
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showApply, setShowApply] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyStep, setApplyStep] = useState(1);
  const [applyForm, setApplyForm] = useState({ resume: null, coverLetter: '', consent: false });

  const job = JOBS_DB[parseInt(id)] || DEFAULT_JOB;

  const handleApply = (e) => {
    e.preventDefault();
    if (applyStep === 1) { setApplyStep(2); return; }
    setApplied(true);
    setShowApply(false);
    setApplyStep(1);
  };

  const isClosingSoon = job.deadline && (() => {
    const deadline = new Date(job.deadline);
    const now = new Date();
    return (deadline - now) / (1000 * 60 * 60 * 24) <= 5;
  })();

  return (
    <>
      <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
        {/* Back */}
          <button
            onClick={() => navigate('/student/jobs')}
            className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Job Drives
          </button>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT: main content ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Company header */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${job.logoColor} flex items-center justify-center font-bold text-xl shrink-0`}>
                      {job.logo}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{job.role}</h1>
                      <p className="text-gray-600 font-medium">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.type}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Posted {job.postedOn}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSaved(!saved)}
                      className={`p-2 rounded-lg border transition-colors ${saved ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-600'}`}
                      title="Save job"
                    >
                      <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                    </button>
                    <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-600 transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${isClosingSoon ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    ● {isClosingSoon ? 'Closing Soon' : job.status}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    CTC: {job.ctc}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    Min CGPA: {job.cgpa}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-600">
                    {job.vacancies} Vacancies
                  </span>
                </div>

                {/* Apply / Applied */}
                <div className="mt-5 flex gap-3 flex-wrap">
                  {applied ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-5 py-2.5 rounded-xl text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> Application Submitted
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowApply(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Send className="w-4 h-4" /> Apply Now
                    </button>
                  )}
                  <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
                    <Clock className="w-4 h-4" /> Deadline: {job.deadline}
                  </span>
                </div>
              </div>

              {/* About company */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> About {job.company}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">{job.about}</p>
              </div>

              {/* Job description */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-3">Job Description</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">{job.description}</p>

                <h3 className="font-semibold text-gray-800 mb-2 text-sm">Key Responsibilities</h3>
                <ul className="space-y-2">
                  {job.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-3">Eligibility & Requirements</h2>
                <ul className="space-y-2">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selection process */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Selection Process</h2>
                <div className="flex flex-col gap-0">
                  {job.selectionProcess.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        {i < job.selectionProcess.length - 1 && (
                          <div className="w-0.5 h-6 bg-blue-200" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 pb-4">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: sidebar info ── */}
            <div className="space-y-4">
              {/* Job Summary */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-4 text-gray-800">Job Overview</h3>
                <div className="space-y-3">
                  {[
                    { icon: DollarSign, label: 'CTC', value: job.ctc, color: 'text-green-600' },
                    { icon: MapPin, label: 'Location', value: job.location },
                    { icon: Briefcase, label: 'Job Type', value: job.type },
                    { icon: GraduationCap, label: 'Min CGPA', value: job.cgpa },
                    { icon: Users, label: 'Vacancies', value: `${job.vacancies} positions` },
                    { icon: Clock, label: 'Bond', value: job.bond },
                    { icon: Calendar, label: 'Deadline', value: job.deadline, color: isClosingSoon ? 'text-red-500' : '' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="bg-gray-100 p-1.5 rounded-lg shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
                        <p className={`text-sm font-medium ${color || 'text-gray-700'}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligible Departments */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-3 text-gray-800">Eligible Departments</h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.department.map((d) => (
                    <span key={d} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Perks */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-3 text-gray-800">Perks & Benefits</h3>
                <div className="space-y-1.5">
                  {job.perks.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply CTA */}
              {!applied && (
                <button
                  onClick={() => setShowApply(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm shadow-sm"
                >
                  Apply for this Position
                </button>
              )}
            </div>
          </div>
        </main>

      {/* ── Apply Modal ── */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Apply — {job.company}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{job.role} · {job.location}</p>
              </div>
              <button onClick={() => { setShowApply(false); setApplyStep(1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex px-6 pt-4 gap-2">
              {['Review Profile', 'Confirm & Submit'].map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full ${applyStep > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <p className={`text-xs mt-1 ${applyStep === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleApply} className="px-6 py-4 space-y-4">
              {applyStep === 1 ? (
                <>
                  <p className="text-sm text-gray-600">Review your profile before applying. Make sure it&apos;s up to date.</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="font-medium">Alex Harrison</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGPA</span>
                      <span className="font-semibold text-blue-600">8.9</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Department</span>
                      <span className="font-medium">CSE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium">alex.harrison@gce.edu.in</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-3 rounded-xl">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    You meet the eligibility criteria for this role.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
                    <textarea
                      rows={4}
                      placeholder="Why are you interested in this role at this company?"
                      value={applyForm.coverLetter}
                      onChange={(e) => setApplyForm((f) => ({ ...f, coverLetter: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={applyForm.consent}
                      onChange={(e) => setApplyForm((f) => ({ ...f, consent: e.target.checked }))}
                      required
                      className="mt-0.5 accent-blue-600"
                    />
                    <label htmlFor="consent" className="text-xs text-gray-600">
                      I confirm that all information in my profile is accurate and I meet the eligibility requirements for this position.
                    </label>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                {applyStep === 2 && (
                  <button type="button" onClick={() => setApplyStep(1)} className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {applyStep === 1 ? 'Continue →' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
