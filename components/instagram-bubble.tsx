'use client'

export function InstagramBubble() {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <a
        href="https://www.instagram.com/forturd1/"
        target="_blank"
        rel="noopener noreferrer"
        className="animate-instagram-glow flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] shadow-lg transition-all hover:scale-110"
        aria-label="Síguenos en Instagram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </a>
    </div>
  )
}
