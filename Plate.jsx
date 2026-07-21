import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { LoadingState } from "./components/AsyncState.jsx";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const GroupPage = lazy(() => import("./pages/GroupPage.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const MePage = lazy(() => import("./pages/MePage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const RestaurantPage = lazy(() => import("./pages/RestaurantPage.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <Suspense fallback={<LoadingState label="Setting the table…" />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/restaurant/:id" element={<RestaurantPage />} />
                <Route path="/group" element={<GroupPage />} />
                <Route path="/me" element={<MePage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
