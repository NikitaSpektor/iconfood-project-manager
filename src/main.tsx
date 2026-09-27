import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerUpdates } from '@/lib/sw-update'

createRoot(document.getElementById("root")!).render(<App />);

registerUpdates();