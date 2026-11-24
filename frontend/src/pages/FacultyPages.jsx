import { useParams } from 'react-router-dom';
import AdminStudentDetail from './AdminStudentDetail';
import VerificationList from '../components/verification/VerificationList';
import VerificationReview from '../components/verification/VerificationReview';
import { getFacultyStudentById } from '../services/api/facultyService';
import { facultyVerificationApi } from '../services/api/studentManagementApi';

/** /faculty/students/:id: the official profile, read through the faculty endpoint. */
export function FacultyStudentDetail() {
  return (
    <AdminStudentDetail
      fetchStudent={getFacultyStudentById}
      backTo="/faculty/students"
      backLabel="Back to students"
      verificationsPath="/faculty/verifications"
      resumeFromEndpoint={false}
      fetchApplications={null}
    />
  );
}

/** /faculty/verifications */
export function FacultyVerifications() {
  return (
    <VerificationList
      api={facultyVerificationApi}
      title="Profile verifications"
      description="Changes your students submitted to their profiles. Nothing becomes official until you approve it."
    />
  );
}

/** /faculty/verifications/:id */
export function FacultyVerificationReview() {
  const { id } = useParams();
  return <VerificationReview key={id} api={facultyVerificationApi} id={id} />;
}
