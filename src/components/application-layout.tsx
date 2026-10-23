import type { PropsWithChildren, ReactNode } from 'react';
import { Screen, PageHeader } from './registerbox-ui';
import { ApplicationProgress } from './application-form-ui';

export type ApplicationLayoutProps = PropsWithChildren<{ title: string; step: number; documentStep: number; reviewStep: number; hasDocuments: boolean; optionalDocuments: boolean; saved: boolean; footer: ReactNode; onBack: () => void }>;
export function ApplicationLayout({ children, title, step, documentStep, reviewStep, hasDocuments, optionalDocuments, saved, footer, onBack }: ApplicationLayoutProps) {
  return <Screen key={step + ':' + String(saved)} footer={footer}><PageHeader title={title} subtitle="One step at a time. Save and continue later." back={onBack}/>{!saved && <ApplicationProgress step={step} documentStep={documentStep} reviewStep={reviewStep} hasDocuments={hasDocuments} optionalDocuments={optionalDocuments}/>} {children}</Screen>;
}
