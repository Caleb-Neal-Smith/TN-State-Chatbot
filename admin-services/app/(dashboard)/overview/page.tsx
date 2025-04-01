'use server'

export default async function DashboardPage() {
  const iframeSrc = process.env.DASHBOARD_URL;

  return (
    <div className="flex py-1">
      <iframe className="w-full h-screen" src={iframeSrc} height="600" width="800"></iframe>
    </div>
  )
}