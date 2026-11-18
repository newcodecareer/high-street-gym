import { useEffect, useRef } from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import {
    FaCalendarAlt,
    FaClipboardList,
    FaDumbbell,
    FaLock,
    FaNewspaper,
    FaSignOutAlt,
    FaUserCircle,
} from "react-icons/fa"
import { useAuthenticate } from "./authentication/useAuthenticate"

function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const { user, logout } = useAuthenticate()
    const scrollArea = useRef(null)

    // Start each screen at the top, even when the previous one was scrolled.
    useEffect(() => {
        scrollArea.current?.scrollTo(0, 0)
    }, [location.pathname])

    const isActive = path => path == "/"
        ? location.pathname == "/"
        : location.pathname == path || location.pathname.startsWith(path + "/")

    // The third dock item depends on the role: members see their bookings,
    // trainers their sessions, and guests a login button.
    const dockItems = [
        { path: "/", label: "Timetable", icon: <FaCalendarAlt className="text-xl" /> },
        { path: "/blog", label: "Blog", icon: <FaNewspaper className="text-xl" /> },
    ]

    if (user?.role == "member") {
        dockItems.push({ path: "/bookings", label: "Bookings", icon: <FaClipboardList className="text-xl" /> })
    } else if (user?.role == "trainer") {
        dockItems.push({ path: "/sessions", label: "Sessions", icon: <FaDumbbell className="text-xl" /> })
    } else if (!user) {
        dockItems.push({ path: "/login", label: "Login", icon: <FaLock className="text-xl" /> })
    }

    if (user) {
        dockItems.push({ path: "/profile", label: "Profile", icon: <FaUserCircle className="text-xl" /> })
    }

    const handleLogout = () => {
        logout()
        navigate("/")
    }

    return <div className="flex min-h-dvh justify-center bg-base-200 sm:items-center sm:p-6">
        {/* A phone-shaped frame: fixed height on desktop, full viewport on a
            phone, with the page content scrolling inside it. The transform
            keeps the fixed dock and modals inside this frame. */}
        <main className="relative flex h-dvh w-full max-w-[430px] transform-gpu flex-col overflow-hidden bg-base-100 shadow-xl sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-3xl">
            <header className="z-30 shrink-0 border-b border-base-300 bg-base-100/95 backdrop-blur">
                <div className="navbar min-h-14 px-3">
                    <button
                        onClick={() => navigate("/")}
                        className="btn btn-ghost px-2"
                        aria-label="High Street Gym home">
                        <img src="/img/logo-wordmark.svg" alt="High Street Gym" className="h-7 w-auto" />
                    </button>

                    <div className="ml-auto">
                        {user
                            ? <div className="dropdown dropdown-end">
                                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
                                    <div className="avatar avatar-placeholder">
                                        <div className="w-8 rounded-full bg-primary text-primary-content">
                                            <span className="text-sm font-bold">{user.firstName.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold">{user.firstName}</span>
                                </div>
                                <ul tabIndex={0} className="menu dropdown-content z-40 mt-2 w-44 rounded-box bg-base-100 p-2 shadow">
                                    <li className="menu-title px-2 py-1 text-xs capitalize">{user.role}</li>
                                    <li>
                                        <button onClick={handleLogout}>
                                            <FaSignOutAlt />
                                            Logout
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            : <button onClick={() => navigate("/login")} className="btn btn-ghost btn-sm">
                                Login
                            </button>}
                    </div>
                </div>
            </header>

            <div ref={scrollArea} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24">
                <Outlet />
            </div>

            <nav className="dock mx-auto max-w-[430px]">
                {dockItems.map(item => <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={isActive(item.path) ? "dock-active" : ""}>
                    {item.icon}
                    <span className="dock-label">{item.label}</span>
                </button>)}
            </nav>
        </main>
    </div>
}

export default Layout
