import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router"

import './index.css'
import Layout from './Layout.jsx'
import TimetableView from './timetable/TimetableView.jsx'
import PostFeedView from './posts/PostFeedView.jsx'
import CreatePostView from './posts/CreatePostView.jsx'
import BookingsView from './bookings/BookingsView.jsx'
import TrainerSessionsView from './trainer/TrainerSessionsView.jsx'
import ProfileView from './profile/ProfileView.jsx'
import LoginView from './authentication/LoginView.jsx'
import RegisterView from './authentication/RegisterView.jsx'
import { AuthenticationProvider } from './authentication/useAuthenticate.jsx'

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        index: true,
        Component: TimetableView,
      },
      {
        path: "/blog",
        Component: PostFeedView,
      },
      {
        path: "/blog/new",
        Component: CreatePostView,
      },
      {
        path: "/bookings",
        Component: BookingsView,
      },
      {
        path: "/sessions",
        Component: TrainerSessionsView,
      },
      {
        path: "/profile",
        Component: ProfileView,
      },
      {
        path: "/login",
        Component: LoginView,
      },
      {
        path: "/register",
        Component: RegisterView,
      },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthenticationProvider>
      <RouterProvider router={router} />
    </AuthenticationProvider>
  </StrictMode>,
)
