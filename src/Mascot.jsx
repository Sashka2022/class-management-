import React from "react";
import mascot from "./assets/curious-mascot.webp?inline";

export function Mascot({ variant = "small" }) {
  return (
    <img
      className={`mascot mascot-${variant}`}
      src={mascot}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
    />
  );
}
