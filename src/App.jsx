import Nav from "./components/nav";
import Jumbotron from "./components/Jumbotron";
import SoundSection from "./components/SoundSection";
import DisplaySection from "./components/DisplaySection";
import WebgiViewer from "./components/WebgiViewer";
import { useRef } from "react";
import Loader from "./components/Loader";
import LandingSection from "./components/LandingSection";
// import EarthGlobe from "./components/EarthGlobe";
 
function App() {
  const webgiViewerRef = useRef();
  const contentRef = useRef();

  const handlePreview = () => {
    webgiViewerRef.current.triggerPreview();
  }

  return (
    <div className="App">
      <Loader />
       <Nav />
       <LandingSection />
      <div ref={contentRef} id="content">
       <Jumbotron />
       <SoundSection />
       <DisplaySection triggerPreview={handlePreview} />
      </div>
      {/* <EarthGlobe /> */}
       <WebgiViewer contentRef={contentRef} ref={webgiViewerRef} />
    </div>
  );
}

export default App;
