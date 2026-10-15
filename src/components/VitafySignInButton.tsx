type VitafySignInButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
};

export default function VitafySignInButton({
  loading = false,
  disabled = false,
  onClick,
  label = 'Sign in with Vitafy',
}: VitafySignInButtonProps) {
  return (
    <button
      type="button"
      className="gsi-material-button"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <div className="gsi-material-button-state" aria-hidden />
      <div className="gsi-material-button-content-wrapper">
        <div className="gsi-material-button-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" fill="#14808a" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#fff"
              fontSize="12"
              fontWeight="700"
              fontFamily="Roboto, sans-serif"
            >
              V
            </text>
          </svg>
        </div>
        <span className="gsi-material-button-contents">
          {loading ? 'Signing in…' : label}
        </span>
      </div>
    </button>
  );
}
