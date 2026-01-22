import React from 'react';
import { useSound } from '../App';
import { Volume2Icon, VolumeXIcon } from './Icon';

const Header: React.FC = () => {
  const sound = useSound();
  
  return (
    <header className="bg-black/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
             <img src="https://cutinside.com/llm-perception-tool/logo.png" alt="CUT INSIDE Logo" className="h-8 w-auto" />
             <p className="hidden md:block text-sm text-grey/70 font-heading tracking-wider pl-4 border-l border-white/10">Content Brief Generator</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`transition-colors text-xs font-semibold ${sound?.isSoundEnabled ? 'text-teal' : 'text-grey/50'}`}>
                {sound?.isSoundEnabled ? <Volume2Icon className="h-5 w-5"/> : <VolumeXIcon className="h-5 w-5" />}
            </span>
            <label htmlFor="sound-toggle" className="relative inline-block sound-toggle-switch">
              <input type="checkbox" id="sound-toggle" className="opacity-0 w-0 h-0" checked={sound?.isSoundEnabled} onChange={sound?.toggleSound} />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
