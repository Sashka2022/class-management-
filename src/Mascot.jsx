import React, { useId } from "react";
import characters from "./assets/kalei-kalut-characters.webp";

// Individual artwork bounds in the supplied character sheet, including loose curls.
const artwork = {
  welcome: [55, 76, 286, 367],
  balloon: [454, 14, 326, 441],
  birds: [808, 100, 356, 340],
  focus: [1233, 18, 315, 436],
  rest: [1585, 179, 379, 245],
  hats: [50, 468, 299, 311],
  planning: [434, 469, 364, 309],
  sunglasses: [798, 468, 316, 314],
  calm: [1189, 483, 341, 293],
  running: [1586, 494, 350, 282],
};
const poses = {
  hero: "welcome",
  small: "sunglasses",
  curious: "birds",
  empty: "balloon",
  celebration: "balloon",
};

export const groupCharacters = [
  "hats",
  "birds",
  "planning",
  "sunglasses",
  "balloon",
  "calm",
  "focus",
  "running",
];

export function MascotParade({
  className = "",
  variants = ["welcome", "birds", "hats", "planning", "balloon", "running"],
}) {
  return (
    <div className={`mascot-parade ${className}`} aria-hidden="true">
      {variants.map((variant, index) => (
        <Mascot key={`${variant}-${index}`} variant={variant} />
      ))}
    </div>
  );
}

export function Mascot({ variant = "small" }) {
  const clipId = useId();
  const [x, y, width, height] =
    artwork[poses[variant] || variant] || artwork.calm;
  return (
    <svg
      className={`mascot mascot-${variant}`}
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image
        href={characters}
        width="1983"
        height="793"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
