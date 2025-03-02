// Popup.tsx
import React from 'react';

const EmailPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div style={popupStyles}>
      <div>
        <h2>Popup Content</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

// Simple styling for the popup
const popupStyles = {
  position: 'fixed' as 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export default EmailPopup;