import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children }) {
  return (
    <div
      id="app"
      style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}
    >
      <Sidebar />
      <main
        id="main"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minHeight: 0,
        }}
      >
        <Topbar />
        <div
          id="content"
          style={{
            flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
