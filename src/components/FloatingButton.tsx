type FloatingButtonProps = {
  onClick?: () => void;
};

export default function FloatingButton({ onClick} : FloatingButtonProps) {
  return (
    <button className="floating-btn" onClick={onClick}>
      +
    </button>
  );
}
