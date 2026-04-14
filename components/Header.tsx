import React from 'react';

interface HeaderProps {
  companyName: string;
}

const Header: React.FC<HeaderProps> = ({ companyName }) => {
  return (
    <div className="text-left">
      <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-pink-600">
        {companyName}
      </h1>
    </div>
  );
};

export default Header;