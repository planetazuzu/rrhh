import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { ProfileForm } from './components/ProfileForm';
import { AdminPanel } from './components/AdminPanel';
import { Layout } from './components/Layout';
import { PublishJobOffer } from './components/PublishJobOffer';
import { JobOffersList } from './components/JobOffersList';
import { JobOfferDetail } from './components/JobOfferDetail';
import { ApplicationsList } from './components/ApplicationsList';
import { ActivityHistory } from './components/ActivityHistory';
import { Dashboard } from './components/Dashboard';
import { DocumentManager } from './components/DocumentManager';
import { EvaluationTemplates } from './components/EvaluationTemplates';
import { SelectionProcess } from './components/SelectionProcess';
import { Home } from './components/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="auth" element={<AuthForm />} />
          <Route path="profile" element={<ProfileForm />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/edit/:id" element={<ProfileForm />} />
          <Route path="job-offers" element={<JobOffersList />} />
          <Route path="job-offers/:id" element={<JobOfferDetail />} />
          <Route path="admin/publish-job" element={<PublishJobOffer />} />
          <Route path="applications" element={<ApplicationsList />} />
          <Route path="activity" element={<ActivityHistory />} />
          <Route path="documents" element={<DocumentManager />} />
          <Route path="admin/evaluation-templates" element={<EvaluationTemplates />} />
          <Route path="admin/selection-process" element={<SelectionProcess />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;