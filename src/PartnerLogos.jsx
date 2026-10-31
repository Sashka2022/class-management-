import React, { useId } from "react";
import partnerLogos from "./assets/partner-logos.png?inline";

export function PartnerLogos() {
  const hotamClip = useId();
  return (
    <div className="partner-logos">
      <div className="partner-logo">
        <svg
          className="partner-logo-art"
          viewBox="88 186 986 368"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="חותם — אחריות לחינוך בישראל"
          focusable="false"
        >
          <defs>
            <clipPath id={hotamClip}>
              <rect x="88" y="186" width="986" height="368" />
            </clipPath>
          </defs>
          {/* Include the whole mark and star in the shared visual height. */}
          <image
            href={partnerLogos}
            width="2170"
            height="725"
            clipPath={`url(#${hotamClip})`}
          />
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
