
import React from "react";

type SecureGraphLogoProps = {
  className?: string;
};

const SecureGraphLogo: React.FC<SecureGraphLogoProps> = ({ className }) => {
  return (
    <img 
      src="/4967fc4e-6e89-4f62-a41d-adc5da78260e.png" 
      alt="SuperVision Logo" 
      className={className || "h-8 w-auto"}
    />
  );
};

export default SecureGraphLogo;
