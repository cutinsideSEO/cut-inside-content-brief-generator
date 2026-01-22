import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import Button from '../Button';
import { AlertCircleIcon, FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon } from '../Icon';
import type { ContentBrief, CompetitorPage } from '../../types';
import { UI_TO_LOGICAL_STEP_MAP, THEMED_LOADING_MESSAGES } from '../../constants';
import { useSound } from '../../App';

// Import all stage components
import Stage1Goal from '../stages/Stage1Goal';
import Stage2Keywords from '../stages/Stage2Keywords';
import Stage3CompetitorAnalysis from '../stages/Stage3CompetitorAnalysis';
import Stage4ContentGapAnalysis from '../stages/Stage4ContentGapAnalysis';
import Stage5Structure from '../stages/Stage5Structure';
import Stage6Faqs from '../stages/Stage6Faqs';
import Stage7Seo from '../stages/Stage7Seo';

const STEPS = [
    { uiStep: 1, logicalStep: 1, title: 'Goal & Audience', icon: <FlagIcon className="h-5 w-5" /> },
    { uiStep: 2, logicalStep: 3, title: 'Comp. Analysis', icon: <FileSearchIcon className="h-5 w-5" /> },
    { uiStep: 3, logicalStep: 2, title: 'Keywords', icon: <KeyIcon className="h-5 w-5" /> },
    { uiStep: 4, logicalStep: 4, title: 'Content Gaps', icon: <PuzzleIcon className="h-5 w-5" /> },
    { uiStep: 5, logicalStep: 5, title: 'Structure', icon: <ListTreeIcon className="h-5 w-5" /> },
    { uiStep: 6, logicalStep: 6, title: 'FAQs', icon: <HelpCircleIcon className="h-5 w-5" /> },
    { uiStep: 7, logicalStep: 7, title: 'On-Page SEO', icon: <FileCodeIcon className="h-5 w-5" /> },
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

const ThemedLoader: React.FC<{ header: string }> = ({ header }) => {
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
        <div className="flex flex-col items-center justify-center h-full text-grey/70 min-h-[50vh]">
            <Spinner />
            <p className="mt-4 text-center font-semibold text-lg">{header}</p>
            <p className="text-center text-grey/60">{message}</p>
        </div>
    );
};

const VerticalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
    <nav aria-label="Progress">
        <ol role="list" className="space-y-4">
            {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.uiStep;
                const isActive = currentStep === step.uiStep;
                return (
                    <li key={step.title} className="relative">
                        {index !== STEPS.length - 1 && (
                            <div className={`absolute left-5 top-5 -ml-px mt-0.5 h-full w-0.5 ${isCompleted ? 'bg-teal' : 'bg-white/10'}`} aria-hidden="true" />
                        )}
                        <div className="relative flex items-start group">
                            <span className="h-9 flex items-center">
                                <span className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-full border-2 ${isCompleted ? 'bg-teal border-teal' : isActive ? 'border-teal bg-black' : 'border-white/20 bg-black'}`}>
                                    <span className={`${isCompleted ? 'text-black' : isActive ? 'text-teal' : 'text-grey/50'}`}>
                                        {isCompleted ? '✓' : step.icon}
                                    </span>
                                </span>
                            </span>
                            <span className="ml-4 flex min-w-0 flex-col mt-1.5">
                                <span className={`text-sm font-heading font-semibold ${isActive ? 'text-grey' : 'text-grey/60'}`}>{step.title}</span>
                            </span>
                        </div>
                    </li>
                );
            })}
        </ol>
    </nav>
);

const BriefSummaryPanel: React.FC<{ briefData: Partial<ContentBrief>, currentStep: number }> = ({ briefData, currentStep }) => (
    <div className="bg-black/30 p-4 rounded-lg border border-white/10 sticky top-24 space-y-4">
        <h3 className="text-md font-heading font-semibold text-grey/80">Brief Summary</h3>
        {currentStep > 1 && briefData.page_goal && (
             <div>
                <p className="text-sm font-heading text-teal">Page Goal</p>
                <p className="text-xs text-grey/70 italic mt-1">{briefData.page_goal.value}</p>
            </div>
        )}
        {currentStep > 3 && briefData.keyword_strategy && (
             <div>
                <p className="text-sm font-heading text-teal">Primary Keywords</p>
                <ul className="text-xs text-grey/70 mt-1 space-y-1">
                    {briefData.keyword_strategy.primary_keywords.slice(0, 3).map(kw => <li key={kw.keyword}>- {kw.keyword}</li>)}
                </ul>
            </div>
        )}
         {currentStep > 4 && briefData.content_gap_analysis && (
             <div>
                <p className="text-sm font-heading text-teal">Strategic Opportunities</p>
                 <ul className="text-xs text-grey/70 mt-1 space-y-1">
                    {briefData.content_gap_analysis.strategic_opportunities.slice(0, 3).map(op => <li key={op.value}>- {op.value}</li>)}
                </ul>
            </div>
        )}
    </div>
)

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
      <div className="animate-fade-in text-center p-8">
        <div className="flex justify-center items-center mb-4">
            <Spinner />
        </div>
        <h2 className="text-2xl font-heading font-bold mt-4 text-grey">
            Automatically Generating Brief...
        </h2>
        <p className="text-grey/70 text-lg">
            {isLoading ? `Working on Step ${currentStep}: ${stepNames[currentStep]}` : 'Preparing next step...'}
        </p>
        <div className="w-full max-w-2xl mx-auto mt-6">
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-teal">{`Step ${currentStep} of 7`}</span>
                <span className="text-sm font-medium text-teal">{Math.round((currentStep / 7) * 100)}%</span>
            </div>
            <div className="w-full bg-grey/10 rounded-full h-2.5">
                <div className="bg-teal h-2.5 rounded-full" style={{ width: `${(currentStep / 7) * 100}%` }}></div>
            </div>
        </div>
      </div>
    );
  }
  
  const renderContent = () => {
    if (isLoading) {
      return <ThemedLoader header={`AI is working on step ${currentStep}...`} />;
    }
    
    if (error && !briefingStepHasData(currentStep, briefData)) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 text-center min-h-[50vh]">
          <AlertCircleIcon className="h-12 w-12 mb-4"/>
          <p className="font-semibold">Generation Failed</p>
          <p className="text-sm text-red-300">{error}</p>
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
        {/* Left Panel: Stepper */}
        <div className="lg:col-span-3">
             <div className="sticky top-24">
                <VerticalStepper currentStep={currentStep} />
            </div>
        </div>

        {/* Center Panel: Content & Actions */}
        <div className="lg:col-span-6">
            <div className="bg-black/50 p-6 rounded-lg border border-white/10">
                {renderContent()}
            </div>
            {currentStep <= 7 && !isLoading && (
                <div className="mt-6 pt-6 border-t border-white/10 flex-shrink-0 bg-black/50 p-6 rounded-lg">
                <h3 className="text-md font-heading font-semibold text-grey mb-2">Feedback / Notes for Regeneration</h3>
                <textarea 
                    value={userFeedback}
                    onChange={(e) => setUserFeedback(e.target.value)}
                    placeholder="e.g., 'Make the tone more technical' or 'Add a section about X'"
                    className="w-full p-2 bg-black border border-white/20 rounded-md text-sm h-24 resize-none text-grey"
                />
                <div className="flex items-center space-x-4 mt-4">
                    <Button onClick={() => onNextStep(userFeedback)} disabled={isLoading} className="w-1/2">
                        {currentStep === 7 ? 'Accept & View Dashboard' : 'Accept & Continue'}
                    </Button>
                    <Button onClick={() => onRegenerate(logicalCurrentStep, userFeedback)} disabled={isLoading} variant="secondary" className="w-1/2">
                        Regenerate Stage
                    </Button>
                </div>
                </div>
            )}
        </div>
        
        {/* Right Panel: Summary */}
        <div className="lg:col-span-3">
            <BriefSummaryPanel briefData={briefData} currentStep={currentStep} />
        </div>
    </div>
  );
};

export default BriefingScreen;