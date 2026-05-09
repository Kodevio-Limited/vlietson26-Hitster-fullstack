"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";

export default function SupportForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_default",
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_default",
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "public_key_default"
      );
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {status === "success" && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700">
          Your message has been sent successfully! We&apos;ll get back to you soon.
        </div>
      )}

      {status === "error" && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
          Failed to send message. Please try again or email us directly.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#2c3e50]">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#2c3e50] focus:border-[#1DB954] focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#2c3e50]">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#2c3e50] focus:border-[#1DB954] focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-medium text-[#2c3e50]">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#2c3e50] focus:border-[#1DB954] focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20"
            placeholder="What can we help you with?"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-[#2c3e50]">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#2c3e50] focus:border-[#1DB954] focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20"
            placeholder="Describe your issue or question in detail..."
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-lg bg-[#1DB954] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Send Message"}
        </button>
      </form>
    </>
  );
}