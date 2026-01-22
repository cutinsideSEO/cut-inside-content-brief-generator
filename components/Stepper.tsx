import React from 'react';

interface StepperProps {
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
    const steps = ["Goal & Audience", "Comp. Analysis", "Keywords", "Content Gaps", "Structure", "FAQs", "On-Page SEO", "Done"];
    
    return (
        <div className="w-full max-w-5xl mx-auto mb-8">
            <div className="flex items-center justify-between">
                {steps.map((label, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;

                    return (
                        <React.Fragment key={stepNumber}>
                            <div className="flex items-center flex-col text-center w-24">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 border-4 font-heading font-bold ${isCompleted ? 'bg-teal border-teal/80 text-brand-white' : ''} ${isActive ? 'bg-teal border-teal/80 text-brand-white' : ''} ${!isCompleted && !isActive ? 'bg-grey/10 border-grey/20 text-grey/50' : ''}`}>
                                    {isCompleted ? '✓' : stepNumber}
                                </div>
                                <p className={`mt-2 text-xs font-heading font-semibold break-words ${isActive || isCompleted ? 'text-grey' : 'text-grey/50'}`}>{label}</p>
                            </div>
                            {index < steps.length - 1 && <div className={`flex-auto border-t-4 transition-all duration-300 mx-2 ${isCompleted ? 'border-teal' : 'border-grey/20'}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default Stepper;