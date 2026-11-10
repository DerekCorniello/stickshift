type Props = Readonly<{ buttonIndex: number }>;

const facePoints = [
  [12, 18],
  [18, 12],
  [6, 12],
  [12, 6],
] as const;

export function ControllerControlIcon({ buttonIndex }: Props) {
  if (buttonIndex > 15 || buttonIndex < 0) return null;

  let graphic;
  if (buttonIndex < 4) {
    graphic = facePoints.map(([cx, cy], index) => (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r="2.35"
        fill={index === buttonIndex ? "currentColor" : "none"}
      />
    ));
  } else if (buttonIndex < 8) {
    const right = buttonIndex % 2 === 1;
    graphic = (
      <>
        <path d="M4 15V9c0-2 2-3 4-3h8c2 0 4 1 4 3v6" />
        <path
          d={right ? "M13 6h3c2 0 4 1 4 3v6" : "M4 15V9c0-2 2-3 4-3h3"}
          strokeWidth="3"
        />
        {buttonIndex >= 6 && <path d="M8 19h8" />}
      </>
    );
  } else if (buttonIndex < 10) {
    graphic = (
      <>
        <circle
          cx="8"
          cy="12"
          r="2"
          fill={buttonIndex === 8 ? "currentColor" : "none"}
        />
        <circle
          cx="16"
          cy="12"
          r="2"
          fill={buttonIndex === 9 ? "currentColor" : "none"}
        />
      </>
    );
  } else if (buttonIndex < 12) {
    graphic = (
      <>
        <circle cx={buttonIndex === 10 ? 9 : 15} cy="12" r="5" />
        <circle
          cx={buttonIndex === 10 ? 9 : 15}
          cy="12"
          r="2"
          fill="currentColor"
        />
      </>
    );
  } else {
    const selected = [
      [12, 7],
      [12, 17],
      [7, 12],
      [17, 12],
    ][buttonIndex - 12];
    graphic = (
      <>
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
        <circle
          cx={selected[0]}
          cy={selected[1]}
          r="2"
          fill="currentColor"
          stroke="none"
        />
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {graphic}
    </svg>
  );
}
