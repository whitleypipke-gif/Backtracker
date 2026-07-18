import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import Layout from "./Components/Layout";
import AppRoutes from "./Routes/Routes";
import { AuthProvider } from "./Context/AuthContext";
import store from "./redux/store";

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" reverseOrder={false} />
          <Layout>
            <AppRoutes />
          </Layout>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;