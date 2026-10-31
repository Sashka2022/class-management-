import React from "react";
import partnerLogos from "./assets/partner-logos.png?inline";

export function PartnerLogos() {
  return (
    <div className="partner-logos">
      <div className="partner-logo">
        <svg
          className="partner-logo-art"
          viewBox="80 178 1002 384"
          role="img"
          aria-label="חותם — אחריות לחינוך בישראל"
          focusable="false"
        >
          {/* Frame the visible Hotam artwork, excluding the strip's empty margins. */}
          <image href={partnerLogos} width="2170" height="725" />
        </svg>
      </div>
      <div className="partner-logo">
        <img
          src="https://mofet.macam.ac.il/wp-content/uploads/2024/02/macam-reshit-logo-img.png"
          alt="ראשית — קהילות מחנכות"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
