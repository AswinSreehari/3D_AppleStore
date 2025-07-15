// Create a new file: components/Hotspot.js
import React, { useState } from 'react';
import './Hotspots.css';

const Hotspot = ({ position, title, description, id }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleHotspot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="hotspot-container"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      }}
    >
      {/* Hotspot Button */}
      <button 
        className={`hotspot-button ${isOpen ? 'active' : ''}`}
        onClick={toggleHotspot}
      >
        <span className="hotspot-pulse"></span>
        <span className="hotspot-dot"></span>
      </button>

      {/* Hotspot Tooltip */}
      {isOpen && (
        <div className="hotspot-tooltip">
          <div className="hotspot-content">
            <h4 className="hotspot-title">{title}</h4>
            <p className="hotspot-description">{description}</p>
            <button 
              className="hotspot-close"
              onClick={toggleHotspot}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotspot;