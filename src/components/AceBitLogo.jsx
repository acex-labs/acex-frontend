export function AceBitIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AceBit"
    >
      <polygon points="50,6 94,88 6,88"  fill="#0a5a9e" />
      <polygon points="50,20 85,83 15,83" fill="#1472be" />
      <polygon points="50,34 74,76 26,76" fill="#1e8fd8" />
      <polygon points="50,48 64,70 36,70" fill="#2eaaee" />
      <polygon points="50,59 56,66 44,66" fill="#5cc8ff" />
    </svg>
  )
}

export function AceBitLogo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 230 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AceBit"
    >
      {/* Icon */}
      <polygon points="32,4 60,58 4,58"  fill="#0a5a9e" />
      <polygon points="32,14 55,54 9,54"  fill="#1472be" />
      <polygon points="32,25 47,50 17,50" fill="#1e8fd8" />
      <polygon points="32,36 41,48 23,48" fill="#2eaaee" />
      <polygon points="32,44 36,50 28,50" fill="#5cc8ff" />

      {/* "Ace" */}
      <text
        x="74" y="46"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontWeight="700"
        fontSize="32"
        fill="currentColor"
      >Ace</text>

      {/* "B" immediately after "Ace" (~56px wide at 32px font) */}
      <text
        x="130" y="46"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontWeight="700"
        fontSize="32"
        fill="currentColor"
      >B</text>

      {/* "i" — custom so dot can be blue; stem only */}
      <rect x="153" y="22" width="6" height="24" rx="1" fill="currentColor" />
      {/* blue dot above i */}
      <circle cx="156" cy="13" r="5" fill="#2eaaee" />

      {/* "t" */}
      <text
        x="162" y="46"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontWeight="700"
        fontSize="32"
        fill="currentColor"
      >t</text>
    </svg>
  )
}
