/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// FIX: Import React to handle event types like React.ChangeEvent.
import React, {useCallback, useEffect, useRef, useState} from 'react';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PREDEFINED_EFFECTS = ['Cinematic', 'Time-lapse', 'Black & White', 'Slow motion'];

/**
 * A component providing an input bar for users to enter prompts, upload images,
 * and trigger the generation of either an image or a video.
 * It allows users to describe their desired output and provides options
 * to select the type of media to generate.
 */
export function PromptBar({
  onSubmit,
}: {
  onSubmit: (
    prompt: string,
    imageSrc: string,
    action: 'image' | 'video',
  ) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const [selectedAction, setSelectedAction] = useState<'video' | 'image'>(
    'video',
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New state for advanced features
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const [videoLength, setVideoLength] = useState<number | null>(null);
  const [effects, setEffects] = useState<string[]>([]);
  const [customEffect, setCustomEffect] = useState('');

  useEffect(() => {
    const savedHistory = localStorage.getItem('promptHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addToHistory = (p: string) => {
    if (p && !history.includes(p)) {
      const newHistory = [p, ...history].slice(0, 20); // Keep last 20
      setHistory(newHistory);
      localStorage.setItem('promptHistory', JSON.stringify(newHistory));
    }
  };

  const handleRun = useCallback(async () => {
    if ((!prompt && !imageFile) || isGenerating) return;
    setIsGenerating(true);
    setIsDropdownOpen(false);

    let img = null;
    if (imageFile) {
      img = await fileToBase64(imageFile);
    }

    let finalPrompt = prompt;
    if (selectedAction === 'video') {
      const allEffects = [...effects, customEffect].filter(Boolean);
      if (allEffects.length > 0) {
        finalPrompt = `${finalPrompt}, ${allEffects.join(', ')}`;
      }
      if (videoLength) {
        finalPrompt = `${finalPrompt}, ${videoLength} seconds long`;
      }
    }

    if (prompt) {
      addToHistory(prompt);
    }
    
    await onSubmit(finalPrompt, img, selectedAction);

    setIsGenerating(false);
    setPrompt('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImageFile(null);
    setEffects([]);
    setCustomEffect('');
    setVideoLength(null);
    promptInputRef.current?.focus();
  }, [prompt, imageFile, isGenerating, selectedAction, onSubmit, videoLength, effects, customEffect, history]);

  const handleDropdownSelect = (action: 'video' | 'image') => {
    setSelectedAction(action);
    setIsDropdownOpen(false);
    promptInputRef.current?.focus();
  };

  const toggleEffect = (effect: string) => {
    setEffects((prev) =>
      prev.includes(effect)
        ? prev.filter((e) => e !== effect)
        : [...prev, effect],
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
       if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef, historyRef]);

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      promptInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // On mobile, the virtual keyboard can obscure the input.
    // This scrolls the focused element into the center of the viewport.
    // A timeout is used to allow time for the keyboard to animate in.
    if (window.innerWidth < 768) {
      setTimeout(() => {
        e.target.scrollIntoView({behavior: 'instant', block: 'center'});
      }, 300);
    }
  };

  return (
    <div className="prompt-bar-wrapper">
      {selectedAction === 'video' && (
        <div className="video-options-bar">
            <div className="video-option-group">
                <span className="video-option-label">Length:</span>
                {[3, 5, 10].map(len => (
                    <button key={len} className={`video-option-button ${videoLength === len ? 'active' : ''}`} onClick={() => setVideoLength(len === videoLength ? null : len)}>
                        {len}s
                    </button>
                ))}
            </div>
            <div className="video-option-group effects-group">
                <span className="video-option-label">Effects:</span>
                {PREDEFINED_EFFECTS.map(effect => (
                    <button key={effect} className={`video-option-button ${effects.includes(effect) ? 'active' : ''}`} onClick={() => toggleEffect(effect)}>
                        {effect}
                    </button>
                ))}
                <input
                    type="text"
                    className="custom-effect-input"
                    placeholder="Custom effect..."
                    value={customEffect}
                    onChange={e => setCustomEffect(e.target.value)}
                />
            </div>
        </div>
      )}
      <div className="prompt-bar" onKeyDown={(e) => e.stopPropagation()}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{display: 'none'}}
          accept="image/*"
        />

        {imageFile && (
          <div className="prompt-image-preview">
            <img src={URL.createObjectURL(imageFile)} alt="upload preview" />
            <button
              className="prompt-image-preview-close"
              onClick={() => {
                setImageFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}>
              ×
            </button>
          </div>
        )}

        <input
          ref={promptInputRef}
          type="text"
          className="prompt-input"
          placeholder={
            selectedAction === 'video'
              ? 'Describe your video'
              : 'Describe your image'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
        />
        <button
          className="prompt-bar-button"
          aria-label="Upload Image"
          title="Upload Image"
          onClick={handleImageUploadClick}
          disabled={isGenerating}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
        <div className="prompt-history-container" ref={historyRef}>
          <button
            className="prompt-bar-button"
            aria-label="Prompt History"
            title="Prompt History"
            onClick={() => setShowHistory(!showHistory)}
            disabled={isGenerating}>
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
           {showHistory && (
            <div className="prompt-dropdown-menu prompt-history-dropdown">
              {history.length > 0 ? history.map((p, i) => (
                  <button key={i} onClick={() => { setPrompt(p); setShowHistory(false); promptInputRef.current?.focus(); }}>{p}</button>
              )) : <div className="prompt-history-empty">No history</div>}
            </div>
          )}
        </div>
        <div className="prompt-generate-button-group" ref={dropdownRef}>
          <button
            className="prompt-bar-button run-button main-action"
            onClick={handleRun}
            disabled={isGenerating || (!prompt && !imageFile)}>
            {isGenerating
              ? 'Generating...'
              : `Generate ${selectedAction === 'video' ? 'Video' : 'Image'}`}
          </button>
          <button
            className="prompt-bar-button run-button dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isGenerating}
            aria-label="Choose generation type"
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="prompt-dropdown-menu">
              <button onClick={() => handleDropdownSelect('video')}>
                Generate Video
              </button>
              <button onClick={() => handleDropdownSelect('image')}>
                Generate Image
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="prompt-bar-notice">
        Image-to-video does not currently support generating people.
      </p>
    </div>
  );
}