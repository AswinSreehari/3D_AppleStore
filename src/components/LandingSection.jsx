import React from "react";
import Video from "../assets/landingVideo.mp4";

const LandingSection = () => {
  return (
    <div className="landing-video-section">
      <div className="heading-wrapper">
      <h1 className="landing-heading">iPhone</h1>
      <h2 className="heading-right">Designed to be loved.</h2>
      </div>
       <div className="video-container">
      <video autoPlay muted loop playsInline src={Video}></video>
      </div>
    </div>
  );
};

export default LandingSection;
