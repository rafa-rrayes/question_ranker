import { AuthProvider, useAuth } from './AuthContext';
import Game from './Game';
import Login from './Login';

function AppContent() {
  const { user } = useAuth();

  return user ? <Game /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
