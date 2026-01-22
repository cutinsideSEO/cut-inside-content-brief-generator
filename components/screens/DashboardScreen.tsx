import React, { useState, useMemo } from 'react';
import type { ContentBrief, CompetitorPage, BriefValidation, EEATSignals } from '../../types';
import { exportBriefToMarkdown } from '../../services/markdownService';
import { validateBrief, generateEEATSignals } from '../../services/geminiService';
import Button from '../Button';
import Spinner from '../Spinner';
import { Card, Badge, Callout, Textarea } from '../ui';

// Import stage components for inline rendering
import Stage1Goal from '../stages/Stage1Goal';
import Stage2Keywords from '../stages/Stage2Keywords';
import Stage3CompetitorAnalysis from '../stages/Stage3CompetitorAnalysis';
import Stage4ContentGapAnalysis from '../stages/Stage4ContentGapAnalysis';
import Stage5Structure from '../stages/Stage5Structure';
import Stage6Faqs from '../stages/Stage6Faqs';
import Stage7Seo from '../stages/Stage7Seo';

// Import icons
import { FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon, BrainCircuitIcon, RefreshCwIcon, AlertTriangleIcon, HomeIcon, ChevronDownIcon, CheckIcon, StarIcon, TargetIcon } from '../Icon';

interface DashboardScreenProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  staleSteps: Set<number>;
  userFeedbacks: { [key: number]: string };
  onFeedbackChange: (step: number, value: string) => void;
  onRegenerate: (step: number) => void;
  onRestart: () => void;
  isLoading: boolean;
  loadingStep: number | null;
  competitorData: CompetitorPage[];
  keywordVolumeMap: Map<string, number>;
  onStartContentGeneration: () => void;
  isUploadedBrief?: boolean;
  writerInstructions: string;
  setWriterInstructions: (value: string) => void;
  // Props for Brief Strength
  subjectInfo: string;
  brandInfo: string;
  contextFiles: File[];
  outputLanguage?: string;
}

// Brief Validation Display Component
const BriefValidationDisplay: React.FC<{ validation: BriefValidation }> = ({ validation }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-status-complete';
    if (score >= 5) return 'text-yellow';
    return 'text-status-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-status-complete/10';
    if (score >= 5) return 'bg-yellow/10';
    return 'bg-status-error/10';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 bg-surface-hover rounded-radius-lg">
        <div>
          <p className="text-sm font-heading text-text-muted">Overall Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(validation.overall_score)}`}>
            {validation.overall_score}/50
          </p>
        </div>
        <Badge
          variant={validation.ready_for_writing ? 'success' : 'warning'}
          size="lg"
        >
          {validation.ready_for_writing ? 'Ready for Writing' : 'Needs Improvement'}
        </Badge>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(validation.scores) as [string, { score: number; explanation: string }][]).map(([key, scoreData]) => (
          <div key={key} className={`p-3 rounded-radius-md ${getScoreBgColor(scoreData.score)}`}>
            <p className="text-xs font-heading text-text-muted capitalize">{key.replace(/_/g, ' ')}</p>
            <p className={`text-xl font-bold ${getScoreColor(scoreData.score)}`}>{scoreData.score}/10</p>
          </div>
        ))}
      </div>

      {/* Strengths */}
      {validation.strengths.length > 0 && (
        <Callout variant="success" title="Strengths">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {validation.strengths.map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/* Improvements */}
      {validation.improvements.length > 0 && (
        <Callout variant="warning" title="Suggested Improvements">
          <div className="space-y-3">
            {validation.improvements.map((improvement, i) => (
              <div key={i} className="text-sm">
                <p className="text-text-primary font-medium">{improvement.section}: {improvement.issue}</p>
                <p className="text-text-muted mt-1">→ {improvement.suggestion}</p>
              </div>
            ))}
          </div>
        </Callout>
      )}
    </div>
  );
};

// E-E-A-T Signals Display Component
const EEATSignalsDisplay: React.FC<{ signals: EEATSignals }> = ({ signals }) => {
  const categories = [
    { key: 'experience', label: 'Experience', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', items: signals.experience },
    { key: 'expertise', label: 'Expertise', borderColor: 'border-l-status-complete', bgColor: 'bg-status-complete/10', textColor: 'text-status-complete', items: signals.expertise },
    { key: 'authority', label: 'Authority', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', items: signals.authority },
    { key: 'trust', label: 'Trust', borderColor: 'border-l-teal', bgColor: 'bg-teal/10', textColor: 'text-teal', items: signals.trust },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(({ key, label, borderColor, bgColor, textColor, items }) => (
          <div key={key} className={`p-4 ${bgColor} border-l-4 ${borderColor} rounded-r-radius-md`}>
            <h4 className={`font-heading font-semibold ${textColor} mb-2`}>{label}</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckIcon className={`h-4 w-4 ${textColor} flex-shrink-0 mt-0.5`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {signals.reasoning && (
        <Callout variant="info" title="AI Reasoning">
          <p className="text-sm italic">{signals.reasoning}</p>
        </Callout>
      )}
    </div>
  );
};

const BriefStrengthMeter: React.FC<Pick<DashboardScreenProps, 'briefData' | 'competitorData' | 'subjectInfo' | 'brandInfo' | 'contextFiles' | 'userFeedbacks'>> = (
    { briefData, competitorData, subjectInfo, brandInfo, contextFiles, userFeedbacks }
) => {
    const score = useMemo(() => {
        let currentScore = 50; // Base score
        if (subjectInfo.trim() || brandInfo.trim() || contextFiles.length > 0) currentScore += 15;
        if (competitorData.some(c => c.is_starred)) currentScore += 15;
        if (Object.values(userFeedbacks).some(feedback => typeof feedback === 'string' && feedback.trim())) currentScore += 10;

        // Check if all major parts of the brief exist
        const hasAllSections = briefData.page_goal && briefData.keyword_strategy && briefData.competitor_insights && briefData.content_gap_analysis && briefData.article_structure && briefData.faqs && briefData.on_page_seo;
        if (hasAllSections) currentScore += 10;

        return Math.min(currentScore, 100);
    }, [briefData, competitorData, subjectInfo, brandInfo, contextFiles, userFeedbacks]);

    const circumference = 30 * 2 * Math.PI;

    return (
        <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center overflow-hidden rounded-full">
                <svg className="w-20 h-20">
                    <circle className="text-border-subtle" strokeWidth="4" stroke="currentColor" fill="transparent" r="30" cx="40" cy="40"/>
                    <circle
                        className="text-teal transition-all duration-500"
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - score / 100 * circumference}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="30"
                        cx="40"
                        cy="40"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }}
                    />
                </svg>
                <span className="absolute text-xl font-bold font-heading text-text-primary">{`${score}%`}</span>
            </div>
            <p className="font-heading font-semibold text-text-secondary mt-2">Brief Strength</p>
        </div>
    );
};

// Stat Card for dashboard overview
const StatCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className="bg-surface-hover p-4 rounded-radius-lg">
        <p className="text-sm font-heading text-text-muted">{label}</p>
        <p className={`text-lg font-bold truncate ${highlight ? 'text-teal' : 'text-text-primary'}`} title={String(value)}>{value}</p>
    </div>
);

// A new component for the "home" state of the dashboard
const DashboardOverview: React.FC<Pick<DashboardScreenProps, 'briefData' | 'setBriefData' | 'staleSteps' | 'isUploadedBrief' | 'writerInstructions' | 'setWriterInstructions' | 'onStartContentGeneration' | 'onRestart' | 'competitorData' | 'keywordVolumeMap' | 'subjectInfo' | 'brandInfo' | 'contextFiles' | 'userFeedbacks' | 'outputLanguage'>> = ({
    briefData, setBriefData, staleSteps, isUploadedBrief, writerInstructions, setWriterInstructions, onStartContentGeneration, onRestart, competitorData, keywordVolumeMap, outputLanguage = 'English', ...strengthProps
}) => {
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isGeneratingEEAT, setIsGeneratingEEAT] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [eeatError, setEeatError] = useState<string | null>(null);

    const handleExport = (isConcise: boolean) => {
        exportBriefToMarkdown(briefData, competitorData, keywordVolumeMap, isConcise);
    };

    const handleValidateBrief = async () => {
        setIsValidating(true);
        setValidationError(null);
        try {
            const validation = await validateBrief(briefData, outputLanguage);
            setBriefData(prev => ({ ...prev, validation }));
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Validation failed');
        } finally {
            setIsValidating(false);
        }
    };

    const handleGenerateEEAT = async () => {
        setIsGeneratingEEAT(true);
        setEeatError(null);
        try {
            const competitorDataJson = JSON.stringify(competitorData.slice(0, 5).map(c => ({
                url: c.URL,
                h1s: c.H1s,
                h2s: c.H2s.slice(0, 10)
            })));
            const eeatSignals = await generateEEATSignals(briefData, competitorDataJson, outputLanguage);
            setBriefData(prev => ({ ...prev, eeat_signals: eeatSignals }));
        } catch (error) {
            setEeatError(error instanceof Error ? error.message : 'E-E-A-T generation failed');
        } finally {
            setIsGeneratingEEAT(false);
        }
    };

    const primaryKeyword = briefData.keyword_strategy?.primary_keywords?.[0]?.keyword || (isUploadedBrief ? briefData.on_page_seo?.h1?.value : "N/A");
    const wordCount = briefData.article_structure?.word_count_target?.toLocaleString() || "N/A";
    const h2Count = briefData.article_structure?.outline?.length || 0;
    const faqCount = briefData.faqs?.questions?.length || 0;

    return (
        <div className="space-y-6">
            {/* Brief Overview Card */}
            <Card variant="default" padding="lg">
                <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">Brief Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-1">
                       {!isUploadedBrief && <BriefStrengthMeter {...strengthProps} briefData={briefData} competitorData={competitorData} />}
                    </div>
                    <StatCard label="Primary Keyword" value={primaryKeyword} highlight />
                    <StatCard label="Word Count" value={wordCount} />
                    <StatCard label="H2 Sections" value={h2Count} />
                    <StatCard label="FAQs" value={faqCount} />
                </div>
                {staleSteps.size > 0 && (
                    <div className="mt-4">
                        <Callout variant="warning" title="Stale Sections Detected">
                            <p className="text-sm">Some sections of the brief are out of date due to recent changes. It's recommended to regenerate them for consistency.</p>
                        </Callout>
                    </div>
                )}
            </Card>

            {/* Brief Validation Section */}
            {!isUploadedBrief && (
                <Card variant="default" padding="lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                                <TargetIcon className="h-5 w-5 text-teal" />
                            </div>
                            <div>
                                <h2 className="text-lg font-heading font-semibold text-text-primary">Brief Validation</h2>
                                <p className="text-sm text-text-muted">Analyze completeness and get improvement suggestions</p>
                            </div>
                        </div>
                        {!briefData.validation && (
                            <Button
                                onClick={handleValidateBrief}
                                disabled={isValidating}
                                variant="outline"
                                size="sm"
                            >
                                {isValidating ? (
                                    <>
                                        <Spinner className="h-4 w-4 mr-2" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="h-4 w-4 mr-2" />
                                        Validate Brief
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    {validationError && (
                        <Callout variant="error" className="mb-4">
                            <p className="text-sm">{validationError}</p>
                        </Callout>
                    )}
                    {briefData.validation ? (
                        <BriefValidationDisplay validation={briefData.validation} />
                    ) : (
                        <p className="text-text-muted text-sm">Click "Validate Brief" to analyze your brief's completeness and get improvement suggestions.</p>
                    )}
                </Card>
            )}

            {/* E-E-A-T Signals Section */}
            {!isUploadedBrief && (
                <Card variant="default" padding="lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                                <StarIcon className="h-5 w-5 text-teal" />
                            </div>
                            <div>
                                <h2 className="text-lg font-heading font-semibold text-text-primary">E-E-A-T Signals</h2>
                                <p className="text-sm text-text-muted">Experience, Expertise, Authority, and Trust signals</p>
                            </div>
                        </div>
                        {!briefData.eeat_signals && (
                            <Button
                                onClick={handleGenerateEEAT}
                                disabled={isGeneratingEEAT}
                                variant="outline"
                                size="sm"
                            >
                                {isGeneratingEEAT ? (
                                    <>
                                        <Spinner className="h-4 w-4 mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuitIcon className="h-4 w-4 mr-2" />
                                        Generate E-E-A-T
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    {eeatError && (
                        <Callout variant="error" className="mb-4">
                            <p className="text-sm">{eeatError}</p>
                        </Callout>
                    )}
                    {briefData.eeat_signals ? (
                        <EEATSignalsDisplay signals={briefData.eeat_signals} />
                    ) : (
                        <p className="text-text-muted text-sm">Click "Generate E-E-A-T" to get recommendations for improving your content's credibility signals.</p>
                    )}
                </Card>
            )}

            {/* Writer Instructions for uploaded briefs */}
            {isUploadedBrief && (
                <Card variant="default" padding="lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                            <BrainCircuitIcon className="h-5 w-5 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-lg font-heading font-semibold text-text-primary">Writer Instructions</h2>
                            <p className="text-sm text-text-muted">Additional instructions for tone, style, etc.</p>
                        </div>
                    </div>
                    <Textarea
                        value={writerInstructions}
                        onChange={(e) => setWriterInstructions(e.target.value)}
                        placeholder="e.g., 'Write in a witty and conversational tone.' or 'Ensure all examples are from the financial services industry.'"
                        rows={4}
                    />
                </Card>
            )}

            {/* Actions Card */}
            <Card variant="default" padding="lg">
                <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left Column: Primary Action */}
                    <div className="space-y-2">
                        <Button onClick={onStartContentGeneration} variant="primary" size="lg" glow fullWidth className="!py-4">
                            <BrainCircuitIcon className="h-6 w-6 mr-2" />
                            <span className="text-lg">Generate Full Article</span>
                        </Button>
                        <p className="text-sm text-text-muted text-center px-4">Use the finalized brief to generate a complete, SEO-optimized article.</p>
                    </div>

                    {/* Right Column: Secondary Actions */}
                    <div className="space-y-4">
                        {/* Export Dropdown */}
                        <div className="relative">
                            <Button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                variant="outline"
                                fullWidth
                                className="flex items-center justify-between"
                                disabled={isUploadedBrief}
                                title={isUploadedBrief ? "Export is disabled for uploaded briefs" : ""}
                            >
                                <span>Export Brief (Markdown)</span>
                                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            {isExportOpen && (
                                <div className="absolute top-full mt-2 w-full bg-surface-elevated backdrop-blur-sm border border-border rounded-radius-md shadow-lg z-10 animate-fade-in overflow-hidden">
                                    <button onClick={() => { handleExport(false); setIsExportOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        Export Full Brief
                                    </button>
                                    <button onClick={() => { handleExport(true); setIsExportOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        Export Concise Brief
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Restart Button */}
                        <Button onClick={onRestart} variant="secondary" fullWidth>
                            Start New Brief
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}


const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
    const { briefData, setBriefData, staleSteps, userFeedbacks, onFeedbackChange, onRegenerate, isLoading, loadingStep, competitorData, keywordVolumeMap, isUploadedBrief, outputLanguage } = props;
    const [selectedSection, setSelectedSection] = useState<number | null>(null);

    const sections = [
        { logicalStep: 1, title: 'Goal & Audience', icon: <FlagIcon className="h-5 w-5" />, component: <Stage1Goal briefData={briefData} setBriefData={setBriefData} /> },
        { logicalStep: 3, title: 'Competitive Analysis', icon: <FileSearchIcon className="h-5 w-5" />, component: <Stage3CompetitorAnalysis briefData={briefData} setBriefData={setBriefData} competitorData={competitorData} /> },
        { logicalStep: 2, title: 'Keyword Strategy', icon: <KeyIcon className="h-5 w-5" />, component: <Stage2Keywords briefData={briefData} setBriefData={setBriefData} keywordVolumeMap={keywordVolumeMap} /> },
        { logicalStep: 4, title: 'Content Gap Analysis', icon: <PuzzleIcon className="h-5 w-5" />, component: <Stage4ContentGapAnalysis briefData={briefData} setBriefData={setBriefData} /> },
        { logicalStep: 5, title: 'Article Structure', icon: <ListTreeIcon className="h-5 w-5" />, component: <Stage5Structure briefData={briefData} setBriefData={setBriefData} /> },
        { logicalStep: 6, title: 'FAQs', icon: <HelpCircleIcon className="h-5 w-5" />, component: <Stage6Faqs briefData={briefData} setBriefData={setBriefData} /> },
        { logicalStep: 7, title: 'On-Page SEO', icon: <FileCodeIcon className="h-5 w-5" />, component: <Stage7Seo briefData={briefData} setBriefData={setBriefData} /> },
    ];

    const renderMainContent = () => {
        if (selectedSection === null) {
            return <DashboardOverview {...props} />;
        }

        const section = sections.find(s => s.logicalStep === selectedSection);
        if (!section) return <DashboardOverview {...props} />; // Fallback

        const isLoadingThisSection = isLoading && loadingStep === section.logicalStep;

        return (
            <Card variant="default" padding="none" className="animate-fade-in overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover">
                    <div className="flex items-center gap-3">
                        <div className="text-teal">{section.icon}</div>
                        <h2 className="text-lg font-heading font-semibold text-text-primary">{section.title}</h2>
                    </div>
                </div>
                <div className="p-6">
                    {section.component}
                </div>
                {!isUploadedBrief && (
                    <div className="p-4 border-t border-border bg-surface-hover">
                        <h3 className="text-sm font-heading font-semibold text-text-secondary mb-2">Feedback / Notes for Regeneration</h3>
                        <Textarea
                            value={userFeedbacks[section.logicalStep] || ''}
                            onChange={(e) => onFeedbackChange(section.logicalStep, e.target.value)}
                            placeholder={`e.g., 'Make the tone more technical' or 'Focus on enterprise customers'`}
                            rows={3}
                            disabled={isLoadingThisSection}
                        />
                        <div className="mt-3">
                            <Button
                                onClick={() => onRegenerate(section.logicalStep)}
                                disabled={isLoadingThisSection}
                                variant="secondary" size="sm"
                            >
                                {isLoadingThisSection ? (
                                    <>
                                        <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin"/>
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCwIcon className="h-4 w-4 mr-2"/>
                                        Regenerate {section.title}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        )
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-text-primary">Content Brief Dashboard</h1>
                <p className="text-lg text-text-secondary mt-2">
                    {isUploadedBrief ? "Your imported brief is ready." : "Your brief is ready."} Review, refine, and generate the article.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar */}
                <aside className="lg:col-span-3">
                    <Card variant="default" padding="sm" className="sticky top-24">
                        <div className="p-2">
                            <h3 className="px-3 text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Dashboard</h3>
                            <nav className="mt-2 space-y-1">
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setSelectedSection(null); }}
                                    className={`flex items-center px-3 py-2 text-sm font-semibold rounded-radius-md transition-colors ${
                                        selectedSection === null
                                            ? 'bg-teal/20 text-teal'
                                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                    }`}
                                >
                                    <HomeIcon className="mr-3 h-5 w-5" />
                                    <span>Overview</span>
                                </a>
                            </nav>

                            {!isUploadedBrief && (
                                <>
                                    <h3 className="mt-6 px-3 text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Brief Sections</h3>
                                    <nav className="mt-2 space-y-1">
                                        {sections.map(section => (
                                            <a
                                                key={section.logicalStep}
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); setSelectedSection(section.logicalStep); }}
                                                className={`flex items-center px-3 py-2 text-sm font-semibold rounded-radius-md transition-colors ${
                                                    selectedSection === section.logicalStep
                                                        ? 'bg-teal/20 text-teal'
                                                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                                }`}
                                            >
                                                <span className="mr-3">{section.icon}</span>
                                                <span className="flex-1">{section.title}</span>
                                                {staleSteps.has(section.logicalStep) && (
                                                    <div className="relative group">
                                                        <AlertTriangleIcon className="h-4 w-4 text-yellow"/>
                                                        <span className="absolute right-0 -top-8 w-max bg-surface-elevated text-text-primary text-xs rounded-radius-sm py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-border">
                                                            This section is stale
                                                        </span>
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </nav>
                                </>
                            )}
                        </div>
                    </Card>
                </aside>

                {/* Main Content */}
                <main className="lg:col-span-9">
                    {renderMainContent()}
                </main>
            </div>
        </div>
    );
};

export default DashboardScreen;
