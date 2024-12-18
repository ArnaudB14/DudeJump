import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DoodleJump from './pages/DoodleJump'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DoodleJump />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App