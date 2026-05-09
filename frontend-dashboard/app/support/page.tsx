import type { Metadata } from "next";
import Image from "next/image";
import SupportForm from "./SupportForm";

export const metadata: Metadata = {
  title: "Support - OV Bouwradio",
  description: "Contact Support for OV Bouwradio app",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] py-12 px-4">
      <div className="mx-auto max-w-[800px] rounded-xl bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo_hitster.png" alt="OV Bouwradio Logo" width={52} height={52} unoptimized />
          <h1 className="text-3xl font-bold text-[#2c3e50]">Support</h1>
        </div>
        <p className="mb-8 text-[#7f8c8d]">
          Have a question or need help? Fill out the form below and we&apos;ll get back to you as soon as possible.
        </p>

        <SupportForm />

        <div className="mt-10 rounded-lg border-l-4 border-[#3498db] bg-[#f0f4f8] p-6">
          <p className="mb-4 font-medium text-[#2c3e50]">Other ways to reach us:</p>
          <p className="mb-2">
            <strong>Email:</strong>{" "}
            <a href="mailto:rick@deomgevingsverbinder.nl" className="text-[#1DB954] underline">
              rick@deomgevingsverbinder.nl
            </a>
          </p>
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