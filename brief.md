# Project brief

## About the Client
    We are a Brisbane based company with clubs at Ashgrove, Brisbane City, Chermside, Graceville and Westlake.
    Current activities include: Yoga, Pilaes, Abs, HIIT or high-intensity interval training, Indoor cycling, Boxing, Zumba and so on.

## Project Specification:
You are a Web Developer of Uptown IT. 
This is a web-based management system and a database to enable management of session bookings, backend project, use ejs，use tailwind for css.

There are 4 roles: guest, member, trainer, administrator.
member, trainer, admin all have dashboard.
Anyone (any role) can view the blog and timetable(Weekly calendar of all sessions)
Member can make a booking, with the ability to select the specific trainer if more than one of the same class type is scheduled at that time. 在dashboard里，Member can view the session they have booked (bookings) and have the option to cancel those booking。

Members can make posts to a shared blog, a blog post consists of a subject and body content (text only for now). Members can delete only their own posts. Administrators can delete any posts.
Management Features：Administrators must have administrative CRUD functions for users, posts, sessions, bookings, activities, and locations，我们也把这些放到他的dashboard里.Search functionality must be provided to administrators on some CRUD screens。

在 trainer 的 dashboard里看到weekly sessions for trainer

Expected pages / interfaces
Website login, Register account,Login/Logout,session bookings,Personal bookings of sessions for members,Weekly sessions for trainers,Member microblog,View post feed,Create post,Management features:Users CRUD, Posts CRUD,Sessions CRUD,Bookings CRUD,Activities CRUD,Locations CRUD.

## Web App- React
The client has requested that a mobile first web application be developed to provide an enhanced mobile experience for members and trainers. The mobile first interface must provide an improved schedule and session/booking management functionality, it does not need to implement all the existing management features included in the backend. The implementation must use client-side rendering code that communicates with the existing backend using a JSON web API.
The sample wireframes provided on the right provide a rough idea of the kind of interface the client is expecting. You are welcome to adapt and improve the design, so long as all required functionality is still incorporated.
The client has requested XML export functionality for two kinds of data. The first allows trainers to export their scheduled sessions for the week, so that they can be imported into their personal calendar. The second allows for members to export all their previous bookings, including the associated activity information, so it data can be imported into their fitness tracking applications.

Expected pages / interfaces:
Login and register
timetable(showing sessions for the current week)
Microblog feed (with create post functionality)
XML Export:Export scheduled sessions (for trainers only), Export previous bookings with activity data (for members only)
