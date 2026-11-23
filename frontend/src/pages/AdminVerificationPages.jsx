import { useParams } from 'react-router-dom';
import VerificationList from '../components/verification/VerificationList';
import VerificationReview from '../components/verification/VerificationReview';
import useDepartments from '../hooks/useDepartments';
import { adminVerificationApi } from '../services/api/studentManagementApi';

/** /admin/verifications (ADMIN): every department's requests, for departments without an advisor. */
export function AdminVerifications() {
  const { departments } = useDepartments();
  return (
    <VerificationList
      api={adminVerificationApi}
      title="Profile verifications"
      description="Requests from every department. Faculty advisors normally review their own department; use this when a department has no active advisor."
      departments={departments}
    />
  );
}

/** /admin/verifications/:id (ADMIN) */
export function AdminVerificationReview() {
  const { id } = useParams();
  return <VerificationReview key={id} api={adminVerificationApi} id={id} />;
}
