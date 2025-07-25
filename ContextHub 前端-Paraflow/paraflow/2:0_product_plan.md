# ContextHub - Product Plan

> Note
> 
> 
> This document is the single source of truth (SSOT) from Product kick-off onward. 
> 

---

## 1. Product & Brand Fundamentals

### Product Positioning
ContextHub is a local-first web application designed for comprehensive management of `.ct` context files, providing intuitive organization, viewing, and creation capabilities within a clean, GitHub-inspired interface.

### Brand Keywords

- Organized
- Intuitive
- Efficient
- Local
- Clean
- Reliable

### Design Goals

- Seamless Flow - Users can effortlessly upload, manage, and interact with `.ct` files.
- Trust & Reliability - The application feels robust and dependable, ensuring data integrity within local storage.
- Pleasant Emotion - The UI is visually clean and uncluttered, promoting a positive user experience.
- Sustainable Evolution - The design is modular and consistent, allowing for future feature expansion like cloud sync and sharing.

---

## 2. Core Problems

1.  **Lack of Centralized `.ct` File Management**
    Users struggle to organize, quickly locate, and review the content of various `.ct` context files scattered across their local directories.
2.  **Inefficient Context File Creation and Reuse**
    There's no dedicated, user-friendly tool for creating new `.ct` files with rich content or easily extracting and reusing specific sections from existing files.

---

## 3. Users & Scenarios

### Key Personas

-   **Context File User** —
    *   *Background* A developer, researcher, or technical user who frequently works with `.ct` context files across multiple projects or experiments.
    *   *Goal* To efficiently store, find, view, and create `.ct` files locally without relying on external services.
    *   *Pain points* Disorganized local files, difficulty quickly previewing file content, no easy way to create or edit structured context files.

### Core Task Flow (Happy Path)

1.  User opens ContextHub and views their existing `.ct` file library on the homepage.
2.  User uploads a new `.ct` file via a modal or navigates to the "Create Context" page.
3.  User either uploads a file or composes new context content using the rich text editor and attaches relevant files.
4.  User saves the new context, returning to the homepage where the file is now listed.
5.  User searches for an existing file, sorts the list, and then clicks on a file to view its content.
6.  User reviews the file content, collapsing and expanding sections as needed, then exports the file if desired.

---

## 4. Copy & Tone

-   **Tone Guidelines** - Clear, concise, and helpful; professional yet approachable; uses direct language without jargon. Mimics the straightforward and functional tone often found in developer tools and GitHub's interface.
-   **Brand Tagline (draft)** - *"ContextHub: Organize Your Context, Master Your Flow."*
-   **Key Terms**
    -   **Context File** - The primary `.ct` file format managed by the application.
    -   **Section** - A distinct, collapsible part of a context file's content.
    -   **Upload** - The action of importing a `.ct` file into ContextHub.
    -   **Export** - The action of downloading a `.ct` file from ContextHub.
    -   **Local Storage** - Emphasizes that all data is kept client-side, typically in IndexedDB.

---

## 5. Competition & Inspiration

-   **Generic Local File Managers / Text Editors** —
    *   *Highlights* Provide basic file opening and editing capabilities.
    *   *Watch-outs* Lack `.ct` specific structure understanding, search, organization, or rich editing features.
-   **GitHub's UI / Design System** —
    *   *Highlights* Clean layout, clear navigation, consistent typography, effective use of whitespace, and card-based displays. These elements provide a familiar and trustworthy aesthetic.
    *   *Watch-outs* Needs careful adaptation to avoid merely copying; must ensure the UI serves ContextHub's specific functionalities rather than just mirroring a look.
-   **Notion / Obsidian (for content organization inspiration)** —
    *   *Highlights* Excellent for structured content creation, linking, and rich text editing.
    *   *Watch-outs* Their complexity or specific data models are not directly applicable, but their ease of content creation and organization can be inspirational.