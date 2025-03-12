'use server'

export default async function DashboardPage() {
  return (
    <div className="flex py-1">
      <iframe className="w-full h-screen" src="http://localhost:5601/app/dashboards?auth_provider_hint=anonymous1#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b?embed=true&_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-7d%2Fd%2Cto%3Anow))&show-query-input=true&show-time-filter=true" height="600" width="800"></iframe>
    </div>
  )
}