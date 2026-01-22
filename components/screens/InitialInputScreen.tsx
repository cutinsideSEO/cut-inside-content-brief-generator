import React, { useState, useEffect, useCallback } from 'react';
import Button from '../Button';
import { AlertTriangleIcon, UploadCloudIcon, XIcon, FileCodeIcon, BrainCircuitIcon, ChevronDownIcon, LinkIcon, SettingsIcon } from '../Icon';
import ModelSelector from '../ModelSelector';
import LengthSettings from '../LengthSettings';
import type { ModelSettings, LengthConstraints, ExtractedTemplate } from '../../types';

interface InitialInputScreenProps {
  onStartAnalysis: (
    keywords: { kw: string; volume: number }[],
    login: string,
    password: string,
    country: string,
    serpLanguage: string,
    outputLanguage: string,
    modelSettings?: ModelSettings,
    lengthConstraints?: LengthConstraints,
    templateUrl?: string,
  ) => void;
  isLoading: boolean;
  error: string | null;
  onStartUpload: () => void;
}

const countries = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", "Finland", "France", "Germany", "Hong Kong", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Malaysia", "Mexico", "Netherlands", "New Zealand", "Norway", "Philippines", "Poland", "Portugal", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"
];

const languages = [
  "English", "Hebrew", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Japanese", "Chinese"
];

const findDefaultColumn = (headers: string[], keywords: string[]): string => {
  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    for (const keyword of keywords) {
      if (lowerHeader.includes(keyword)) {
        return header;
      }
    }
  }
  return headers.length > 0 ? headers[0] : '';
};

const InitialInputScreen: React.FC<InitialInputScreenProps> = ({ onStartAnalysis, isLoading, error, onStartUpload }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [keywordColumn, setKeywordColumn] = useState('');
  const [volumeColumn, setVolumeColumn] = useState('');
  const [country, setCountry] = useState('United States');
  const [serpLanguage, setSerpLanguage] = useState('English');
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [localError, setLocalError] = useState('');
  const [flow, setFlow] = useState<'create' | null>(null);
  const [inputMethod, setInputMethod] = useState<'csv' | 'manual'>('csv');
  const [manualKeywords, setManualKeywords] = useState('');

  // Feature 6: Model settings
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: 'gemini-3-pro-preview',
    thinkingLevel: 'high',
  });

  // Feature 3: Length constraints
  const [lengthConstraints, setLengthConstraints] = useState<LengthConstraints>({
    globalTarget: null,
    sectionTargets: {},
    strictMode: false,
  });

  // Feature 1: Template URL
  const [templateUrl, setTemplateUrl] = useState('');

  // Collapsible sections state
  const [showAdvanced, setShowAdvanced] = useState(false);

  const resetFileState = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setKeywordColumn('');
    setVolumeColumn('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0];
        const headers = firstLine.split(',').map(h => h.trim());
        setCsvHeaders(headers);
        setCsvFile(file);
      };
      reader.readAsText(file);
    } else {
      resetFileState();
    }
  };
  
  useEffect(() => {
    if (csvHeaders.length > 0) {
      const defaultKwCol = findDefaultColumn(csvHeaders, ['kw', 'keyword', 'keywords', 'query']);
      const defaultVolCol = findDefaultColumn(csvHeaders, ['vol', 'volume', 'searches', 'search volume']);
      setKeywordColumn(defaultKwCol);
      setVolumeColumn(defaultVolCol);
    }
  }, [csvHeaders]);

  const handleSubmit = async () => {
    setLocalError('');
    if (!login || !password) {
        setLocalError("Please enter your DataForSEO credentials.");
        return;
    }

    let keywords: { kw: string, volume: number }[] = [];

    if (inputMethod === 'csv') {
        if (!csvFile) {
            setLocalError("Please upload a keyword CSV file.");
            return;
        }
        if (!keywordColumn || !volumeColumn) {
            setLocalError("Please select the keyword and volume columns.");
            return;
        }
        
        try {
            keywords = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const text = event.target?.result as string;
                        const lines = text.split('\n').filter(line => line.trim() !== '');
                        if (lines.length < 2) {
                            reject(new Error("CSV must have a header row and at least one data row."));
                            return;
                        }
                        const headers = lines[0].split(',').map(h => h.trim());
                        const keywordIndex = headers.indexOf(keywordColumn);
                        const volumeIndex = headers.indexOf(volumeColumn);
                        if (keywordIndex === -1 || volumeIndex === -1) {
                            reject(new Error(`Could not find selected columns '${keywordColumn}' or '${volumeColumn}' in the CSV header.`));
                            return;
                        }
                        const parsed = lines.slice(1).map(line => {
                            const columns = line.split(',');
                            const kw = columns[keywordIndex]?.trim();
                            const volume = parseInt(columns[volumeIndex]?.trim(), 10);
                            return { kw, volume };
                        }).filter(item => item.kw && !isNaN(item.volume));
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error("Failed to process CSV content. Ensure it's a valid CSV file."));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsText(csvFile);
            });
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Failed to parse CSV file.");
            return;
        }

    } else { // manual input
        if (!manualKeywords.trim()) {
            setLocalError("Please enter keywords and their volumes.");
            return;
        }
        try {
            keywords = manualKeywords.trim().split('\n').map((line, i) => {
                const parts = line.split(',');
                if (parts.length !== 2) {
                    throw new Error(`Invalid format on line ${i + 1}. Please use 'keyword, volume'.`);
                }
                const kw = parts[0].trim();
                const volume = parseInt(parts[1].trim(), 10);
                if (!kw) {
                    throw new Error(`Missing keyword on line ${i + 1}.`);
                }
                if (isNaN(volume)) {
                    throw new Error(`Invalid volume on line ${i + 1}. Volume must be a number.`);
                }
                return { kw, volume };
            });
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Failed to parse manual input.");
            return;
        }
    }

    if (keywords.length === 0) {
        setLocalError("No valid keywords found. Please check your input.");
        return;
    }

    onStartAnalysis(
      keywords,
      login,
      password,
      country,
      serpLanguage,
      outputLanguage,
      modelSettings,
      lengthConstraints,
      templateUrl || undefined
    );
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const renderCreateFlow = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
        <div className="bg-black/30 p-6 md:p-8 rounded-lg border border-white/10 space-y-6">
            <div>
              <h2 className="text-lg font-heading font-semibold text-grey mb-1">1. Provide Keywords</h2>
              <p className="text-sm text-grey/60">Choose your preferred method to input keywords and their search volumes.</p>
              <div className="flex bg-black/50 rounded-lg p-1 mt-3">
                  <button
                      onClick={() => setInputMethod('csv')}
                      className={`w-1/2 rounded-md py-2 text-sm font-heading font-semibold transition-colors ${inputMethod === 'csv' ? 'bg-teal text-white' : 'text-grey/60 hover:bg-white/5'}`}
                  >
                      Upload CSV
                  </button>
                  <button
                      onClick={() => setInputMethod('manual')}
                      className={`w-1/2 rounded-md py-2 text-sm font-heading font-semibold transition-colors ${inputMethod === 'manual' ? 'bg-teal text-white' : 'text-grey/60 hover:bg-white/5'}`}
                  >
                      Manual Input
                  </button>
              </div>
            </div>

            {inputMethod === 'csv' && (
              <>
                {!csvFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-lg cursor-pointer bg-black/50 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloudIcon className="w-10 h-10 mb-2 text-grey/40" />
                      <p className="text-sm text-grey/60">
                        <span className="font-semibold text-teal">Click to upload</span> or drag and drop
                      </p>
                    </div>
                    <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FileCodeIcon className="h-8 w-8 text-teal"/>
                            <div>
                                <p className="font-semibold text-grey">{csvFile.name}</p>
                                <p className="text-xs text-grey/60">{formatBytes(csvFile.size)}</p>
                            </div>
                        </div>
                        <button onClick={resetFileState} className="p-1 text-grey/50 hover:text-white rounded-full hover:bg-white/10">
                            <XIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                        <div>
                            <label className="block text-sm font-medium text-grey/80 mb-1">Keyword Column</label>
                            <select 
                              value={keywordColumn} 
                              onChange={(e) => setKeywordColumn(e.target.value)} 
                              className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal appearance-none bg-no-repeat"
                              style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                            >
                                <option value="" disabled>Select column...</option>
                                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-grey/80 mb-1">Volume Column</label>
                            <select 
                              value={volumeColumn} 
                              onChange={(e) => setVolumeColumn(e.target.value)} 
                              className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal appearance-none bg-no-repeat"
                              style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                            >
                                <option value="" disabled>Select column...</option>
                                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {inputMethod === 'manual' && (
              <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                  <textarea
                      value={manualKeywords}
                      onChange={(e) => setManualKeywords(e.target.value)}
                      placeholder="Enter one keyword and volume per line, separated by a comma.&#10;e.g., machine learning, 100000&#10;what is ml, 50000"
                      className="w-full p-3 bg-black border border-white/20 rounded-md text-grey h-40 resize-y focus:ring-2 focus:ring-teal font-mono text-sm"
                  />
              </div>
            )}


            <div>
              <h2 className="text-lg font-heading font-semibold text-grey mb-1">2. Enter Credentials</h2>
              <p className="text-sm text-grey/60">Your DataForSEO API credentials.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="DataForSEO Login" value={login} onChange={(e) => setLogin(e.target.value)} className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal" />
              <input type="password" placeholder="DataForSEO Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal" />
            </div>
             
             <div>
                <h2 className="text-lg font-heading font-semibold text-grey mb-1">3. Configure Analysis Settings</h2>
                <p className="text-sm text-grey/60">Define the target market and the language for the final brief.</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-grey/80 mb-1">SERP Country</label>
                    <select 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)} 
                      className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal appearance-none bg-no-repeat"
                      style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                    >
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-grey/80 mb-1">SERP Language</label>
                    <select 
                      value={serpLanguage} 
                      onChange={(e) => setSerpLanguage(e.target.value)} 
                      className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal appearance-none bg-no-repeat"
                      style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                    >
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-grey/80 mb-1">Brief Output Language</label>
                    <select 
                      value={outputLanguage} 
                      onChange={(e) => setOutputLanguage(e.target.value)} 
                      className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal appearance-none bg-no-repeat"
                      style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                    >
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Feature 1: Template URL */}
            <div className="bg-black/30 rounded-lg border border-white/10 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <LinkIcon className="h-5 w-5 text-teal" />
                <div>
                  <h3 className="font-heading font-semibold text-grey">Use Content as Template (Optional)</h3>
                  <p className="text-xs text-grey/60">Extract heading structure from existing content to pre-populate your brief outline</p>
                </div>
              </div>
              <input
                type="url"
                placeholder="https://example.com/article-to-use-as-template"
                value={templateUrl}
                onChange={(e) => setTemplateUrl(e.target.value)}
                className="w-full p-3 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
              />
            </div>

            {/* Feature 3: Length Constraints */}
            <LengthSettings
              constraints={lengthConstraints}
              onChange={setLengthConstraints}
            />

            {/* Feature 6: Advanced Settings (Model Selector) */}
            <div className="bg-black/30 rounded-lg border border-white/10">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <SettingsIcon className="h-5 w-5 text-teal" />
                  <div>
                    <h3 className="font-heading font-semibold text-grey">Advanced Settings</h3>
                    <p className="text-sm text-grey/60">AI model selection & configuration</p>
                  </div>
                </div>
                <ChevronDownIcon
                  className={`h-5 w-5 text-grey/50 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </button>
              {showAdvanced && (
                <div className="p-4 pt-0">
                  <ModelSelector
                    settings={modelSettings}
                    onChange={setModelSettings}
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'Starting...' : 'Start Analysis'}
                </Button>
            </div>

            {(error || localError) && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md flex items-start space-x-2">
                    <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                    <p className="text-sm">{error || localError}</p>
                </div>
            )}
        </div>

        <div className="bg-black/20 p-8 rounded-lg border border-white/5 flex flex-col justify-center">
            <h2 className="text-2xl font-heading font-bold text-grey">The Strategist's Studio</h2>
            <p className="text-grey/70 mt-4">This tool transforms raw keyword data into a comprehensive, actionable content brief designed to dominate search rankings.</p>
            <div className="mt-6 space-y-4">
                <div className="flex items-start">
                    <span className="bg-teal text-black font-bold font-heading rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-1">1</span>
                    <div>
                        <h3 className="font-heading font-semibold text-grey">Analyze & Strategize</h3>
                        <p className="text-sm text-grey/60">We analyze the top 10 SERP results for your keywords, identifying what top-ranking content does right and where the strategic gaps are.</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <span className="bg-teal text-black font-bold font-heading rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-1">2</span>
                    <div>
                        <h3 className="font-heading font-semibold text-grey">Build Your Brief</h3>
                        <p className="text-sm text-grey/60">Collaborate with the AI to build a hierarchical article structure, define on-page SEO, and generate FAQs based on the data.</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <span className="bg-teal text-black font-bold font-heading rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-1">3</span>
                    <div>
                        <h3 className="font-heading font-semibold text-grey">Generate Content</h3>
                        <p className="text-sm text-grey/60">Once the brief is finalized, the AI will write a full-length, SEO-optimized article based on your strategic blueprint.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-grey">Start Your Content Project</h1>
            <p className="text-lg text-grey/70 mt-2">Choose your starting point.</p>
        </div>

        {!flow && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <button 
              onClick={() => setFlow('create')}
              className="p-8 bg-black/30 rounded-lg border border-white/10 text-center hover:border-teal hover:bg-teal/10 transition-all duration-200"
            >
              <FileCodeIcon className="h-10 w-10 mx-auto text-teal mb-3" />
              <h2 className="text-lg font-heading font-semibold text-grey">Create New Brief</h2>
              <p className="text-sm text-grey/60 mt-1">Start with keywords to generate a data-driven brief from scratch.</p>
            </button>
            <button 
              onClick={onStartUpload}
              className="p-8 bg-black/30 rounded-lg border border-white/10 text-center hover:border-teal hover:bg-teal/10 transition-all duration-200"
            >
              <BrainCircuitIcon className="h-10 w-10 mx-auto text-teal mb-3" />
              <h2 className="text-lg font-heading font-semibold text-grey">Use Existing Brief</h2>
              <p className="text-sm text-grey/60 mt-1">Upload a pre-made brief in Markdown to generate the article content.</p>
            </button>
          </div>
        )}

        {flow === 'create' && renderCreateFlow()}
    </div>
  );
};

export default InitialInputScreen;