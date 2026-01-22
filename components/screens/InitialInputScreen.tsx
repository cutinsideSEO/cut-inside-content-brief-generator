import React, { useState, useEffect, useCallback } from 'react';
import Button from '../Button';
import { AlertTriangleIcon, UploadCloudIcon, XIcon, FileCodeIcon, BrainCircuitIcon, ChevronDownIcon, LinkIcon, SettingsIcon } from '../Icon';
import ModelSelector from '../ModelSelector';
import LengthSettings from '../LengthSettings';
import KeywordTableInput from '../KeywordTableInput';
import { Card, Input, Textarea, Alert, Badge, Tabs } from '../ui';
import type { ModelSettings, LengthConstraints, ExtractedTemplate } from '../../types';

interface KeywordRow {
  id: string;
  keyword: string;
  volume: string;
}

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

// Check if DataForSEO credentials are configured via environment variables
const dfsEnvLogin = import.meta.env.VITE_DATAFORSEO_LOGIN || '';
const dfsEnvPassword = import.meta.env.VITE_DATAFORSEO_PASSWORD || '';
const hasDfsEnvCredentials = Boolean(dfsEnvLogin && dfsEnvPassword);

const InitialInputScreen: React.FC<InitialInputScreenProps> = ({ onStartAnalysis, isLoading, error, onStartUpload }) => {
  const [login, setLogin] = useState(dfsEnvLogin);
  const [password, setPassword] = useState(dfsEnvPassword);
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
  const [manualKeywordRows, setManualKeywordRows] = useState<KeywordRow[]>([
    { id: '1', keyword: '', volume: '' }
  ]);

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
        // Filter out empty rows and validate
        const validRows = manualKeywordRows.filter(row => row.keyword.trim() && row.volume.trim());

        if (validRows.length === 0) {
            setLocalError("Please enter at least one keyword with its volume.");
            return;
        }

        // Check for invalid volumes
        const invalidRow = validRows.find(row => isNaN(parseInt(row.volume, 10)));
        if (invalidRow) {
            setLocalError(`Invalid volume for keyword "${invalidRow.keyword}". Volume must be a number.`);
            return;
        }

        keywords = validRows.map(row => ({
            kw: row.keyword.trim(),
            volume: parseInt(row.volume, 10)
        }));
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
        {/* Left Panel: Form */}
        <div className="space-y-6">
          {/* Step 1: Keywords */}
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="teal" size="md">1</Badge>
              <div>
                <h2 className="text-lg font-heading font-semibold text-text-primary">Provide Keywords</h2>
                <p className="text-sm text-text-muted">Choose your preferred method to input keywords</p>
              </div>
            </div>

            {/* Input method toggle */}
            <Tabs
              variant="pills"
              tabs={[
                { id: 'csv', label: 'Upload CSV' },
                { id: 'manual', label: 'Manual Input' }
              ]}
              activeTab={inputMethod}
              onChange={(id) => setInputMethod(id as 'csv' | 'manual')}
              className="mb-4"
            />

            {inputMethod === 'csv' && (
              <>
                {!csvFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-radius-lg cursor-pointer bg-surface-hover hover:bg-surface-active transition-colors">
                    <div className="flex flex-col items-center justify-center py-6">
                      <UploadCloudIcon className="w-10 h-10 mb-2 text-text-muted" />
                      <p className="text-sm text-text-secondary">
                        <span className="font-semibold text-teal">Click to upload</span> or drag and drop
                      </p>
                    </div>
                    <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                  </label>
                ) : (
                  <Card variant="outline" padding="md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                          <FileCodeIcon className="h-5 w-5 text-teal"/>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{csvFile.name}</p>
                          <p className="text-xs text-text-muted">{formatBytes(csvFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetFileState}>
                        <XIcon className="h-4 w-4"/>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle">
                      <div>
                        <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">Keyword Column</label>
                        <select
                          value={keywordColumn}
                          onChange={(e) => setKeywordColumn(e.target.value)}
                          className="w-full p-3 bg-surface-elevated border border-border rounded-radius-md text-text-primary focus:ring-2 focus:ring-teal focus:border-teal transition-all"
                        >
                          <option value="" disabled>Select column...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">Volume Column</label>
                        <select
                          value={volumeColumn}
                          onChange={(e) => setVolumeColumn(e.target.value)}
                          className="w-full p-3 bg-surface-elevated border border-border rounded-radius-md text-text-primary focus:ring-2 focus:ring-teal focus:border-teal transition-all"
                        >
                          <option value="" disabled>Select column...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {inputMethod === 'manual' && (
              <KeywordTableInput
                value={manualKeywordRows}
                onChange={setManualKeywordRows}
              />
            )}
          </Card>

          {/* Step 2: Credentials (if not env configured) */}
          {!hasDfsEnvCredentials && (
            <Card variant="default" padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="teal" size="md">2</Badge>
                <div>
                  <h2 className="text-lg font-heading font-semibold text-text-primary">Enter Credentials</h2>
                  <p className="text-sm text-text-muted">Your DataForSEO API credentials</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="DataForSEO Login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Enter login..."
                />
                <Input
                  type="password"
                  label="DataForSEO Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                />
              </div>
            </Card>
          )}

          {/* Step 3: Analysis Settings */}
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="teal" size="md">{hasDfsEnvCredentials ? '2' : '3'}</Badge>
              <div>
                <h2 className="text-lg font-heading font-semibold text-text-primary">Configure Analysis</h2>
                <p className="text-sm text-text-muted">Define the target market and output language</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">SERP Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-3 bg-surface-elevated border border-border rounded-radius-md text-text-primary focus:ring-2 focus:ring-teal focus:border-teal transition-all"
                >
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">SERP Language</label>
                  <select
                    value={serpLanguage}
                    onChange={(e) => setSerpLanguage(e.target.value)}
                    className="w-full p-3 bg-surface-elevated border border-border rounded-radius-md text-text-primary focus:ring-2 focus:ring-teal focus:border-teal transition-all"
                  >
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">Brief Output Language</label>
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value)}
                    className="w-full p-3 bg-surface-elevated border border-border rounded-radius-md text-text-primary focus:ring-2 focus:ring-teal focus:border-teal transition-all"
                  >
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Template URL */}
          <Card variant="outline" padding="md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-radius-md bg-teal/10 flex items-center justify-center">
                <LinkIcon className="h-4 w-4 text-teal" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text-primary">Use Content as Template</h3>
                <p className="text-xs text-text-muted">Extract heading structure from existing content</p>
              </div>
            </div>
            <Input
              type="url"
              placeholder="https://example.com/article-to-use-as-template"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
            />
          </Card>

          {/* Length Constraints */}
          <LengthSettings
            constraints={lengthConstraints}
            onChange={setLengthConstraints}
          />

          {/* Advanced Settings */}
          <Card variant="outline" padding="none">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-hover transition-colors rounded-radius-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-radius-md bg-teal/10 flex items-center justify-center">
                  <SettingsIcon className="h-4 w-4 text-teal" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">Advanced Settings</h3>
                  <p className="text-sm text-text-muted">AI model selection & configuration</p>
                </div>
              </div>
              <ChevronDownIcon className={`h-5 w-5 text-text-muted transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4">
                <ModelSelector settings={modelSettings} onChange={setModelSettings} />
              </div>
            )}
          </Card>

          {/* Submit Button */}
          <Button onClick={handleSubmit} disabled={isLoading} fullWidth glow size="lg">
            {isLoading ? 'Starting Analysis...' : 'Start Analysis'}
          </Button>

          {(error || localError) && (
            <Alert variant="error" title="Error">
              {error || localError}
            </Alert>
          )}
        </div>

        {/* Right Panel: Info */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card variant="elevated" padding="lg">
            <h2 className="text-2xl font-heading font-bold text-text-primary mb-4">The Strategist's Studio</h2>
            <p className="text-text-secondary mb-6">
              This tool transforms raw keyword data into a comprehensive, actionable content brief designed to dominate search rankings.
            </p>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                  <span className="text-surface-primary font-heading font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">Analyze & Strategize</h3>
                  <p className="text-sm text-text-muted mt-1">We analyze the top 10 SERP results for your keywords, identifying what top-ranking content does right and where the strategic gaps are.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                  <span className="text-surface-primary font-heading font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">Build Your Brief</h3>
                  <p className="text-sm text-text-muted mt-1">Collaborate with the AI to build a hierarchical article structure, define on-page SEO, and generate FAQs based on the data.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                  <span className="text-surface-primary font-heading font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">Generate Content</h3>
                  <p className="text-sm text-text-muted mt-1">Once the brief is finalized, the AI will write a full-length, SEO-optimized article based on your strategic blueprint.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-primary">Start Your Content Project</h1>
        <p className="text-lg text-text-secondary mt-2">Choose your starting point.</p>
      </div>

      {/* Flow Selection */}
      {!flow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card
            variant="interactive"
            padding="lg"
            hover
            glow="teal"
            onClick={() => setFlow('create')}
            className="text-center cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-radius-lg bg-teal/10 flex items-center justify-center">
              <FileCodeIcon className="h-7 w-7 text-teal" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-text-primary">Create New Brief</h2>
            <p className="text-sm text-text-muted mt-2">Start with keywords to generate a data-driven brief from scratch.</p>
          </Card>
          <Card
            variant="interactive"
            padding="lg"
            hover
            glow="teal"
            onClick={onStartUpload}
            className="text-center cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-radius-lg bg-teal/10 flex items-center justify-center">
              <BrainCircuitIcon className="h-7 w-7 text-teal" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-text-primary">Use Existing Brief</h2>
            <p className="text-sm text-text-muted mt-2">Upload a pre-made brief in Markdown to generate the article content.</p>
          </Card>
        </div>
      )}

      {flow === 'create' && renderCreateFlow()}
    </div>
  );
};

export default InitialInputScreen;
