import React, { useState, useEffect, useCallback } from 'react';
import Button from '../Button';
import { AlertTriangleIcon, UploadCloudIcon, XIcon, FileCodeIcon, BrainCircuitIcon, ChevronDownIcon, LinkIcon, SettingsIcon } from '../Icon';
import ModelSelector from '../ModelSelector';
import LengthSettings from '../LengthSettings';
import KeywordTableInput from '../KeywordTableInput';
import { Card, Input, Textarea, Alert, Badge, Tabs, Select, Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui';
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

// Proper CSV line parser that handles quoted values with commas and escaped quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const StepDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i + 1 === current ? 'bg-teal' : i + 1 < current ? 'bg-teal/50' : 'bg-border'}`} />
    ))}
  </div>
);

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

  // Sub-step state for the create flow
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);

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
        const headers = parseCSVLine(firstLine);
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
                        const headers = parseCSVLine(lines[0]);
                        const keywordIndex = headers.indexOf(keywordColumn);
                        const volumeIndex = headers.indexOf(volumeColumn);
                        if (keywordIndex === -1 || volumeIndex === -1) {
                            reject(new Error(`Could not find selected columns '${keywordColumn}' or '${volumeColumn}' in the CSV header.`));
                            return;
                        }
                        const parsed = lines.slice(1).map(line => {
                            const columns = parseCSVLine(line);
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

  // Validation for step 1: keywords must be provided
  const isStep1Valid = (): boolean => {
    if (inputMethod === 'csv') {
      return Boolean(csvFile && keywordColumn && volumeColumn);
    }
    // Manual: at least one row with both keyword and volume filled
    return manualKeywordRows.some(row => row.keyword.trim() !== '' && row.volume.trim() !== '');
  };

  // Validation for step 2: credentials must exist
  const isStep2Valid = (): boolean => {
    return Boolean(login && password);
  };

  const handleNextFromStep1 = () => {
    setLocalError('');
    if (!isStep1Valid()) {
      if (inputMethod === 'csv') {
        setLocalError('Please upload a CSV file and select the keyword and volume columns.');
      } else {
        setLocalError('Please enter at least one keyword with its search volume.');
      }
      return;
    }
    setLocalError('');
    setSetupStep(2);
  };

  const handleNextFromStep2 = () => {
    setLocalError('');
    if (!isStep2Valid()) {
      setLocalError('Please enter your DataForSEO credentials to continue.');
      return;
    }
    setLocalError('');
    setSetupStep(3);
  };

  const renderSetupStep1 = () => (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">What keywords should we target?</h2>
        <p className="text-gray-600 mt-2">Upload a CSV or enter keywords manually to get started.</p>
      </div>

      <StepDots current={1} total={3} />

      <Card variant="default" padding="lg">
        {/* Input method toggle */}
        <Tabs
          variant="pills"
          items={[
            { id: 'csv', label: 'Upload CSV' },
            { id: 'manual', label: 'Manual Input' }
          ]}
          activeId={inputMethod}
          onChange={(id) => setInputMethod(id as 'csv' | 'manual')}
          className="mb-6"
        />

        {inputMethod === 'csv' && (
          <>
            {!csvFile ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-background hover:bg-secondary transition-colors">
                <div className="flex flex-col items-center justify-center py-6">
                  <UploadCloudIcon className="w-10 h-10 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-teal">Click to upload</span> or drag and drop
                  </p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
              </label>
            ) : (
              <Card variant="outline" padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-teal/10 flex items-center justify-center">
                      <FileCodeIcon className="h-5 w-5 text-teal"/>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{csvFile.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(csvFile.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetFileState}>
                    <XIcon className="h-4 w-4"/>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <Select
                    label="Keyword Column"
                    value={keywordColumn}
                    onChange={(e) => setKeywordColumn(e.target.value)}
                    placeholder="Select column..."
                    options={csvHeaders.map(h => ({ value: h, label: h }))}
                  />
                  <Select
                    label="Volume Column"
                    value={volumeColumn}
                    onChange={(e) => setVolumeColumn(e.target.value)}
                    placeholder="Select column..."
                    options={csvHeaders.map(h => ({ value: h, label: h }))}
                  />
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

      {(error || localError) && (
        <div className="mt-4">
          <Alert variant="error" title="Error">
            {error || localError}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => { setLocalError(''); setFlow(null); setSetupStep(1); }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <div className="flex-1">
          <Button onClick={handleNextFromStep1} fullWidth size="lg">
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSetupStep2 = () => (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">Where are your readers?</h2>
        <p className="text-gray-600 mt-2">Set the target market and language for your analysis.</p>
      </div>

      <StepDots current={2} total={3} />

      <div className="space-y-6">
        <Card variant="default" padding="lg">
          <div className="space-y-4">
            <Select
              label="SERP Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={countries.map(c => ({ value: c, label: c }))}
            />
            <Select
              label="SERP Language"
              value={serpLanguage}
              onChange={(e) => setSerpLanguage(e.target.value)}
              options={languages.map(l => ({ value: l, label: l }))}
            />
            <Select
              label="Brief Output Language"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
              options={languages.map(l => ({ value: l, label: l }))}
            />
          </div>
        </Card>

        {!hasDfsEnvCredentials && (
          <Card variant="default" padding="lg">
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-foreground">DataForSEO Credentials</h3>
              <p className="text-sm text-muted-foreground mt-1">Required to fetch SERP data for your keywords.</p>
            </div>
            <div className="space-y-4">
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
      </div>

      {(error || localError) && (
        <div className="mt-4">
          <Alert variant="error" title="Error">
            {error || localError}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => { setLocalError(''); setSetupStep(1); }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <div className="flex-1">
          <Button onClick={handleNextFromStep2} fullWidth size="lg">
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSetupStep3 = () => (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">Fine-tune your brief</h2>
        <p className="text-gray-600 mt-2">Optional settings to customize the output. You can skip straight to analysis.</p>
      </div>

      <StepDots current={3} total={3} />

      <div className="space-y-6">
        {/* Template URL */}
        <Card variant="default" padding="lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
              <LinkIcon className="h-4 w-4 text-teal" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Use Content as Template</h3>
              <p className="text-xs text-muted-foreground">Extract heading structure from existing content</p>
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
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} asChild>
          <Card variant="outline" padding="none">
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
                    <SettingsIcon className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">Advanced Settings</h3>
                    <p className="text-sm text-muted-foreground">AI model selection & configuration</p>
                  </div>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <ModelSelector settings={modelSettings} onChange={setModelSettings} />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {(error || localError) && (
        <div className="mt-4">
          <Alert variant="error" title="Error">
            {error || localError}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => { setLocalError(''); setSetupStep(2); }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <div className="flex-1">
          <Button onClick={handleSubmit} disabled={isLoading} fullWidth glow size="lg">
            {isLoading ? 'Starting Analysis...' : 'Start Analysis'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCreateFlow = () => {
    switch (setupStep) {
      case 1:
        return renderSetupStep1();
      case 2:
        return renderSetupStep2();
      case 3:
        return renderSetupStep3();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Start Your Content Project</h1>
        <p className="text-lg text-gray-600 mt-2">Choose your starting point.</p>
      </div>

      {/* Flow Selection */}
      {!flow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card
            variant="interactive"
            padding="lg"
            hover
            glow="teal"
            onClick={() => setFlow('create')}
            className="text-center cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-teal/10 flex items-center justify-center">
              <FileCodeIcon className="h-7 w-7 text-teal" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Create New Brief</h2>
            <p className="text-sm text-muted-foreground mt-2">Start with keywords to generate a data-driven brief from scratch.</p>
          </Card>
          <Card
            variant="interactive"
            padding="lg"
            hover
            glow="teal"
            onClick={onStartUpload}
            className="text-center cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-teal/10 flex items-center justify-center">
              <BrainCircuitIcon className="h-7 w-7 text-teal" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Use Existing Brief</h2>
            <p className="text-sm text-muted-foreground mt-2">Upload a pre-made brief in Markdown to generate the article content.</p>
          </Card>
        </div>
      )}

      {flow === 'create' && renderCreateFlow()}
    </div>
  );
};

export default InitialInputScreen;
