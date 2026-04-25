import dynamic from 'next/dynamic'

const App = dynamic(() => import('./App').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#07070f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c9a84c',
      fontFamily: 'DM Sans, sans-serif'
    }}>
      Loading...
    </div>
  )
})

export default function Home() {
  return <App />
}