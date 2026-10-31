import React from "react";
import appLogo from "./assets/kalei-kalut-logo.webp";

export function BrandMark() {
  return <img className="app-logo" src={appLogo} alt="" />;
}

export function Brand() {
  return (
    <a
      className="brand"
      href={location.pathname}
      aria-label="קלי קלות — מרחב למחשבות ולמידה"
    >
      <BrandMark />
      <span className="brand-wordmark">
        קלי קלות<small>מרחב למחשבות ולמידה</small>
      </span>
    </a>
  );
}
