'use server'

export default async function LogsPage() {
  return (
    <div className="flex py-1">
      <iframe className="w-full h-screen" src="http://localhost:5601/app/discover?auth_provider_hint=anonymous1#/?embed=true&_g=(filters:!(),query:(language:kuery,query:''),refreshInterval:(pause:!t,value:60000),time:(from:now-7d%2Fd,to:now))&_a=(columns:!(),dataSource:(dataViewId:'90943e30-9a47-11e8-b64d-95841ca0b247',type:dataView),filters:!(),hideChart:!f,interval:auto,query:(language:kuery,query:''),sort:!(!(timestamp,desc)),viewMode:documents)" height="600" width="800"></iframe>
    </div>
  )
}