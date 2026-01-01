import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield,
  FileText,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  ChevronRight,
  Lock,
  Eye,
  Users,
  Server,
} from 'lucide-react';

type DocSection = 'threat-model' | 'ferpa' | 'program' | 'templates';

export default function Documentation() {
  const { section } = useParams<{ section?: string }>();
  const [activeSection, setActiveSection] = useState<DocSection>(
    (section as DocSection) || 'threat-model'
  );

  const sections = [
    { id: 'threat-model', label: 'Threat Model', icon: Shield },
    { id: 'ferpa', label: 'FERPA Compliance', icon: Lock },
    { id: 'program', label: 'Program Info', icon: BookOpen },
    { id: 'templates', label: 'Briefing Templates', icon: FileText },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
        <p className="text-gray-600 mt-1">
          Security documentation, policies, and program information
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="card p-2 space-y-1 sticky top-6">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as DocSection)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === id
                    ? 'bg-ewu-red text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'threat-model' && <ThreatModelSection />}
          {activeSection === 'ferpa' && <FerpaSection />}
          {activeSection === 'program' && <ProgramSection />}
          {activeSection === 'templates' && <TemplatesSection />}
        </div>
      </div>
    </div>
  );
}

function ThreatModelSection() {
  return (
    <div className="card">
      <div className="card-header border-l-4 border-l-ewu-red">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-ewu-red" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Threat Model</h2>
            <p className="text-gray-600 text-sm">Security analysis for the Schedule Dashboard</p>
          </div>
        </div>
      </div>
      <div className="card-body prose prose-gray max-w-none">
        <h3>1. System Overview</h3>
        <p>
          The EWU Cybersecurity Department Schedule Dashboard is a client-side web application
          that provides visualization and management of course schedules. The application
          runs entirely in the browser with no backend server.
        </p>

        <h3>2. Data Classification</h3>
        <table className="w-full">
          <thead>
            <tr>
              <th>Level</th>
              <th>Data Type</th>
              <th>Storage</th>
              <th>Protection</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="badge badge-success">PUBLIC</span></td>
              <td>Course schedules, times, rooms, faculty names</td>
              <td>Static JSON / GitHub Pages</td>
              <td>None required</td>
            </tr>
            <tr>
              <td><span className="badge badge-warning">INTERNAL</span></td>
              <td>Notes, annotations, preferences</td>
              <td>localStorage (plaintext)</td>
              <td>Browser isolation</td>
            </tr>
            <tr>
              <td><span className="badge badge-conflict">CONFIDENTIAL</span></td>
              <td>Student PII, advising notes</td>
              <td>localStorage (encrypted)</td>
              <td>AES-GCM 256-bit encryption</td>
            </tr>
          </tbody>
        </table>

        <h3>3. Threat Analysis</h3>

        <h4>3.1 Data Exposure (STRIDE: Information Disclosure)</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p><strong>Threat:</strong> Student PII exposed on public hosting</p>
          <p><strong>Mitigation:</strong> Student tracking features are completely disabled
          when not running on localhost. Runtime environment detection prevents accidental
          exposure.</p>
          <p><strong>Residual Risk:</strong> LOW - User must explicitly run locally to access
          student features.</p>
        </div>

        <h4>3.2 Cross-Site Scripting (STRIDE: Tampering)</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p><strong>Threat:</strong> Malicious scripts in imported JSON data</p>
          <p><strong>Mitigation:</strong> React automatically escapes content. JSON data
          is parsed safely. No raw HTML injection is used anywhere in the application.</p>
          <p><strong>Residual Risk:</strong> LOW</p>
        </div>

        <h4>3.3 Local Storage Tampering (STRIDE: Tampering)</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p><strong>Threat:</strong> Malicious modification of stored data</p>
          <p><strong>Mitigation:</strong> CONFIDENTIAL data is encrypted. INTERNAL data
          integrity is verified on load. Corrupt data triggers re-initialization.</p>
          <p><strong>Residual Risk:</strong> MEDIUM - Users with physical access can
          modify localStorage.</p>
        </div>

        <h3>4. Security Controls</h3>
        <ul>
          <li><strong>Encryption:</strong> AES-GCM 256-bit for student data</li>
          <li><strong>Key Derivation:</strong> PBKDF2 with 100,000 iterations</li>
          <li><strong>No Persistent Keys:</strong> Passphrase entered each session</li>
          <li><strong>Environment Detection:</strong> Automatic localhost verification</li>
          <li><strong>Content Security:</strong> React built-in XSS protection</li>
        </ul>
      </div>
    </div>
  );
}

function FerpaSection() {
  return (
    <div className="card">
      <div className="card-header border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3">
          <Lock className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">FERPA Compliance</h2>
            <p className="text-gray-600 text-sm">
              Family Educational Rights and Privacy Act guidelines
            </p>
          </div>
        </div>
      </div>
      <div className="card-body prose prose-gray max-w-none">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-blue-800 flex items-center gap-2 mt-0">
            <AlertTriangle className="w-5 h-5" />
            Important Notice
          </h4>
          <p className="text-blue-700 mb-0">
            This application is designed to comply with FERPA regulations. Student data
            features are only available when running locally and require encryption.
          </p>
        </div>

        <h3>What is FERPA?</h3>
        <p>
          The Family Educational Rights and Privacy Act (FERPA) is a federal law that
          protects the privacy of student education records. FERPA applies to all schools
          that receive funding from the U.S. Department of Education.
        </p>

        <h3>Protected Information</h3>
        <ul>
          <li>Student names and identification numbers</li>
          <li>Course enrollment information</li>
          <li>Grades and academic records</li>
          <li>Advising notes and communications</li>
          <li>Contact information</li>
        </ul>

        <h3>How This Dashboard Complies</h3>

        <h4>1. No Server Storage of PII</h4>
        <p>
          This application does not transmit or store student PII on any server. All
          student-related data is stored locally in the users browser with encryption.
        </p>

        <h4>2. Local-Only Student Features</h4>
        <p>
          Student tracking features are automatically disabled when the application is
          accessed via GitHub Pages or any public URL. These features only activate when
          running on localhost.
        </p>

        <h4>3. Encryption at Rest</h4>
        <p>
          All student data stored in localStorage is encrypted using AES-GCM 256-bit
          encryption. The encryption key is derived from a passphrase that the user
          must enter each session.
        </p>

        <h3>Best Practices for Users</h3>
        <ol>
          <li>Never share exported data containing student information</li>
          <li>Use strong passphrases for encrypted data</li>
          <li>Log out of the system when not in use</li>
          <li>Do not access student data on shared computers</li>
          <li>Report any suspected data breaches immediately</li>
        </ol>
      </div>
    </div>
  );
}

function ProgramSection() {
  return (
    <div className="card">
      <div className="card-header border-l-4 border-l-green-500">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cybersecurity Program</h2>
            <p className="text-gray-600 text-sm">
              Eastern Washington University Department Information
            </p>
          </div>
        </div>
      </div>
      <div className="card-body prose prose-gray max-w-none">
        <h3>About the Program</h3>
        <p>
          Eastern Washington Universitys Cybersecurity program prepares students for
          careers in information security, network defense, and digital forensics. The
          program combines theoretical foundations with hands-on practical experience.
        </p>

        <h3>Degree Programs</h3>
        <ul>
          <li><strong>B.S. in Cybersecurity</strong> - Comprehensive undergraduate program</li>
          <li><strong>B.S. in Computer Science</strong> - With cybersecurity concentration</li>
          <li><strong>Minor in Cybersecurity</strong> - For students in other majors</li>
        </ul>

        <h3>Core Courses (CYBR)</h3>
        <table className="w-full">
          <thead>
            <tr>
              <th>Course</th>
              <th>Title</th>
              <th>Credits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CYBR 301</td>
              <td>Introduction to Cybersecurity</td>
              <td>4</td>
            </tr>
            <tr>
              <td>CYBR 310</td>
              <td>Network Security</td>
              <td>4</td>
            </tr>
            <tr>
              <td>CYBR 410</td>
              <td>Ethical Hacking and Penetration Testing</td>
              <td>4</td>
            </tr>
            <tr>
              <td>CYBR 420</td>
              <td>Digital Forensics</td>
              <td>4</td>
            </tr>
            <tr>
              <td>CYBR 450</td>
              <td>Cybersecurity Capstone</td>
              <td>4</td>
            </tr>
          </tbody>
        </table>

        <h3>Contact Information</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="mb-2">
            <strong>Department of Computer Science</strong><br />
            Eastern Washington University<br />
            Cheney, WA 99004
          </p>
          <p className="mb-0">
            <a
              href="https://www.ewu.edu/cstem/computer-science/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              Visit Department Website
              <ExternalLink className="w-4 h-4" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function TemplatesSection() {
  return (
    <div className="card">
      <div className="card-header border-l-4 border-l-purple-500">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Executive Briefing Templates</h2>
            <p className="text-gray-600 text-sm">Templates for presentations and reports</p>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="grid gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h4 className="font-semibold text-gray-900 mb-2">Quarterly Schedule Report</h4>
            <p className="text-gray-600 text-sm mb-3">
              Summary of course offerings, enrollment statistics, and faculty assignments
              for executive review.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Audience: Provost, Deans, Department Chairs</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h4 className="font-semibold text-gray-900 mb-2">Capacity Planning Brief</h4>
            <p className="text-gray-600 text-sm mb-3">
              Analysis of enrollment trends, waitlist data, and recommendations for
              section additions or modifications.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Server className="w-4 h-4" />
              <span>Audience: Academic Planning Committee</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h4 className="font-semibold text-gray-900 mb-2">Faculty Workload Summary</h4>
            <p className="text-gray-600 text-sm mb-3">
              Distribution of teaching assignments across faculty members with credit
              hour totals and course types.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>Audience: Department Chair, HR</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h4 className="font-semibold text-gray-900 mb-2">Program Health Dashboard</h4>
            <p className="text-gray-600 text-sm mb-3">
              Key metrics including enrollment growth, student-to-faculty ratios, and
              course completion rates.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Audience: Board of Trustees, University President</span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Using Templates
          </h4>
          <p className="text-amber-700 text-sm mt-2 mb-0">
            Export data from the Analytics page to populate these templates. Use the
            Print function for formatted output suitable for presentations.
          </p>
        </div>
      </div>
    </div>
  );
}
