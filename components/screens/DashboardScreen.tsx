import React, { useState, useMemo } from 'react';
import type { ContentBrief, CompetitorPage, BriefValidation, EEATSignals, OutlineItem } from '../../types';
import type { SaveStatus } from '../../types/appState';
import { exportBriefToMarkdown } from '../../services/markdownService';
import { validateBrief, generateEEATSignals } from '../../services/geminiService';
import Button from '../Button';
import Spinner from '../Spinner';
import { Badge, Callout, Textarea, Modal, Separator, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui';
import SaveStatusIndicator from '../SaveStatusIndicator';

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
  subjectInfo: string;
  brandInfo: string;
  contextFiles: File[];
  outputLanguage?: string;
  // Save status
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
  isSupabaseMode?: boolean;
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
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <div>
          <p className="text-sm font-heading text-muted-foreground">Overall Score</p>
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
            <p className="text-xs font-heading text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
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
                <p className="text-foreground font-medium">{improvement.section}: {improvement.issue}</p>
                <p className="text-muted-foreground mt-1">→ {improvement.suggestion}</p>
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

// A new component for the "home" state of the dashboard
const DashboardOverview: React.FC<Pick<DashboardScreenProps, 'briefData' | 'setBriefData' | 'staleSteps' | 'isUploadedBrief' | 'writerInstructions' | 'setWriterInstructions' | 'onStartContentGeneration' | 'onRestart' | 'competitorData' | 'keywordVolumeMap' | 'subjectInfo' | 'brandInfo' | 'contextFiles' | 'userFeedbacks' | 'outputLanguage' | 'saveStatus' | 'lastSavedAt' | 'isSupabaseMode'>> = ({
    briefData, setBriefData, staleSteps, isUploadedBrief, writerInstructions, setWriterInstructions, onStartContentGeneration, onRestart, competitorData, keywordVolumeMap, outputLanguage = 'English', saveStatus, lastSavedAt, isSupabaseMode,
}) => {
    const [isValidating, setIsValidating] = useState(false);
    const [isGeneratingEEAT, setIsGeneratingEEAT] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [eeatError, setEeatError] = useState<string | null>(null);
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
    const [showNewBriefConfirm, setShowNewBriefConfirm] = useState(false);

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

    // Brief title: prefer H1, fall back to title tag, then generic
    const briefTitle = briefData.on_page_seo?.h1?.value
        || briefData.on_page_seo?.title_tag?.value
        || 'Untitled Brief';

    const wordCount = briefData.article_structure?.word_count_target?.toLocaleString() || "N/A";
    const h2Count = briefData.article_structure?.outline?.length || 0;
    const faqCount = briefData.faqs?.questions?.length || 0;

    // Flatten the recursive outline tree into a flat array for display
    const flattenedOutline = useMemo(() => {
        const result: { level: string; heading: string; depth: number }[] = [];
        const flatten = (items: OutlineItem[], depth: number) => {
            for (const item of items) {
                result.push({ level: item.level, heading: item.heading, depth });
                if (item.children?.length) flatten(item.children, depth + 1);
            }
        };
        flatten(briefData.article_structure?.outline || [], 0);
        return result;
    }, [briefData.article_structure?.outline]);

    // SEO fields for the overview
    const getCharCountVariant = (count: number, max: number): 'success' | 'warning' | 'error' => {
        if (count > max) return 'error';
        if (count > max * 0.9) return 'warning';
        return 'success';
    };

    const seoFields = useMemo(() => {
        const seo = briefData.on_page_seo;
        return [
            { key: 'title_tag', label: 'Title Tag', value: seo?.title_tag?.value || '', maxLength: 60 },
            { key: 'meta_description', label: 'Meta Description', value: seo?.meta_description?.value || '', maxLength: 160 },
            { key: 'h1', label: 'H1', value: seo?.h1?.value || '', maxLength: undefined },
            { key: 'url_slug', label: 'URL Slug', value: seo?.url_slug?.value || '', maxLength: undefined },
            { key: 'og_title', label: 'OG Title', value: seo?.og_title?.value || '', maxLength: 70 },
            { key: 'og_description', label: 'OG Description', value: seo?.og_description?.value || '', maxLength: 200 },
        ];
    }, [briefData.on_page_seo]);

    return (
        <div className="animate-fade-in space-y-6">
            {staleSteps.size > 0 && (
                <Callout variant="warning" title="Stale Sections Detected">
                    <p className="text-sm">Some sections of the brief are out of date due to recent changes. It's recommended to regenerate them for consistency.</p>
                </Callout>
            )}

            {/* ── Header: Brief Title + Meta + Actions ── */}
            <div className="pb-4 border-b border-border">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-heading font-bold text-foreground truncate">
                            {briefTitle}
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                            <span>{wordCount} words</span>
                            <Separator orientation="vertical" className="h-3.5" />
                            <span>{h2Count} sections</span>
                            <Separator orientation="vertical" className="h-3.5" />
                            <span>{faqCount} FAQs</span>
                            {isSupabaseMode && saveStatus && (
                                <>
                                    <Separator orientation="vertical" className="h-3.5" />
                                    <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt ?? null} />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button variant="primary" size="sm" onClick={() => setShowGenerateConfirm(true)} glow>
                        <BrainCircuitIcon className="h-4 w-4 mr-1.5" />
                        Generate Full Article
                    </Button>
                    {!isUploadedBrief && (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleValidateBrief} disabled={isValidating}>
                                {isValidating ? (
                                    <><Spinner className="h-3.5 w-3.5 mr-1.5" /> Validating...</>
                                ) : (
                                    <><CheckIcon className="h-3.5 w-3.5 mr-1.5" /> Validate Brief</>
                                )}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleGenerateEEAT} disabled={isGeneratingEEAT}>
                                {isGeneratingEEAT ? (
                                    <><Spinner className="h-3.5 w-3.5 mr-1.5" /> Generating...</>
                                ) : (
                                    <><StarIcon className="h-3.5 w-3.5 mr-1.5" /> E-E-A-T Signals</>
                                )}
                            </Button>
                        </>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" disabled={isUploadedBrief}>
                                <ChevronDownIcon className="h-3.5 w-3.5 mr-1 transition-transform data-[state=open]:rotate-180" />
                                Export Brief
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleExport(false)}>
                                Full Brief
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(true)}>
                                Concise Brief
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="secondary" size="sm" onClick={() => setShowNewBriefConfirm(true)}>
                        Start New Brief
                    </Button>
                </div>
            </div>

            {/* ── Two-Column: Structure (left) + On-Page SEO (right) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Article Structure — takes more space */}
                <div className="xl:col-span-3">
                    <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Article Structure
                    </h2>
                    {(flattenedOutline.length > 0 || (briefData.faqs?.questions?.length ?? 0) > 0) ? (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Level</TableHead>
                                        <TableHead>Heading</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flattenedOutline.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Badge variant="teal" size="sm">{item.level}</Badge>
                                            </TableCell>
                                            <TableCell style={item.depth > 0 ? { paddingLeft: `${1 + item.depth * 1.5}rem` } : undefined}>
                                                <span className="text-sm text-foreground">{item.heading || 'Untitled section'}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {briefData.faqs?.questions?.map((faq, i) => (
                                        <TableRow key={`faq-${i}`} className="bg-secondary/30">
                                            <TableCell>
                                                <Badge variant="default" size="sm">FAQ</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-foreground">{faq.question || 'Untitled question'}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic py-4 text-center border border-border rounded-lg">No article structure generated yet.</p>
                    )}
                </div>

                {/* On-Page SEO — narrower column */}
                <div className="xl:col-span-2">
                    <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        On-Page SEO
                    </h2>
                    {seoFields.some(f => f.value) ? (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <Table>
                                <TableBody>
                                    {seoFields.map(field => (
                                        <TableRow key={field.key}>
                                            <TableCell className="font-heading font-semibold text-xs w-28 align-top text-muted-foreground whitespace-nowrap">
                                                <span>{field.label}</span>
                                                {field.maxLength && field.value && (
                                                    <Badge variant={getCharCountVariant(field.value.length, field.maxLength)} size="sm" className="ml-1.5">
                                                        {field.value.length}/{field.maxLength}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {field.value ? (
                                                    <span className="text-foreground break-words">{field.value}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Not set</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic py-4 text-center border border-border rounded-lg">No SEO data generated yet.</p>
                    )}
                </div>
            </div>

            {/* Writer Instructions for uploaded briefs */}
            {isUploadedBrief && (
                <div>
                    <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Writer Instructions</h3>
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

            {/* Generate Article Confirmation Modal */}
            <Modal
                isOpen={showGenerateConfirm}
                onClose={() => setShowGenerateConfirm(false)}
                title="Generate Full Article"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setShowGenerateConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => { setShowGenerateConfirm(false); onStartContentGeneration(); }}>
                            Generate Article
                        </Button>
                    </>
                }
            >
                <p className="text-gray-600">This will generate a full article based on your brief. The process may take several minutes. Continue?</p>
            </Modal>

            {/* Start New Brief Confirmation Modal */}
            <Modal
                isOpen={showNewBriefConfirm}
                onClose={() => setShowNewBriefConfirm(false)}
                title="Start New Brief"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setShowNewBriefConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => { setShowNewBriefConfirm(false); onRestart(); }}>
                            Start New Brief
                        </Button>
                    </>
                }
            >
                <p className="text-gray-600">Starting a new brief will clear your current work. Make sure you have exported or saved your brief before continuing.</p>
            </Modal>
        </div>
    )
}


const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
    const { briefData, setBriefData, staleSteps, userFeedbacks, onFeedbackChange, onRegenerate, isLoading, loadingStep, competitorData, keywordVolumeMap, isUploadedBrief, outputLanguage, saveStatus, lastSavedAt, isSupabaseMode, selectedSection: externalSelectedSection, onSelectSection: externalOnSelectSection } = props;
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
                    <h2 className="text-xl font-heading font-semibold text-foreground">{section.title}</h2>
                </div>

                {/* Stage content — directly rendered, no Card wrap */}
                {section.component}

                {/* Feedback — simple bottom section */}
                {!isUploadedBrief && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-2">Feedback / Notes for Regeneration</h3>
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
            {renderMainContent()}
        </div>
    );
};

export default DashboardScreen;
