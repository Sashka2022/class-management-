import React from "react";
import partnerLogos from "./assets/partner-logos.png?inline";

export function PartnerLogos() {
  return (
    <div className="partner-logos">
      <div className="partner-logo partner-logo-hotam">
        <img src={partnerLogos} alt="חותם — אחריות לחינוך בישראל" />
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
