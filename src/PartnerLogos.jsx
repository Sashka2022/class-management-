import React from "react";
import partnerLogos from "./assets/partner-logos-transparent.webp";

export function PartnerLogos() {
  return (
    <div className="partner-logos">
      <img
        className="partner-logo-strip"
        src={partnerLogos}
        alt="חותם — אחריות לחינוך בישראל; ראשית — קהילות מחנכות"
      />
    </div>
  );
}
