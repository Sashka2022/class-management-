import React from "react";
import mascot from "./assets/curious-mascot.webp";
import welcome from "./assets/mascot-welcome.webp";
import curious from "./assets/mascot-curious.webp";
import celebration from "./assets/mascot-celebration.webp";

const poses = {
  hero: welcome,
  empty: curious,
  curious,
  celebration,
};

export function Mascot({ variant = "small" }) {
  return (
    <img
      className={`mascot mascot-${variant}`}
      src={poses[variant] || mascot}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
    />
  );
}
