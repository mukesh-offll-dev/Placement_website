import AdminApplicationManagement from '../components/AdminApplicationManagement';

export default function AdminApplications() {
  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <AdminApplicationManagement showHeader={true} />
    </main>
  );
}
