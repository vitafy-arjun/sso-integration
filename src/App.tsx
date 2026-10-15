import { BrowserRouter, Route, Routes } from 'react-router-dom';
import VitafyCallback from './pages/VitafyCallback';
import Home from './pages/Home';
import IntegrationData from './pages/IntegrationData';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/integration-data" element={<IntegrationData />} />
        <Route path="/auth/vitafy/callback" element={<VitafyCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
