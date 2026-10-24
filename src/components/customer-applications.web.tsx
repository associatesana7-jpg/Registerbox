import { useId, useState } from 'react';
import { router } from 'expo-router';

import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationCategories } from '@/data/application-categories';
import { applicationStage } from '@/lib/workspace-journey';
import { AppIcon } from './app-icon';
import { Button, ErrorBanner, Screen } from './registerbox-ui';
import { Disclosure, EmptyState, JourneyRail, LoadingCards, WorkspaceHeading } from './workspace-ui';
import './website/workspace-applications.css';

const filters = ['In progress', 'Completed', 'All'] as const;
type ApplicationFilter = typeof filters[number];

export default function CustomerApplications() {
  const { data, loading, error, refresh } = useBusinessRecords();
  const [filter, setFilter] = useState<ApplicationFilter>('In progress');
  const resultsId = useId();
  const applications = data?.applications || [];
  const inProgress = applications.filter(row => !['APPROVED', 'CANCELLED', 'REJECTED'].includes(row.status));
  const completed = applications.filter(row => row.status === 'APPROVED');
  const rows = filter === 'All' ? applications : filter === 'Completed' ? completed : inProgress;
  const drafts = filter === 'Completed' ? [] : data?.drafts || [];
  const counts = { 'In progress': inProgress.length, Completed: completed.length, All: applications.length };

  return <Screen>
    <WorkspaceHeading eyebrow="REGISTRATIONS & SERVICES" title="Your applications." detail="Track progress, pick up a draft and see what needs your attention." action="Start an application" onAction={() => router.push('/onboarding/intent')}/>

    <div className="rb-wa-toolbar">
      <div className="rb-wa-filters" role="group" aria-label="Filter applications">{filters.map(option => <button key={option} type="button" className={filter === option ? 'is-active' : ''} aria-pressed={filter === option} aria-controls={resultsId} onClick={() => setFilter(option)}><span>{option}</span><span className="rb-wa-filter-count" aria-label={loading || error ? 'Count unavailable' : `${counts[option]} applications`}>{loading || error ? '–' : counts[option]}</span></button>)}</div>
      {!loading && !error ? <p className="rb-wa-result-count" role="status">{rows.length} {rows.length === 1 ? 'application' : 'applications'}{filter !== 'All' ? ` ${filter.toLowerCase()}` : ' in total'}</p> : null}
    </div>

    <div className="rb-wa-results" id={resultsId} aria-busy={loading}>
      <ErrorBanner message={error}/>
      {loading ? <LoadingCards/> : error ? <div className="rb-wa-error-state"><p>Your applications could not be loaded. Please try again.</p><Button title="Try loading again" variant="secondary" onPress={() => void refresh()}/></div> : <>
        {data?.actions.length ? <section className="rb-wa-section" aria-label="Your attention needed">
          <div className="rb-wa-section-heading"><h2>Your attention needed</h2><span>{data.actions.length}</span></div>
          <ul className="rb-wa-card-grid">{data.actions.map(action => <li key={action.id} className="rb-wa-attention-card">
            <div className="rb-wa-card-eyebrow"><span className="rb-wa-status rb-wa-status--amber">Action needed</span></div><h3>{action.title}</h3><p>{action.description}</p>
            <button type="button" className="rb-wa-card-action" onClick={() => router.push('/(tabs)/documents')}>Open document vault<span aria-hidden="true">↗</span></button>
          </li>)}</ul>
        </section> : null}

        {drafts.length ? <section className="rb-wa-section" aria-label="Ready to continue">
          <div className="rb-wa-section-heading"><h2>Ready to continue</h2><span>{drafts.length} saved {drafts.length === 1 ? 'draft' : 'drafts'}</span></div>
          <ul className="rb-wa-card-grid">{drafts.map(draft => <li key={draft.category} className="rb-wa-draft-card">
            <div className="rb-wa-card-eyebrow"><span className="rb-wa-draft-icon" aria-hidden="true"><AppIcon name="document" size={20} color="#86868B"/></span><span>Saved draft</span></div>
            <h3>{applicationCategories[draft.category].title}</h3><p>Your answers are saved. Continue from the next unanswered question.</p>
            <button type="button" className="rb-wa-card-action" onClick={() => router.push({ pathname: '/onboarding/application', params: { category: draft.category, resume: '1' } })}>Continue application<span aria-hidden="true">→</span></button>
          </li>)}</ul>
        </section> : null}

        {rows.length ? <section className="rb-wa-section" aria-label={`${filter} applications`}>
          <div className="rb-wa-section-heading"><h2>{filter === 'All' ? 'All applications' : filter === 'Completed' ? 'Completed applications' : 'In progress'}</h2></div>
          <div className="rb-wa-list">
            <div className="rb-wa-list-head" aria-hidden="true"><span>Application</span><span>Status</span><span>Reference & date</span><span>Next step</span></div>
            <ul>{rows.map(row => {
              const stage = applicationStage(row.status);
              const serviceName = row.services?.name || 'Registration application';
              return <li key={row.id} className="rb-wa-row">
                <div className="rb-wa-row__service"><h3>{serviceName}</h3><p>{stage.next}</p></div>
                <div className="rb-wa-row__status"><span className="rb-wa-mobile-label">Status</span><span className={`rb-wa-status rb-wa-status--${stage.tone}`}>{stage.label}</span></div>
                <div className="rb-wa-row__reference"><span className="rb-wa-mobile-label">Reference</span><span className="rb-wa-reference">{row.application_number || 'Reference pending'}</span><span className="rb-wa-created"><span className="rb-ui-visually-hidden">Created </span>{new Date(row.created_at).toLocaleDateString('en-IN')}</span></div>
                <button type="button" className="rb-wa-row__action" aria-label={`View progress and next step for ${serviceName}`} onClick={() => router.push({ pathname: '/application-details', params: { id: row.id } })}>View progress<span aria-hidden="true">→</span></button>
              </li>;
            })}</ul>
          </div>
        </section> : null}

        {!rows.length && !drafts.length ? <EmptyState icon="pending" title={filter === 'Completed' ? 'Your milestones will live here.' : 'Your next chapter starts here.'} detail={filter === 'Completed' ? 'Completed applications and issued certificates will appear as they become available.' : 'Choose a service and answer a few simple questions. Your progress is saved as you go.'} action="Explore services" onAction={() => router.push('/onboarding/intent')}/> : null}
      </>}
    </div>

    <div className="rb-wa-journey"><Disclosure title="How the journey works" detail="Details, review, processing and your certificate"><JourneyRail steps={['Details', 'Team review', 'Processing', 'Certificate']} current={0}/><p>Sending an application to RegisterBox starts our review. It is not a government submission. Any OTP, signature or payment comes back to you for approval.</p></Disclosure></div>
  </Screen>;
}
