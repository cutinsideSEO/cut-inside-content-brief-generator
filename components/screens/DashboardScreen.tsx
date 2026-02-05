import React, { useState, useMemo } from 'react';
import type { ContentBrief, CompetitorPage, BriefValidation, EEATSignals } from '../../types';
import { exportBriefToMarkdown } from '../../services/markdownService';
import { validateBrief, generateEEATSignals } from '../../services/geminiService';
import Button from '../Button';
import Spinner from '../Spinner';
import { Badge, Callout, Textarea } from '../ui';

// Import stage components for inline rendering
import Stage1Goal from '../stages/Stage1Goal';
import Stage2Keywords from '../stages/Stage2Keywords';
import Stage3CompetitorAnalysis from '../stages/Stage3CompetitorAnalysis';
import Stage4ContentGapAnalysis from '../stages/Stage4ContentGapAnalysis';
import Stage5Structure from '../stages/Stage5Structure';
import Stage6Faqs from '../stages/Stage6Faqs';
import Stage7Seo from '../stages/Stage7Seo';

// Import icons
import { FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon, BrainCircuitIcon, RefreshCwIcon, ChevronDownIcon, CheckIcon, StarIcon } from '../Icon';

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
  // Lifted sidebar state
  selectedSection?: number | null;
  onSelectSection?: (section: number | null) => void;
}

// Brief Validation Display Component
const BriefValidationDisplay: React.FC<{ validation: BriefValidation }> = ({ validation }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500/10';
    if (score >= 5) return 'bg-amber-400/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
        <div>
          <p className="text-sm font-heading text-gray-400">Overall Score</p>
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
          <div key={key} className={`p-3 rounded-md ${getScoreBgColor(scoreData.score)}`}>
            <p className="text-xs font-heading text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
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
                <p className="text-gray-900 font-medium">{improvement.section}: {improvement.issue}</p>
                <p className="text-gray-400 mt-1">→ {improvement.suggestion}</p>
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
    { key: 'experience', label: 'Experience', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600', items: signals.experience },
    { key: 'expertise', label: 'Expertise', borderColor: 'border-l-emerald-400', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-500', items: signals.expertise },
    { key: 'authority', label: 'Authority', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', items: signals.authority },
    { key: 'trust', label: 'Trust', borderColor: 'border-l-teal', bgColor: 'bg-teal/10', textColor: 'text-teal', items: signals.trust },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(({ key, label, borderColor, bgColor, textColor, items }) => (
          <div key={key} className={`p-4 ${bgColor} border-l-4 ${borderColor} rounded-r-md`}>
            <h4 className={`font-heading font-semibold ${textColor} mb-2`}>{label}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
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
        <Callout variant="info" title="AI Reasoning" collapsible defaultCollapsed>
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
                    <circle className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="30" cx="40" cy="40"/>
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
                <span className="absolute text-xl font-bold font-heading text-gray-900">{`${score}%`}</span>
            </div>
            <p className="font-heading font-semibold text-gray-600 mt-2">Brief Strength</p>
        </div>
    );
};

// Stat Card for dashboard overview
const StatCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-sm font-heading text-gray-400">{label}</p>
        <p className={`text-lg font-bold truncate ${highlight ? 'text-teal' : 'text-gray-900'}`} title={String(value)}>{value}</p>
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
        <div className="animate-fade-in space-y-6">
            {/* Compact header with key stats */}
            <div className="flex items-center gap-6 flex-wrap">
                {!isUploadedBrief && (
                    <BriefStrengthMeter {...strengthProps} briefData={briefData} competitorData={competitorData} />
                )}
                <div>
                    <p className="text-sm text-gray-400">Primary Keyword</p>
                    <p className="text-gray-900 font-heading font-semibold">{primaryKeyword}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{wordCount} words</span>
                    <span className="text-gray-300">|</span>
                    <span>{h2Count} sections</span>
                    <span className="text-gray-300">|</span>
                    <span>{faqCount} FAQs</span>
                </div>
            </div>

            {staleSteps.size > 0 && (
                <Callout variant="warning" title="Stale Sections Detected">
                    <p className="text-sm">Some sections of the brief are out of date due to recent changes. It's recommended to regenerate them for consistency.</p>
                </Callout>
            )}

            {/* Action buttons — horizontal row */}
            <div className="flex items-center gap-3 flex-wrap">
                <Button variant="primary" onClick={onStartContentGeneration} glow>
                    <BrainCircuitIcon className="h-4 w-4 mr-2" />
                    Generate Full Article
                </Button>
                {!isUploadedBrief && (
                    <>
                        <Button variant="secondary" onClick={handleValidateBrief} disabled={isValidating}>
                            {isValidating ? (
                                <><Spinner className="h-4 w-4 mr-2" /> Validating...</>
                            ) : (
                                <><CheckIcon className="h-4 w-4 mr-2" /> Validate Brief</>
                            )}
                        </Button>
                        <Button variant="secondary" onClick={handleGenerateEEAT} disabled={isGeneratingEEAT}>
                            {isGeneratingEEAT ? (
                                <><Spinner className="h-4 w-4 mr-2" /> Generating...</>
                            ) : (
                                <><StarIcon className="h-4 w-4 mr-2" /> E-E-A-T Signals</>
                            )}
                        </Button>
                    </>
                )}
                {/* Export dropdown */}
                <div className="relative">
                    <Button variant="ghost" onClick={() => setIsExportOpen(!isExportOpen)} disabled={isUploadedBrief}>
                        <ChevronDownIcon className={`h-4 w-4 mr-1 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                        Export Brief
                    </Button>
                    {isExportOpen && (
                        <div className="absolute top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 animate-fade-in overflow-hidden">
                            <button onClick={() => { handleExport(false); setIsExportOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-100 transition-colors">
                                Full Brief
                            </button>
                            <button onClick={() => { handleExport(true); setIsExportOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-100 transition-colors">
                                Concise Brief
                            </button>
                        </div>
                    )}
                </div>
                <Button variant="ghost" onClick={onRestart}>
                    Start New Brief
                </Button>
            </div>

            {/* Writer Instructions for uploaded briefs */}
            {isUploadedBrief && (
                <div>
                    <h3 className="text-sm font-heading font-semibold text-gray-600 uppercase tracking-wider mb-2">Writer Instructions</h3>
                    <Textarea
                        value={writerInstructions}
                        onChange={(e) => setWriterInstructions(e.target.value)}
                        placeholder="e.g., 'Write in a witty and conversational tone.' or 'Ensure all examples are from the financial services industry.'"
                        rows={4}
                    />
                </div>
            )}

            {/* Validation results (if generated) */}
            {validationError && (
                <Callout variant="error">
                    <p className="text-sm">{validationError}</p>
                </Callout>
            )}
            {briefData.validation && <BriefValidationDisplay validation={briefData.validation} />}

            {/* E-E-A-T results (if generated) */}
            {eeatError && (
                <Callout variant="error">
                    <p className="text-sm">{eeatError}</p>
                </Callout>
            )}
            {briefData.eeat_signals && <EEATSignalsDisplay signals={briefData.eeat_signals} />}
        </div>
    )
}


const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
    const { briefData, setBriefData, staleSteps, userFeedbacks, onFeedbackChange, onRegenerate, isLoading, loadingStep, competitorData, keywordVolumeMap, isUploadedBrief, outputLanguage, selectedSection: externalSelectedSection, onSelectSection: externalOnSelectSection } = props;
    const [internalSelectedSection, setInternalSelectedSection] = useState<number | null>(null);
    const selectedSection = externalSelectedSection !== undefined ? externalSelectedSection : internalSelectedSection;
    const setSelectedSection = externalOnSelectSection || setInternalSelectedSection;

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
            <div className="animate-fade-in">
                {/* Section header — simple, no Card */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="text-teal">{section.icon}</div>
                    <h2 className="text-xl font-heading font-semibold text-gray-900">{section.title}</h2>
                </div>

                {/* Stage content — directly rendered, no Card wrap */}
                {section.component}

                {/* Feedback — simple bottom section */}
                {!isUploadedBrief && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-heading font-semibold text-gray-600 mb-2">Feedback / Notes for Regeneration</h3>
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
            </div>
        )
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-heading font-bold text-gray-900">Content Brief Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    {isUploadedBrief ? "Your imported brief is ready." : "Your brief is ready."} Review, refine, and generate the article.
                </p>
            </div>

            {renderMainContent()}
        </div>
    );
};

export default DashboardScreen;
