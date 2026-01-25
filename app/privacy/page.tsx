export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-black text-white mb-6 uppercase">Privacy Policy</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-xl font-bold text-white mt-8 mb-2">1. Information We Collect</h2>
      <p>We collect information you provide directly to us, such as when you create an account, specifically your email address and display name, solely for the purpose of managing your fantasy sports leagues.</p>

      <h2 className="text-xl font-bold text-white mt-8 mb-2">2. Advertising & Cookies</h2>
      <p>We use third-party advertising companies (Google AdSense) to serve ads when you visit our website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.</p>
      <p className="mt-2">Google, as a third-party vendor, uses cookies to serve ads on your site. Google's use of the advertising cookie enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p>
      <p className="mt-2">Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-[#22c55e] underline">Google Ads Settings</a>.</p>
    </div>
  );
}