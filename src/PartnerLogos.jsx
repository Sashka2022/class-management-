import React, { useId } from "react";
import partnerLogos from "./assets/partner-logos.png?inline";

export function PartnerLogos() {
  const hotamClip = useId();
  return (
    <div className="partner-logos">
      <div className="partner-logo">
        <svg
          className="partner-logo-art"
          viewBox="80 178 1002 346"
          preserveAspectRatio="xMidYMax meet"
          role="img"
          aria-label="חותם — אחריות לחינוך בישראל"
          focusable="false"
        >
          <defs>
            <clipPath id={hotamClip}>
              <rect x="80" y="178" width="1002" height="384" />
            </clipPath>
          </defs>
          {/* Align the subtitle baseline at y=524; the star extends below it. */}
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
