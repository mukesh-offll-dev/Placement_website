import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 px-6 md:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-900 p-1.5 rounded-lg">
              <GraduationCap className="w-5 h-5 text-blue-300" />
            </div>
            <span className="font-bold text-white">Placement Cell</span>
          </div>
          <p className="text-sm leading-relaxed">
            Dedicated to bridging the gap between prestigious education and professional excellence.
            Join our network of over 10,000 successful alumni globally.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Annual Report</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Placement Status</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Student Feedback</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Company Registration</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li>Main Campus, Academic Block IV</li>
            <li>Corporate Relations Wing</li>
            <li>placement@gce.edu.in</li>
            <li>+91 431 245 6789</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4">Newsletter</h3>
          <p className="text-sm mb-3">Get the latest campus recruitment updates.</p>
          <div className="flex">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              →
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
        <p>© 2026 GCE Srirangam Placement Cell. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
