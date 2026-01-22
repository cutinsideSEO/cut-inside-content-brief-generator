import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import Button from '../Button';
import { AlertCircleIcon, FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon, CheckIcon } from '../Icon';
import type { ContentBrief, CompetitorPage } from '../../types';
import { UI_TO_LOGICAL_STEP_MAP, THEMED_LOADING_MESSAGES } from '../../constants';
import { useSound } from '../../App';
import { Card, Progress, Textarea, Badge, Alert } from '../ui';

// Import all stage components
import Stage1Goal from '../stages/Stage1Goal';
import Stage2Keywords from '../stages/Stage2Keywords';
import Stage3CompetitorAnalysis from '../stages/Stage3CompetitorAnalysis';
import Stage4ContentGapAnalysis from '../stages/Stage4ContentGapAnalysis';
import Stage5Structure from '../stages/Stage5Structure';
import Stage6Faqs from '../stages/Stage6Faqs';
import Stage7Seo from '../stages/Stage7Seo';

const STEPS = [
    { uiStep: 1, logicalStep: 1, title: 'Goal & Audience', icon: <FlagIcon className="h-4 w-4" /> },
    { uiStep: 2, logicalStep: 3, title: 'Comp. Analysis', icon: <FileSearchIcon className="h-4 w-4" /> },
    { uiStep: 3, logicalStep: 2, title: 'Keywords', icon: <KeyIcon className="h-4 w-4" /> },
    { uiStep: 4, logicalStep: 4, title: 'Content Gaps', icon: <PuzzleIcon className="h-4 w-4" /> },
    { uiStep: 5, logicalStep: 5, title: 'Structure', icon: <ListTreeIcon className="h-4 w-4" /> },
    { uiStep: 6, logicalStep: 6, title: 'FAQs', icon: <HelpCircleIcon className="h-4 w-4" /> },
    { uiStep: 7, logicalStep: 7, title: 'On-Page SEO', icon: <FileCodeIcon className="h-4 w-4" /> },
];

interface BriefingScreenProps {
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  onNextStep: (feedback?: string) => void;
  onRegenerate: (step: number, feedback?: string) => void;
  onRestart: () => void;
  keywordVolumeMap: Map<string, number>;
  competitorData: CompetitorPage[];
  isFeelingLuckyFlow: boolean;
}

const ThemedLoader: React.FC<{ header: string; step?: number }> = ({ header, step }) => {
    const [message, setMessage] = useState(THEMED_LOADING_MESSAGES[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(prev => {
                const currentIndex = THEMED_LOADING_MESSAGES.indexOf(prev);
                const nextIndex = (currentIndex + 1) % THEMED_LOADING_MESSAGES.length;
                return THEMED_LOADING_MESSAGES[nextIndex];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-fade-in">
            <div className="relative">
                <div className="absolute inset-0 bg-teal/20 rounded-full blur-xl animate-pulse" />
                <Spinner />
            </div>
            <p className="mt-6 text-center font-heading font-semibold text-lg text-text-primary">{header}</p>
            <p className="text-center text-text-muted mt-2 transition-opacity duration-300">{message}</p>
            {step && (
                <div className="mt-6 w-full max-w-xs">
                    <Progress value={(step / 7) * 100} size="sm" color="teal" showLabel label={`Step ${step} of 7`} />
                </div>
            )}
        </div>
    );
};

const VerticalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
    <Card variant="default" padding="md" className="sticky top-24">
        <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-4">Brief Progress</h3>
        <nav aria-label="Progress">
            <ol role="list" className="space-y-1">
                {STEPS.map((step, index) => {
                    const isCompleted = currentStep > step.uiStep;
                    const isActive = currentStep === step.uiStep;
                    return (
                        <li key={step.title} className="relative">
                            {index !== STEPS.length - 1 && (
                                <div
                                    className={`absolute left-[18px] top-10 h-[calc(100%-8px)] w-0.5 transition-colors duration-300 ${
                                        isCompleted ? 'bg-teal' : 'bg-border'
                                    }`}
                                    aria-hidden="true"
                                />
                            )}
                            <div className={`relative flex items-center gap-3 p-2 rounded-radius-md transition-all duration-200 ${
                                isActive ? 'bg-teal/10' : 'hover:bg-surface-hover'
                            }`}>
                                <span className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                    isCompleted
                                        ? 'bg-teal border-teal shadow-glow-teal-sm'
                                        : isActive
                                            ? 'border-teal bg-surface-elevated'
                                            : 'border-border bg-surface-elevated'
                                }`}>
                                    <span className={`transition-colors duration-200 ${
                                        isCompleted
                                            ? 'text-surface-primary'
                                            : isActive
                                                ? 'text-teal'
                                                : 'text-text-muted'
                                    }`}>
                                        {isCompleted ? <CheckIcon className="h-4 w-4" /> : step.icon}
                                    </span>
                                </span>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-heading font-medium transition-colors duration-200 ${
                                        isActive ? 'text-text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-muted'
                                    }`}>
                                        {step.title}
                                    </span>
                                    {isActive && (
                                        <span className="text-xs text-teal">Current step</span>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    </Card>
);

const BriefSummaryPanel: React.FC<{ briefData: Partial<ContentBrief>, currentStep: number }> = ({ briefData, currentStep }) => {
    const hasAnyData = (currentStep > 1 && briefData.page_goal) ||
                       (currentStep > 3 && briefData.keyword_strategy) ||
                       (currentStep > 4 && briefData.content_gap_analysis);

    return (
        <Card variant="default" padding="md" className="sticky top-24">
            <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-4">Brief Summary</h3>

            {!hasAnyData && (
                <p className="text-sm text-text-muted italic">Summary will appear as you complete steps...</p>
            )}

            <div className="space-y-4">
                {currentStep > 1 && briefData.page_goal && (
                    <div className="border-l-2 border-teal pl-3">
                        <p className="text-xs font-heading font-medium text-teal uppercase tracking-wider">Page Goal</p>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-3">{briefData.page_goal.value}</p>
                    </div>
                )}

                {currentStep > 3 && briefData.keyword_strategy && (
                    <div className="border-l-2 border-teal pl-3">
                        <p className="text-xs font-heading font-medium text-teal uppercase tracking-wider">Primary Keywords</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {briefData.keyword_strategy.primary_keywords.slice(0, 3).map(kw => (
                                <Badge key={kw.keyword} variant="teal" size="sm">{kw.keyword}</Badge>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep > 4 && briefData.content_gap_analysis && (
                    <div className="border-l-2 border-teal pl-3">
                        <p className="text-xs font-heading font-medium text-teal uppercase tracking-wider">Strategic Opportunities</p>
                        <ul className="mt-2 space-y-1.5">
                            {briefData.content_gap_analysis.strategic_opportunities.slice(0, 3).map((op, idx) => (
                                <li key={op.value} className="text-sm text-text-secondary flex items-start gap-2">
                                    <span className="text-teal mt-0.5">•</span>
                                    <span className="line-clamp-2">{op.value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Card>
    );
}

const BriefingScreen: React.FC<BriefingScreenProps> = ({
  currentStep,
  isLoading,
  error,
  briefData,
  setBriefData,
  onNextStep,
  onRegenerate,
  onRestart,
  keywordVolumeMap,
  competitorData,
  isFeelingLuckyFlow,
}) => {
  const [userFeedback, setUserFeedback] = useState('');
  const sound = useSound();

  const stepNames: { [key: number]: string } = {
    1: 'Goal & Audience',
    2: 'Competitor Analysis',
    3: 'Keywords',
    4: 'Content Gaps',
    5: 'Structure',
    6: 'FAQs',
    7: 'On-Page SEO',
  };

  // Play success sound when a step completes
  useEffect(() => {
      if (!isLoading && currentStep > 1 && briefingStepHasData(currentStep-1, briefData)) {
          sound?.playSound('success');
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentStep]);

  const briefingStepHasData = (step: number, data: Partial<ContentBrief>) => {
      switch(step) {
        case 1: return !!data.page_goal;
        case 2: return !!data.competitor_insights;
        case 3: return !!data.keyword_strategy;
        case 4: return !!data.content_gap_analysis;
        case 5: return !!data.article_structure;
        case 6: return !!data.faqs;
        case 7: return !!data.on_page_seo;
        default: return false;
    }
  }


  if (isFeelingLuckyFlow) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="py-8">
            {/* Animated loader with glow */}
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-teal/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-teal/10 rounded-full p-6">
                <Spinner />
              </div>
            </div>

            <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
              Automatically Generating Brief
            </h2>
            <p className="text-text-secondary text-lg mb-8">
              {isLoading ? `Working on ${stepNames[currentStep]}` : 'Preparing next step...'}
            </p>

            {/* Progress section */}
            <div className="space-y-4">
              <Progress
                value={(currentStep / 7) * 100}
                size="md"
                color="teal"
                showLabel
                label={`Step ${currentStep} of 7`}
              />

              {/* Step indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      step < currentStep
                        ? 'bg-teal text-surface-primary'
                        : step === currentStep
                          ? 'bg-teal/20 text-teal border-2 border-teal animate-pulse'
                          : 'bg-surface-hover text-text-muted'
                    }`}
                  >
                    {step < currentStep ? <CheckIcon className="h-4 w-4" /> : step}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-text-muted text-sm mt-8">
              You can navigate away - we'll continue in the background
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  const renderContent = () => {
    if (isLoading) {
      return <ThemedLoader header={`AI is working on ${stepNames[currentStep]}...`} step={currentStep} />;
    }

    if (error && !briefingStepHasData(currentStep, briefData)) {
       return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <div className="bg-status-error/10 rounded-full p-4 mb-4">
            <AlertCircleIcon className="h-12 w-12 text-status-error"/>
          </div>
          <h3 className="text-xl font-heading font-semibold text-text-primary mb-2">Generation Failed</h3>
          <p className="text-sm text-text-secondary max-w-md text-center">{error}</p>
          <Button
            variant="secondary"
            onClick={() => onRegenerate(logicalCurrentStep, userFeedback)}
            className="mt-6"
          >
            Try Again
          </Button>
        </div>
      );
    }

    const stageProps = { briefData, setBriefData };

    switch(currentStep) {
        case 1: return <Stage1Goal {...stageProps} />;
        case 2: return <Stage3CompetitorAnalysis {...stageProps} competitorData={competitorData} />;
        case 3: return <Stage2Keywords {...stageProps} keywordVolumeMap={keywordVolumeMap} />;
        case 4: return <Stage4ContentGapAnalysis {...stageProps} />;
        case 5: return <Stage5Structure {...stageProps} />;
        case 6: return <Stage6Faqs {...stageProps} />;
        case 7: return <Stage7Seo {...stageProps} />;
        default: return null;
    }
  };

  const logicalCurrentStep = UI_TO_LOGICAL_STEP_MAP[currentStep] || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* Left Panel: Stepper */}
        <div className="lg:col-span-3 order-2 lg:order-1">
            <VerticalStepper currentStep={currentStep} />
        </div>

        {/* Center Panel: Content & Actions */}
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            {/* Step header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge variant="teal" size="sm">Step {currentStep}/7</Badge>
                    <h2 className="text-xl font-heading font-semibold text-text-primary">
                        {stepNames[currentStep]}
                    </h2>
                </div>
                {briefingStepHasData(currentStep, briefData) && (
                    <Badge variant="success" size="sm">
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Generated
                    </Badge>
                )}
            </div>

            {/* Main content card */}
            <Card variant="default" padding="lg">
                {renderContent()}
            </Card>

            {/* Feedback and actions */}
            {currentStep <= 7 && !isLoading && (
                <Card variant="default" padding="md">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-3">
                                Feedback for Regeneration
                            </h3>
                            <Textarea
                                value={userFeedback}
                                onChange={(e) => setUserFeedback(e.target.value)}
                                placeholder="e.g., 'Make the tone more technical' or 'Add a section about X'"
                                rows={3}
                                hint="Optional: Provide guidance if you want to regenerate this step"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                variant="primary"
                                onClick={() => onNextStep(userFeedback)}
                                disabled={isLoading}
                                className="flex-1"
                                glow
                            >
                                {currentStep === 7 ? 'Accept & View Dashboard' : 'Accept & Continue'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => onRegenerate(logicalCurrentStep, userFeedback)}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                Regenerate Step
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>

        {/* Right Panel: Summary */}
        <div className="lg:col-span-3 order-3">
            <BriefSummaryPanel briefData={briefData} currentStep={currentStep} />
        </div>
    </div>
  );
};

export default BriefingScreen;