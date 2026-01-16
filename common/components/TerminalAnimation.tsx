'use client';

import { useState, useEffect, useRef } from 'react';

interface TerminalCommand {
  command: string;
  output: string[];
}

interface TerminalState {
  currentCommandIndex: number;
  currentCharIndex: number;
  completedCommands: Array<{command: string, output: string[]}>;
  currentTypedCommand: string;
}

interface TerminalAnimationProps {
  className?: string;
}

export default function TerminalAnimation({ className = '' }: TerminalAnimationProps) {
  const [state, setState] = useState<TerminalState>({
    currentCommandIndex: 0,
    currentCharIndex: 0,
    completedCommands: [],
    currentTypedCommand: ''
  });
  const [showCursor, setShowCursor] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const terminalContentRef = useRef<HTMLDivElement>(null);

  const commands: TerminalCommand[] = [
    {
      command: 'echo "Hello World!"',
      output: ['Hello World!']
    },
    {
      command: 'whoami',
      output: ['Applied Scientist at Amazon AGI', 'Specializing in Speech-to-Speech LLMs and incremental learning']
    },
    // {
    //   command: 'pwd',
    //   output: ['/home/anandmoghan/digital-space']
    // },
    {
      command: 'cat about.txt',
      output: [
        'I lead research on Speech-to-Speech Large Language Models at Amazon AGI.',
        'My work spans production ASR systems, federated learning frameworks,',
        'and multilingual speech recognition that powers AI at scale.',
        '',
        'With 6+ years at Amazon and Masters in AI from Indian Institute of Science,',
        'I\'ve published 6+ papers in top conferences like ICASSP and INTERSPEECH.'
      ]
    },
    {
      command: 'ls projects/',
      output: [
        'speech-to-speech-llms/',
        'incremental-learning/',
        'multilingual-asr/',
        'federated-learning-framework/',
      ]
    }
  ];

  useEffect(() => {
    const now = new Date();
    const timeString = now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZoneName: 'short'
    });
    setCurrentTime(timeString);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (state.currentCommandIndex >= commands.length) {
      return;
    }

    const currentCommand = commands[state.currentCommandIndex];

    if (state.currentCharIndex < currentCommand.command.length) {
      // Still typing the command
      const timeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentTypedCommand: prev.currentTypedCommand + currentCommand.command[prev.currentCharIndex],
          currentCharIndex: prev.currentCharIndex + 1
        }));
      }, 50);

      return () => clearTimeout(timeout);
    } else {
      // Finished typing command, show output and move to next
      const timeout = setTimeout(() => {
        setState(prev => ({
          currentCommandIndex: prev.currentCommandIndex + 1,
          currentCharIndex: 0,
          completedCommands: [...prev.completedCommands, {
            command: currentCommand.command,
            output: currentCommand.output
          }],
          currentTypedCommand: ''
        }));
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [state.currentCommandIndex, state.currentCharIndex]);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (terminalContentRef.current) {
      terminalContentRef.current.scrollTop = terminalContentRef.current.scrollHeight;
    }
  }, [state.completedCommands, state.currentTypedCommand]);

  return (
    <div className={`font-mono ${className}`}>
      <div 
        className="rounded-lg overflow-hidden shadow-lg"
        style={{ 
          backgroundColor: '#1a1a1a',
          border: '1px solid #4a5568'
        }}
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <span className="text-xs text-gray-600 ml-2">anandmoghan — zsh</span>
          </div>
        </div>
        
        {/* Terminal Content */}
        <div 
          ref={terminalContentRef}
          className="p-4 h-96 overflow-y-auto" 
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <div className="text-sm mb-2" style={{ color: '#888' }}>
            Last login: {currentTime} on ttys000
          </div>
          
          {/* Display completed commands */}
          {state.completedCommands.map((cmd, index) => (
            <div key={index} className="mb-1">
              <div className="text-sm" style={{ color: '#00ff00' }}>
                <span className="text-blue-400">anandmoghan@universe</span>
                <span className="text-white">:</span>
                <span className="text-green-400">~</span>
                <span className="text-white">$ </span>
                <span className="text-white">{cmd.command}</span>
              </div>
              
              <div className="ml-0 mt-0 mb-1">
                {cmd.output.map((line, lineIndex) => (
                  <div key={lineIndex} className="text-sm" style={{ color: '#e2e8f0' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Current typing command */}
          {state.currentCommandIndex < commands.length && (
            <div className="text-sm" style={{ color: '#00ff00' }}>
              <span className="text-blue-400">anandmoghan@universe</span>
              <span className="text-white">:</span>
              <span className="text-green-400">~</span>
              <span className="text-white">$ </span>
              <span className="text-white">{state.currentTypedCommand}</span>
              {showCursor && <span className="text-white">_</span>}
            </div>
          )}
          
          {/* Final prompt when all commands are done */}
          {state.currentCommandIndex >= commands.length && (
            <div className="text-sm" style={{ color: '#00ff00' }}>
              <span className="text-blue-400">anandmoghan@universe</span>
              <span className="text-white">:</span>
              <span className="text-green-400">~</span>
              <span className="text-white">$ </span>
              {showCursor && <span className="text-white">_</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}