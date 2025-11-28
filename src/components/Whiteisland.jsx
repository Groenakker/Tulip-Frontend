import React from 'react';
import './Whiteisland.css';

const WhiteIsland = ({ children, className = '', style = {} }) => {
  return (
    <div className={`whiteIsland ${className}`} style={style}>
      {children}
    </div>
  );
};

export default WhiteIsland;