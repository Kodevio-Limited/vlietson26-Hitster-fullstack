import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy - OV Bouwradio",
  description: "Privacy Policy for OV Bouwradio app",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] py-12 px-4">
      <div className="mx-auto max-w-[800px] rounded-xl bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo_hitster.png" alt="OV Bouwradio Logo" width={52} height={52} unoptimized />
          <h1 className="text-3xl font-bold text-[#2c3e50]">Privacy Policy</h1>
        </div>
        <p className="mb-8 italic text-[#7f8c8d]">Last Updated: May 7, 2024</p>

        <p className="mb-6">
          Welcome to <strong>OV Bouwradio</strong> (the &quot;App&quot;). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.
        </p>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">1. Information We Collect</h2>
        <p className="mb-4">
          We collect personal information that you voluntarily provide to us when you register on the App, express an interest in obtaining information about us or our products and services, or otherwise when you contact us.
        </p>

        <h3 className="mt-6 mb-3 text-xl font-semibold text-[#2c3e50]">A. Personal Information Provided by You</h3>
        <ul className="mb-6 list-disc pl-6">
          <li className="mb-2">
            <strong>Account Data:</strong> Name, email address, password, and similar contact data used for authentication and profile management.
          </li>
          <li className="mb-2">
            <strong>Address & Location:</strong> We may collect your address and location data if you provide it for service-related features or bookings.
          </li>
          <li className="mb-2">
            <strong>Media Files:</strong> If you use the upload features, we may process images or files you choose to provide.
          </li>
        </ul>

        <h3 className="mt-6 mb-3 text-xl font-semibold text-[#2c3e50]">B. Device and Technical Information</h3>
        <ul className="mb-6 list-disc pl-6">
          <li className="mb-2">
            <strong>Camera and Photo Library:</strong> Used specifically for scanning QR codes. These images are processed to facilitate game features and are not stored permanently unless explicitly requested.
          </li>
          <li className="mb-2">
            <strong>Spotify Integration:</strong> Our App integrates with the <span className="font-semibold text-[#1DB954]">Spotify SDK</span>. We access your Spotify account information (as permitted by your Spotify settings) to provide music streaming and interactive gameplay features.
          </li>
          <li className="mb-2">
            <strong>Sensors:</strong> We use your device&apos;s motion sensors (gyroscope and accelerometer) to enhance gameplay and interactivity.
          </li>
          <li className="mb-2">
            <strong>Log and Usage Data:</strong> We automatically collect certain information when you visit, use, or navigate the App (e.g., IP address, browser and device characteristics, operating system, language preferences).
          </li>
        </ul>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">2. How We Use Your Information</h2>
        <p className="mb-4">We use the information we collect or receive:</p>
        <ul className="mb-6 list-disc pl-6">
          <li className="mb-2"><strong>To facilitate account creation and logon process.</strong></li>
          <li className="mb-2"><strong>To deliver services to the user</strong> (e.g., music playback via Spotify, QR code interactions).</li>
          
          <li className="mb-2"><strong>To improve our App</strong> and ensure a better user experience.</li>
          <li className="mb-2"><strong>To respond to user inquiries</strong> and offer support.</li>
        </ul>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">3. Will Your Information Be Shared With Anyone?</h2>
        <p className="mb-4">
          We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
        </p>
        <ul className="mb-6 list-disc pl-6">
          <li className="mb-2">
            <strong>Spotify:</strong> As our primary music service provider, data is shared according to the Spotify integration terms.
          </li>
          <li className="mb-2">
            <strong>Cloud & Hosting Providers:</strong> To store account data and facilitate backend communication.
          </li>
        </ul>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">4. Data Retention</h2>
        <p className="mb-6">
          We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements).
        </p>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">5. Security of Your Information</h2>
        <p className="mb-6">
          We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
        </p>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">6. Your Privacy Rights</h2>
        <p className="mb-6">
          In some regions (like the EEA and UK), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability.
        </p>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">7. Children&apos;s Privacy</h2>
        <p className="mb-6">
          We do not knowingly solicit data from or market to children.
        </p>

        <h2 className="mt-8 mb-4 border-l-4 border-[#1DB954] pl-4 text-2xl font-semibold text-[#2c3e50]">8. Contact Us</h2>
        <div className="mt-6 rounded-lg border-l-4 border-[#3498db] bg-[#f0f4f8] p-6">
          <p className="mb-4">If you have questions or comments about this notice, you may contact us at:</p>
          <p className="mb-2">
            <strong>Email:</strong>{" "}
            <a href="mailto:rick@deomgevingsverbinder.nl" className="text-[#1DB954] underline">
              rick@deomgevingsverbinder.nl
            </a>
          </p>
          <p className="mb-2"><strong>Company:</strong> De Omgevingsverbinder</p>
          <p>
            <strong>Website:</strong>{" "}
            <a href="https://deomgevingsverbinder.nl/" target="_blank" rel="noopener noreferrer" className="text-[#1DB954] underline">
              https://deomgevingsverbinder.nl/
            </a>
          </p>
        </div>
      </div>

      <footer className="mt-10 py-5 text-center text-sm text-[#7f8c8d]">
        &copy; 2024 OV Bouwradio. All rights reserved.
      </footer>
    </div>
  );
}