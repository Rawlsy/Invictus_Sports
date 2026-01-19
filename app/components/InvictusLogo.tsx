export default function InvictusLogo({ className = "h-16 w-auto" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 300 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Abstract "V" for Invictus / Victory */}
      <path 
        d="M20 20L50 85L80 20" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="square" 
        className="text-green-500"
      />
      <path 
        d="M35 20L50 55L65 20" 
        stroke="currentColor" 
        strokeWidth="6" 
        className="text-white opacity-50"
      />

      {/* Modern Sports Typography */}
      <text 
        x="95" 
        y="65" 
        fill="white" 
        style={{ font: 'italic 900 48px sans-serif', letterSpacing: '-2px' }}
        className="uppercase italic"
      >
        INVICTUS
      </text>
      <text 
        x="95" 
        y="85" 
        fill="currentColor" 
        style={{ font: 'bold 16px sans-serif', letterSpacing: '8px' }}
        className="text-green-500 uppercase tracking-[0.5em]"
      >
        SPORTS
      </text>
      
      {/* Decorative Speed Lines */}
      <rect x="250" y="35" width="30" height="4" fill="currentColor" className="text-green-500" />
      <rect x="265" y="45" width="15" height="4" fill="white" className="opacity-30" />
    </svg>
  );
}