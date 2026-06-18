import React from 'react';

export default function SpaceBackground() {
  return (
    <div className="space-bg">
      <div className="stars-layer stars-small"></div>
      <div className="stars-layer stars-medium"></div>
      <div className="stars-layer stars-large"></div>
      <div className="nebula"></div>
      <div className="shooting-stars">
        <span className="shooting-star"></span>
        <span className="shooting-star"></span>
        <span className="shooting-star"></span>
      </div>
    </div>
  );
}
